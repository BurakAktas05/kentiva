import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Search, 
  Bus, 
  MapPin, 
  Clock, 
  ArrowRightLeft, 
  ChevronRight, 
  GraduationCap, 
  Home as HomeIcon,
  Info,
  Star,
  Loader2
} from 'lucide-react';
import { Lang, t } from '../../i18n';
import { 
  fetchBusRoutes, 
  starRoute, 
  unstarRoute, 
  starStop, 
  unstarStop, 
  fetchStarredStops, 
  type BusRoute, 
  type RouteScheduleInfo,
  type PublicTenant
} from '../../api';

type DayType = 'weekday' | 'weekend' | 'saturday' | 'sunday';

interface BusScheduleScreenProps {
  lang: Lang;
  isDark: boolean;
  municipality: PublicTenant | null;
  onBack: () => void;
}

export default function BusScheduleScreen({ lang, isDark, municipality, onBack }: BusScheduleScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [starredStops, setStarredStops] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedRoute, setSelectedRoute] = useState<BusRoute | null>(null);
  const [selectedDayType, setSelectedDayType] = useState<DayType>('weekday');
  const [selectedDirection, setSelectedDirection] = useState<'startToEnd' | 'endToStart'>('startToEnd');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Keep time updated every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Determine current day type
  const currentDayType = useMemo<DayType>(() => {
    const day = currentTime.getDay();
    if (day === 0) return 'sunday';
    if (day === 6) return 'saturday';
    return 'weekday';
  }, [currentTime]);

  // Set initial selected day type based on today
  useEffect(() => {
    setSelectedDayType(currentDayType);
  }, [currentDayType]);

  // Load routes and starred stops (with offline caching)
  const loadData = useCallback(async () => {
    if (!municipality) return;

    const cacheRoutesKey = `belediye_offline_bus_routes_${municipality.id}`;
    const cacheStopsKey = `belediye_offline_starred_stops_${municipality.id}`;

    // Read from cache immediately
    const cachedRoutes = localStorage.getItem(cacheRoutesKey);
    const cachedStops = localStorage.getItem(cacheStopsKey);

    if (cachedRoutes) {
      try {
        setRoutes(JSON.parse(cachedRoutes));
      } catch (e) {
        console.error("Failed to parse cached routes:", e);
      }
    }
    if (cachedStops) {
      try {
        setStarredStops(JSON.parse(cachedStops));
      } catch (e) {
        console.error("Failed to parse cached stops:", e);
      }
    }

    // If we don't have cached routes, show loading spinner immediately
    if (!cachedRoutes) {
      setLoading(true);
    }

    try {
      const [fetchedRoutes, fetchedStops] = await Promise.all([
        fetchBusRoutes(municipality.id),
        fetchStarredStops(municipality.id),
      ]);
      setRoutes(fetchedRoutes);
      setStarredStops(fetchedStops);

      // Save to cache
      localStorage.setItem(cacheRoutesKey, JSON.stringify(fetchedRoutes));
      localStorage.setItem(cacheStopsKey, JSON.stringify(fetchedStops));
    } catch (e) {
      console.error("Ulaşım verileri güncellenemedi, çevrimdışı önbellek kullanılıyor:", e);
    } finally {
      setLoading(false);
    }
  }, [municipality]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Helper to resolve the correct schedule for a day type, handling weekend/weekday fallbacks
  const getScheduleForDayType = (route: BusRoute, dayType: DayType): RouteScheduleInfo | null => {
    if (dayType === 'sunday') {
      return route.schedule.sunday || route.schedule.weekend || route.schedule.weekday || null;
    }
    if (dayType === 'saturday') {
      return route.schedule.saturday || route.schedule.weekend || route.schedule.weekday || null;
    }
    return route.schedule.weekday || null;
  };

  // Helper to calculate the next departure time and remaining minutes
  const calculateNextDeparture = (route: BusRoute, direction: 'startToEnd' | 'endToStart') => {
    const schedule = getScheduleForDayType(route, currentDayType);
    if (!schedule) return null;

    const departures = direction === 'startToEnd' 
      ? schedule.departuresFromStart 
      : schedule.departuresFromEnd;

    if (!departures || departures.length === 0) return null;

    const nowHours = currentTime.getHours();
    const nowMinutes = currentTime.getMinutes();
    const nowInMinutes = nowHours * 60 + nowMinutes;

    for (const dep of departures) {
      const [depHours, depMinutes] = dep.split(':').map(Number);
      const depInMinutes = depHours * 60 + depMinutes;
      if (depInMinutes > nowInMinutes) {
        const diff = depInMinutes - nowInMinutes;
        return { time: dep, remainingMinutes: diff };
      }
    }

    // If no more departures today, return the first one
    return { time: departures[0], remainingMinutes: -1 };
  };

  // Filter routes based on search query (by route name, route code, or stop names)
  const filteredRoutes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return routes;

    return routes.filter(route => {
      const nameMatch = route.name.toLowerCase().includes(query);
      const codeMatch = route.code.toLowerCase().includes(query);
      const stopMatch = route.stops && route.stops.some(stop => stop.toLowerCase().includes(query));
      return nameMatch || codeMatch || stopMatch;
    });
  }, [searchQuery, routes]);

  // Computed favorites
  const starredRoutes = useMemo(() => routes.filter(r => r.starred), [routes]);

  // Calculate next departure for a specific stop name
  const getNextDepartureForStop = (stopName: string) => {
    let nextDepTime = null;
    let nextDepMin = Infinity;
    let nextRouteCode = '';

    for (const route of routes) {
      if (route.stops && route.stops.includes(stopName)) {
        const dep = calculateNextDeparture(route, 'startToEnd');
        if (dep && dep.remainingMinutes >= 0 && dep.remainingMinutes < nextDepMin) {
          nextDepMin = dep.remainingMinutes;
          nextDepTime = dep.time;
          nextRouteCode = route.code;
        }
      }
    }

    if (nextRouteCode) {
      return { time: nextDepTime, code: nextRouteCode, remainingMinutes: nextDepMin };
    }
    return null;
  };

  // Star / unstar actions
  const handleToggleStarRoute = async (e: React.MouseEvent, route: BusRoute) => {
    e.stopPropagation();
    try {
      if (route.starred) {
        await unstarRoute(route.id);
      } else {
        await starRoute(route.id);
      }
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleStarStop = async (stopName: string) => {
    if (!municipality) return;
    try {
      const isStarred = starredStops.includes(stopName);
      if (isStarred) {
        await unstarStop(stopName, municipality.id);
      } else {
        await starStop(stopName, municipality.id);
      }
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const cardStyle = isDark 
    ? 'border-slate-800 bg-slate-900/60 hover:bg-slate-900' 
    : 'border-slate-200/80 bg-white hover:bg-slate-50/80';

  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const textTitle = isDark ? 'text-white' : 'text-slate-800';

  const handleRouteClick = (route: BusRoute) => {
    setSelectedRoute(route);
    setSelectedDirection('startToEnd');
    
    const availableDayTypes: DayType[] = ['weekday'];
    if (route.schedule.saturday || route.schedule.weekend) availableDayTypes.push('saturday');
    if (route.schedule.sunday || route.schedule.weekend) availableDayTypes.push('sunday');
    
    if (availableDayTypes.includes(currentDayType)) {
      setSelectedDayType(currentDayType);
    } else {
      setSelectedDayType('weekday');
    }
  };

  const getRouteIcon = (iconName: string) => {
    switch (iconName) {
      case 'graduation-cap':
        return <GraduationCap className="w-5 h-5" />;
      case 'home':
        return <HomeIcon className="w-5 h-5" />;
      default:
        return <Bus className="w-5 h-5" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <AnimatePresence mode="wait">
        {!selectedRoute ? (
          // MAIN LIST VIEW
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col h-full"
          >
            {/* Header */}
            <div className="px-5 pt-4 pb-2 shrink-0">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={onBack}
                  className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
                  aria-label="Back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {t('bus.title', lang)}
                  </h2>
                  <p className={`text-xs ${textMuted}`}>{t('bus.subtitle', lang)}</p>
                </div>
              </div>
            </div>

            {/* Search Input */}
            <div className="px-4 py-2 shrink-0">
              <div className="relative">
                <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  type="text"
                  placeholder={t('bus.searchPlaceholder', lang)}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border outline-none transition-all ${
                    isDark 
                      ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-primary/50' 
                      : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-primary/50'
                  }`}
                />
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4 pb-8">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                  <p className={`text-xs ${textMuted}`}>Hatlar yükleniyor...</p>
                </div>
              ) : (
                <>
                  {/* Starred Dashboard */}
                  {(starredRoutes.length > 0 || starredStops.length > 0) && !searchQuery && (
                    <div className="space-y-3">
                      <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'} flex items-center gap-1.5`}>
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        Yıldızlı Ulaşımım
                      </h3>

                      {/* Starred Routes Horizontal Row */}
                      {starredRoutes.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                          {starredRoutes.map(route => (
                            <div
                              key={route.id}
                              onClick={() => handleRouteClick(route)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer shrink-0 text-xs font-semibold ${cardStyle}`}
                            >
                              <span
                                className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold"
                                style={{ backgroundColor: route.color }}
                              >
                                {route.code}
                              </span>
                              <span className="truncate max-w-[80px]">{route.name}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Starred Stops List */}
                      {starredStops.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {starredStops.map(stop => {
                            const nextDep = getNextDepartureForStop(stop);
                            return (
                              <div
                                key={stop}
                                className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${cardStyle}`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                                  <span className="text-xs font-medium truncate">{stop}</span>
                                </div>
                                {nextDep && (
                                  <div className="text-[10px] bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                                    <span className="font-bold mr-1">{nextDep.code}</span>
                                    <span>{nextDep.time}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* All Routes List */}
                  <div className="space-y-2.5">
                    {filteredRoutes.length > 0 && (
                      <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Tüm Hatlar
                      </h3>
                    )}

                    {filteredRoutes.length > 0 ? (
                      filteredRoutes.map((route) => {
                        const nextDep = calculateNextDeparture(route, 'startToEnd');
                        return (
                          <motion.div
                            key={route.id}
                            onClick={() => handleRouteClick(route)}
                            className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start justify-between group ${cardStyle}`}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="flex items-start gap-3.5 min-w-0">
                              <div 
                                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-sm shadow-md"
                                style={{ backgroundColor: route.color }}
                              >
                                {route.code}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className={`font-semibold text-sm leading-tight transition-colors group-hover:text-primary ${textTitle}`}>
                                    {route.name}
                                  </h3>
                                  <button
                                    onClick={(e) => void handleToggleStarRoute(e, route)}
                                    className="p-0.5 hover:scale-110 active:scale-95 transition-transform"
                                  >
                                    <Star 
                                      className={`w-3.5 h-3.5 ${
                                        route.starred 
                                          ? 'text-amber-500 fill-amber-500' 
                                          : 'text-slate-300 dark:text-slate-600'
                                      }`} 
                                    />
                                  </button>
                                </div>
                                <p className={`text-xs mt-1 truncate ${textMuted}`}>
                                  {route.stops && route.stops[0]} ↔ {route.stops && route.stops[route.stops.length - 1]}
                                </p>

                                {nextDep && (
                                  <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md w-fit">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>
                                      {t('bus.nextDeparture', lang)}:{' '}
                                      <span className="font-bold">{nextDep.time}</span>
                                      {nextDep.remainingMinutes >= 0 && (
                                        <span className="opacity-90">
                                          {' '}
                                          ({t('bus.minutes', lang, { n: nextDep.remainingMinutes })})
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <ChevronRight className={`w-5 h-5 self-center ${isDark ? 'text-slate-600' : 'text-slate-300'} group-hover:text-primary transition-colors`} />
                          </motion.div>
                        );
                      })
                    ) : (
                      <div className="text-center py-12 px-4">
                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                          <Info className="w-6 h-6 text-slate-400" />
                        </div>
                        <p className={`text-sm ${textMuted}`}>{t('bus.searchNoResults', lang)}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        ) : (
          // DETAILS VIEW
          <motion.div
            key="details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col h-full"
          >
            {/* Header Detail */}
            <div className="px-4 pt-4 pb-2 border-b shrink-0 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setSelectedRoute(null)}
                    className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
                    aria-label="Back to List"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-2 min-w-0">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-xs shadow"
                      style={{ backgroundColor: selectedRoute.color }}
                    >
                      {selectedRoute.code}
                    </div>
                    <h2 className="text-base font-bold truncate text-slate-900 dark:text-white">
                      {selectedRoute.name}
                    </h2>
                  </div>
                </div>

                <button
                  onClick={(e) => void handleToggleStarRoute(e, selectedRoute)}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Star 
                    className={`w-5 h-5 ${
                      selectedRoute.starred 
                        ? 'text-amber-500 fill-amber-500' 
                        : 'text-slate-300 dark:text-slate-600'
                    }`} 
                  />
                </button>
              </div>

              {/* Day Selection Tabs */}
              <div className="flex gap-1.5 mt-4 p-1 bg-slate-200/50 dark:bg-slate-950 rounded-xl">
                <button
                  onClick={() => setSelectedDayType('weekday')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    selectedDayType === 'weekday'
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                      : `text-slate-500 hover:text-slate-800 dark:hover:text-slate-200`
                  }`}
                >
                  {t('bus.weekday', lang)}
                </button>
                
                {selectedRoute.schedule && (selectedRoute.schedule.saturday || selectedRoute.schedule.weekend) && (
                  <button
                    onClick={() => setSelectedDayType(selectedRoute.schedule.saturday ? 'saturday' : 'weekend')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      selectedDayType === 'saturday' || selectedDayType === 'weekend'
                        ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                        : `text-slate-500 hover:text-slate-800 dark:hover:text-slate-200`
                    }`}
                  >
                    {selectedRoute.schedule.saturday ? t('bus.saturday', lang) : t('bus.weekend', lang)}
                  </button>
                )}

                {selectedRoute.schedule && (selectedRoute.schedule.sunday || selectedRoute.schedule.weekend) && (
                  <button
                    onClick={() => setSelectedDayType(selectedRoute.schedule.sunday ? 'sunday' : 'weekend')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      selectedDayType === 'sunday'
                        ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                        : `text-slate-500 hover:text-slate-800 dark:hover:text-slate-200`
                    }`}
                  >
                    {t('bus.sunday', lang)}
                  </button>
                )}
              </div>

              {/* Direction Switch */}
              <div className="mt-3 flex items-center justify-between bg-white dark:bg-slate-900 border dark:border-slate-850 px-3.5 py-2.5 rounded-xl">
                <div className="flex flex-col min-w-0">
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {t('bus.direction', lang)}
                  </span>
                  <span className="text-xs font-semibold truncate text-slate-800 dark:text-slate-200">
                    {selectedRoute.stops && (selectedDirection === 'startToEnd' 
                      ? `${selectedRoute.stops[0]} → ${selectedRoute.stops[selectedRoute.stops.length - 1]}`
                      : `${selectedRoute.stops[selectedRoute.stops.length - 1]} → ${selectedRoute.stops[0]}`)
                    }
                  </span>
                </div>
                <button
                  onClick={() => setSelectedDirection(prev => prev === 'startToEnd' ? 'endToStart' : 'startToEnd')}
                  className={`p-2 rounded-lg transition-all border shrink-0 ${
                    isDark 
                      ? 'bg-slate-800 hover:bg-slate-705 border-slate-700 text-slate-300 active:bg-slate-900' 
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 active:bg-slate-200'
                  }`}
                  title="Switch Direction"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Schedule Body */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 pb-24">
              {/* Departure Times Grid */}
              <div>
                <h3 className={`text-xs font-bold uppercase tracking-wider mb-2.5 flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  {t('bus.departureTimes', lang)}
                </h3>
                
                {(() => {
                  const daySched = getScheduleForDayType(selectedRoute, selectedDayType);
                  const departures = daySched 
                    ? (selectedDirection === 'startToEnd' ? daySched.departuresFromStart : daySched.departuresFromEnd)
                    : [];

                  if (!departures || departures.length === 0) {
                    return (
                      <div className={`p-4 text-center text-xs rounded-xl border border-dashed ${isDark ? 'border-slate-800 bg-slate-950/20 text-slate-500' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                        {t('bus.noActiveSchedule', lang)}
                      </div>
                    );
                  }

                  const nowHours = currentTime.getHours();
                  const nowMinutes = currentTime.getMinutes();
                  const nowInMinutes = nowHours * 60 + nowMinutes;

                  // Find which one is the next departure
                  let nextIndex = -1;
                  for (let i = 0; i < departures.length; i++) {
                    const [depHours, depMinutes] = departures[i].split(':').map(Number);
                    if (depHours * 60 + depMinutes > nowInMinutes) {
                      nextIndex = i;
                      break;
                    }
                  }

                  return (
                    <div className="grid grid-cols-4 gap-2">
                      {departures.map((time, idx) => {
                        const isNext = idx === nextIndex && selectedDayType === currentDayType;
                        const isPast = selectedDayType === currentDayType && nextIndex !== -1 && idx < nextIndex;

                        return (
                          <div
                            key={time}
                            className={`py-2 px-2.5 rounded-xl text-center text-xs font-semibold transition-all select-none border relative overflow-hidden ${
                              isNext
                                ? 'bg-primary border-primary text-white shadow-md shadow-primary/20 scale-105 z-10 font-bold'
                                : isPast
                                ? isDark 
                                  ? 'bg-slate-950/30 border-slate-900 text-slate-600'
                                  : 'bg-slate-100/60 border-slate-100 text-slate-400'
                                : isDark
                                ? 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            {time}
                            {isNext && (
                              <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-white animate-ping m-1" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Stops Timeline */}
              <div>
                <h3 className={`text-xs font-bold uppercase tracking-wider mb-3.5 flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  {t('bus.routeStops', lang)}
                </h3>

                <div className="relative pl-6 space-y-5">
                  {/* Vertical line indicator */}
                  <div className={`absolute left-[7px] top-2 bottom-2 w-0.5 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

                  {(() => {
                    const orderedStops = selectedRoute.stops ? (selectedDirection === 'startToEnd'
                      ? selectedRoute.stops
                      : [...selectedRoute.stops].reverse()) : [];

                    return orderedStops.map((stop, index) => {
                      const isFirst = index === 0;
                      const isLast = index === orderedStops.length - 1;
                      const isStarred = starredStops.includes(stop);

                      return (
                        <div key={stop} className="relative flex items-center justify-between gap-3 group/stop">
                          <div className="flex items-center gap-3">
                            {/* Circle dot on timeline */}
                            <div 
                              className={`absolute -left-[23px] w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center bg-white dark:bg-slate-900 transition-all ${
                                isFirst || isLast
                                  ? 'border-primary scale-110'
                                  : isDark ? 'border-slate-750' : 'border-slate-300'
                              }`}
                            >
                              <div 
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isFirst || isLast ? 'bg-primary' : isDark ? 'bg-slate-700' : 'bg-slate-350'
                                }`} 
                              />
                            </div>

                            <div className="flex flex-col">
                              <span className={`text-xs font-semibold ${
                                isFirst || isLast 
                                  ? 'text-slate-900 dark:text-white font-bold' 
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}>
                                {stop}
                              </span>
                              {isFirst && (
                                <span className="text-[9px] text-primary font-bold uppercase tracking-wider">
                                  {t('bus.from', lang)}
                                </span>
                              )}
                              {isLast && (
                                <span className="text-[9px] text-primary font-bold uppercase tracking-wider">
                                  {t('bus.to', lang)}
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => void handleToggleStarStop(stop)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg scale-90 group-hover/stop:scale-100 opacity-60 group-hover/stop:opacity-100 transition-all"
                          >
                            <Star 
                              className={`w-3.5 h-3.5 ${
                                isStarred 
                                  ? 'text-amber-500 fill-amber-500' 
                                  : 'text-slate-300 dark:text-slate-600'
                              }`} 
                            />
                          </button>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

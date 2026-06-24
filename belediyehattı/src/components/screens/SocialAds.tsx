import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Plus,
  Trash2,
  Phone,
  MapPin,
  Heart,
  Camera,
  Loader2,
  X,
  AlertCircle,
  User,
  Clock,
  Gift,
  Package,
  Navigation,
} from 'lucide-react';
import {
  getBloodAds,
  getLostPetAds,
  getItemDonationAds,
  createBloodAd,
  createLostPetAd,
  createItemDonationAd,
  deleteBloodAd,
  deleteLostPetAd,
  deleteItemDonationAd,
  uploadMedia,
  getSavedUser,
  resolveMediaUrl,
  type ApiBloodSearchAd,
  type ApiLostPetAd,
  type ApiItemDonationAd,
  type PublicTenant,
} from '../../api';
import { Lang, t } from '../../i18n';
import {
  districtsMatch,
  resolveFocusDistrict,
  type FocusDistrict,
  type FocusDistrictSource,
} from '../../lib/communityDistrict';
import { kentivaCard, kentivaInputClass, primaryBtnClass, segmentBarClass, segmentBtnClass } from '../../lib/ui';
import type { CommunitySegment } from './CommunityScreen';
import { storageService } from '../../lib/storageService';

interface SocialAdsProps {
  municipality: PublicTenant | null;
  lang: Lang;
  isDark: boolean;
  onBack?: () => void;
  embedded?: boolean;
  forcedTab?: CommunitySegment;
  hideSegmentBar?: boolean;
}

type SocialTab = CommunitySegment;

export default function SocialAds({
  municipality,
  lang,
  isDark,
  onBack,
  embedded,
  forcedTab,
  hideSegmentBar,
}: SocialAdsProps) {
  const [activeTab, setActiveTab] = useState<SocialTab>(forcedTab ?? 'blood');
  const [bloodAds, setBloodAds] = useState<ApiBloodSearchAd[]>([]);
  const [lostPetAds, setLostPetAds] = useState<ApiLostPetAd[]>([]);
  const [itemAds, setItemAds] = useState<ApiItemDonationAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIntroModal, setShowIntroModal] = useState(() => {
    return storageService.getItem('belediye_social_ads_intro_shown') !== 'true';
  });
  const [focusDistrict, setFocusDistrict] = useState<FocusDistrict | null>(null);
  const [districtResolving, setDistrictResolving] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formType, setFormType] = useState<SocialTab>('blood');
  const [submitting, setSubmitting] = useState(false);

  // Blood Form State
  const [bloodType, setBloodType] = useState('A+');
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalDistrict, setHospitalDistrict] = useState('');
  const [patientName, setPatientName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [description, setDescription] = useState('');

  // Lost Pet Form State
  const [petName, setPetName] = useState('');
  const [petType, setPetType] = useState('Kedi');
  const [petBreed, setPetBreed] = useState('');
  const [lastSeenDistrict, setLastSeenDistrict] = useState('');
  const [petDescription, setPetDescription] = useState('');
  const [petContactPhone, setPetContactPhone] = useState('');
  const [petImageFile, setPetImageFile] = useState<File | null>(null);
  const [petImagePreview, setPetImagePreview] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);

  const [itemTitle, setItemTitle] = useState('');
  const [itemCategory, setItemCategory] = useState('Giyim');
  const [itemDistrict, setItemDistrict] = useState('');
  const [itemCondition, setItemCondition] = useState('İyi');
  const [itemContactPhone, setItemContactPhone] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemImageFile, setItemImageFile] = useState<File | null>(null);
  const [itemImagePreview, setItemImagePreview] = useState<string | null>(null);

  const currentUser = getSavedUser();
  const currentUserId = currentUser?.userId || '';
  const focusDistrictName = focusDistrict?.district ?? '';

  useEffect(() => {
    if (forcedTab) setActiveTab(forcedTab);
  }, [forcedTab]);

  const applyDistrictToForms = (district: string) => {
    if (!district) return;
    setHospitalDistrict(district);
    setLastSeenDistrict(district);
    setItemDistrict(district);
  };

  const loadFocusDistrict = async () => {
    setDistrictResolving(true);
    const resolved = await resolveFocusDistrict(municipality);
    setFocusDistrict(resolved);
    if (resolved?.district) applyDistrictToForms(resolved.district);
    setDistrictResolving(false);
    return resolved;
  };

  useEffect(() => {
    void loadFocusDistrict();
  }, [municipality?.id]);

  useEffect(() => {
    if (!focusDistrict?.district) {
      if (!districtResolving) setLoading(false);
      return;
    }
    void fetchAds(focusDistrict.district);
  }, [activeTab, focusDistrict?.district, districtResolving]);

  const fetchAds = async (district: string) => {
    // 1. Try loading cached data first (Stale-While-Revalidate)
    const cacheKey = `belediye_cache_social_${activeTab}_${district}`;
    const cached = storageService.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (activeTab === 'blood') {
          setBloodAds(parsed || []);
        } else if (activeTab === 'lost') {
          setLostPetAds(parsed || []);
        } else {
          setItemAds(parsed || []);
        }
        // Immediately turn off loading if cache is present, so content displays instantly
        setLoading(false);
      } catch (err) {
        setLoading(true);
      }
    } else {
      setLoading(true);
    }

    // 2. Fetch fresh data from API
    try {
      if (activeTab === 'blood') {
        const ads = await getBloodAds(district);
        const list = ads || [];
        setBloodAds(list);
        storageService.setItem(cacheKey, JSON.stringify(list));
      } else if (activeTab === 'lost') {
        const ads = await getLostPetAds(district);
        const list = ads || [];
        setLostPetAds(list);
        storageService.setItem(cacheKey, JSON.stringify(list));
      } else {
        const ads = await getItemDonationAds(district);
        const list = ads || [];
        setItemAds(list);
        storageService.setItem(cacheKey, JSON.stringify(list));
      }
    } catch (err) {
      console.error('Sosyal ilanlar yuklenirken hata:', err);
    } finally {
      setLoading(false);
    }
  };

  const districtSourceLabel = (source: FocusDistrictSource) => {
    switch (source) {
      case 'gps':
        return t('social.ads.district.source.gps', lang);
      case 'profile':
        return t('social.ads.district.source.profile', lang);
      default:
        return t('social.ads.district.source.municipality', lang);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPetImageFile(file);
      setPetImagePreview(URL.createObjectURL(file));
    }
  };

  const resetForms = () => {
    setBloodType('A+');
    setHospitalName('');
    setHospitalDistrict(focusDistrictName || '');
    setPatientName('');
    setContactPhone('');
    setDescription('');

    setPetName('');
    setPetType('Kedi');
    setPetBreed('');
    setLastSeenDistrict(focusDistrictName || '');
    setPetDescription('');
    setPetContactPhone('');
    setPetImageFile(null);
    setPetImagePreview(null);

    setItemTitle('');
    setItemCategory('Giyim');
    setItemDistrict(focusDistrictName || '');
    setItemCondition('İyi');
    setItemContactPhone('');
    setItemDescription('');
    setItemImageFile(null);
    setItemImagePreview(null);
  };

  const handleItemImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setItemImageFile(file);
      setItemImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmitItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTitle || !itemDistrict || !itemContactPhone || !itemDescription) {
      alert(t('social.ads.form.required', lang));
      return;
    }
    setSubmitting(true);
    try {
      let uploadedUrl = '';
      if (itemImageFile) {
        setImageUploading(true);
        const urls = await uploadMedia(itemImageFile);
        if (urls?.length) uploadedUrl = urls[0];
        setImageUploading(false);
      }
      await createItemDonationAd({
        itemTitle,
        category: itemCategory,
        district: itemDistrict,
        itemCondition,
        contactPhone: itemContactPhone,
        description: itemDescription,
        mediaUrl: uploadedUrl,
      });
      setIsModalOpen(false);
      resetForms();
      if (focusDistrictName) void fetchAds(focusDistrictName);
      alert(t('social.ads.success.items', lang));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      alert(msg);
    } finally {
      setSubmitting(false);
      setImageUploading(false);
    }
  };

  const handleSubmitBlood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospitalName || !hospitalDistrict || !patientName || !contactPhone || !description) {
      alert(lang === 'tr' ? 'Lütfen tüm alanları doldurun.' : 'Please fill in all fields.');
      return;
    }
    setSubmitting(true);
    try {
      await createBloodAd({
        bloodType,
        hospitalName,
        hospitalDistrict,
        patientName,
        contactPhone,
        description
      });
      setIsModalOpen(false);
      resetForms();
      if (focusDistrictName) void fetchAds(focusDistrictName);
      alert(t('social.ads.success.blood', lang));
    } catch (err: any) {
      alert(err.message || (lang === 'tr' ? 'İlan oluşturulurken hata oluştu.' : 'An error occurred while creating ad.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitLostPet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!petName || !petBreed || !lastSeenDistrict || !petContactPhone || !petDescription) {
      alert(lang === 'tr' ? 'Lütfen tüm alanları doldurun.' : 'Please fill in all fields.');
      return;
    }
    setSubmitting(true);
    try {
      let uploadedUrl = '';
      if (petImageFile) {
        setImageUploading(true);
        const uploadedUrls = await uploadMedia(petImageFile);
        if (uploadedUrls && uploadedUrls.length > 0) {
          uploadedUrl = uploadedUrls[0];
        }
        setImageUploading(false);
      }

      await createLostPetAd({
        petName,
        petType,
        breed: petBreed,
        lastSeenDistrict,
        contactPhone: petContactPhone,
        description: petDescription,
        mediaUrl: uploadedUrl
      });
      setIsModalOpen(false);
      resetForms();
      if (focusDistrictName) void fetchAds(focusDistrictName);
      alert(t('social.ads.success.lost', lang));
    } catch (err: any) {
      alert(err.message || (lang === 'tr' ? 'İlan oluşturulurken hata oluştu.' : 'An error occurred while creating ad.'));
    } finally {
      setSubmitting(false);
      setImageUploading(false);
    }
  };

  const handleDeleteAd = async (id: string, type: SocialTab) => {
    if (!window.confirm(t('social.ads.confirm.delete', lang))) return;
    try {
      if (type === 'blood') {
        await deleteBloodAd(id);
      } else if (type === 'lost') {
        await deleteLostPetAd(id);
      } else {
        await deleteItemDonationAd(id);
      }
      if (focusDistrictName) void fetchAds(focusDistrictName);
      alert(t('social.ads.success.delete', lang));
    } catch (err: any) {
      alert(err.message || (lang === 'tr' ? 'İlan silinirken hata oluştu.' : 'An error occurred while deleting ad.'));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative ${embedded ? 'pb-24' : 'pb-16 min-h-screen'}`}
    >
      {!embedded && onBack && (
        <div className="flex items-center gap-3 border-b border-slate-200 p-4 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20">
          <button type="button" onClick={onBack} className="-ml-2 p-2 text-slate-500 dark:text-slate-400">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('social.ads.title', lang)}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('social.ads.subtitle', lang)}</p>
          </div>
        </div>
      )}

      {!hideSegmentBar && (
        <div className={embedded ? 'px-4 pt-2' : 'p-4'}>
          <div className={segmentBarClass(isDark)}>
            {(['blood', 'lost', 'items'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={segmentBtnClass(activeTab === tab, isDark)}
              >
                {t(`community.segment.${tab}`, lang)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 pb-2">
        <div
          className={`flex items-center justify-between gap-2 rounded-2xl border px-3 py-2.5 ${
            isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex min-w-0 items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              {districtResolving ? (
                <p className="text-xs text-slate-500">{t('social.ads.district.resolving', lang)}</p>
              ) : focusDistrict ? (
                <>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {t('social.ads.district.showing', lang, { district: focusDistrict.district })}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">{districtSourceLabel(focusDistrict.source)}</p>
                </>
              ) : (
                <p className="text-xs text-slate-500">{t('social.ads.district.unavailable', lang)}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            disabled={districtResolving}
            onClick={() => void loadFocusDistrict()}
            className="flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1.5 text-[10px] font-semibold text-primary hover:bg-primary/10 disabled:opacity-50"
            aria-label={t('social.ads.district.refresh', lang)}
          >
            {districtResolving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Navigation className="h-3.5 w-3.5" />
            )}
            {t('social.ads.district.refresh', lang)}
          </button>
        </div>
      </div>

      <div className="px-4 py-2 space-y-4">
        {!districtResolving && !focusDistrict?.district ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-900/40 dark:bg-amber-950/30">
            <p className="text-xs font-medium text-amber-800 dark:text-amber-200">{t('social.ads.district.unavailable', lang)}</p>
          </div>
        ) : loading ? (
          <div className="space-y-4 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/40" />
            ))}
          </div>
        ) : activeTab === 'blood' && bloodAds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-6 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 shadow-inner">
              <Heart className="h-7 w-7" />
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-white">
              {lang === 'tr' ? 'Acil Kan İlanı Bulunmuyor' : 'No Blood Donation Ads'}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400 max-w-xs font-semibold">
              {lang === 'tr'
                ? 'İlçenizdeki vatandaşların görebileceği bir acil kan bağışı ilanı oluşturabilirsiniz. Eklenen ilanlar bölgenizdeki tüm kullanıcılara ulaştırılır.'
                : 'You can create an emergency blood donation ad for citizens in your district to see. Added ads are shown to all local users.'}
            </p>
            <button
              type="button"
              onClick={() => { setFormType('blood'); setIsModalOpen(true); }}
              className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-red-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-red-500/10 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{lang === 'tr' ? 'İlan Oluştur' : 'Create Ad'}</span>
            </button>
          </div>
        ) : activeTab === 'lost' && lostPetAds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-6 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 shadow-inner">
              <AlertCircle className="h-7 w-7" />
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-white">
              {lang === 'tr' ? 'Kayıp Evcil Hayvan İlanı Bulunmuyor' : 'No Lost Pet Ads'}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400 max-w-xs font-semibold">
              {lang === 'tr'
                ? 'Kaybolan evcil hayvanınız için ilan oluşturabilirsiniz. İlçenizdeki diğer vatandaşlar ilanı görerek bulmanıza yardımcı olabilir.'
                : 'You can create an ad for your lost pet. Other citizens in your district can see the ad and help you find it.'}
            </p>
            <button
              type="button"
              onClick={() => { setFormType('lost'); setIsModalOpen(true); }}
              className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/10 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{lang === 'tr' ? 'İlan Oluştur' : 'Create Ad'}</span>
            </button>
          </div>
        ) : activeTab === 'items' && itemAds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-6 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 shadow-inner">
              <Gift className="h-7 w-7" />
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-white">
              {lang === 'tr' ? 'Eşya Paylaşım İlanı Bulunmuyor' : 'No Item Donation Ads'}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400 max-w-xs font-semibold">
              {lang === 'tr'
                ? 'İhtiyacınız olmayan veya bağışlamak istediğiniz kıyafet, eşya vb. için ilan oluşturarak ilçenizdeki ihtiyaç sahiplerine ulaştırabilirsiniz.'
                : 'You can create an ad for clothes, household items, etc., that you want to donate or share with people in need in your district.'}
            </p>
            <button
              type="button"
              onClick={() => { setFormType('items'); setIsModalOpen(true); }}
              className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/10 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{lang === 'tr' ? 'İlan Oluştur' : 'Create Ad'}</span>
            </button>
          </div>
        ) : activeTab === 'blood' ? (
          // RENDER BLOOD ADS WITH PRIORITY DISTRICT MATCHING
          <div className="space-y-4">
            {bloodAds
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((ad) => {
                const isMyDistrict = districtsMatch(ad.hospitalDistrict, focusDistrictName);
                const isMyAd = ad.userId === currentUserId;
                const formattedDate = new Date(ad.createdAt).toLocaleDateString(
                  lang === 'tr' ? 'tr-TR' : lang === 'ar' ? 'ar' : 'en-US',
                  { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }
                );

                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={ad.id}
                    className={`${kentivaCard(isDark, isMyDistrict ? 'border-red-200/80 dark:border-red-900/40' : '')}`}
                  >

                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Blood Icon & Type Badge */}
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
                          <span className="text-sm font-extrabold">{ad.bloodType}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
                            {isMyDistrict ? t('social.ads.nearby', lang) : t('social.ads.blood.title', lang)}
                          </span>
                          <h3 className="text-sm font-semibold text-slate-800 dark:text-white leading-tight">
                            {ad.patientName}
                          </h3>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      {isMyAd && (
                        <button
                          onClick={() => handleDeleteAd(ad.id, 'blood')}
                          className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-red-50 dark:bg-slate-800 dark:text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <p className="mt-3.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                      {ad.description}
                    </p>

                    {/* Hospital Info & Phone */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-slate-500">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                          <MapPin className="h-3.5 w-3.5 text-red-500" />
                          <span>{ad.hospitalName} ({ad.hospitalDistrict})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" />
                          <span>{ad.userName}</span>
                        </div>
                      </div>

                      <a
                        href={`tel:${ad.contactPhone}`}
                        className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-red-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-red-500/10 hover:brightness-105 active:scale-[0.98] transition-all"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        <span>{ad.contactPhone}</span>
                      </a>
                    </div>

                    {/* Footer Date */}
                    <div className="mt-3 flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock className="h-3 w-3" />
                      <span>{formattedDate}</span>
                    </div>
                  </motion.div>
                );
              })}
          </div>
        ) : activeTab === 'lost' ? (
          <div className="space-y-4">
            {lostPetAds
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((ad) => {
                const isMyDistrict = districtsMatch(ad.lastSeenDistrict, focusDistrictName);
                const isMyAd = ad.userId === currentUserId;
                const formattedDate = new Date(ad.createdAt).toLocaleDateString(
                  lang === 'tr' ? 'tr-TR' : lang === 'ar' ? 'ar' : 'en-US',
                  { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }
                );

                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={ad.id}
                    className={kentivaCard(isDark, isMyDistrict ? 'border-indigo-200/80 dark:border-indigo-900/40' : '')}
                  >
                    <div className="flex flex-col md:flex-row gap-4">
                      {/* Image Thumbnail */}
                      {ad.mediaUrl && (
                        <div className="w-full md:w-28 h-32 rounded-2xl overflow-hidden flex-shrink-0 bg-slate-100 dark:bg-slate-800">
                          <img
                            src={resolveMediaUrl(ad.mediaUrl)}
                            alt={ad.petName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Content Section */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                                {ad.petType}
                              </span>
                              <h3 className="mt-1 text-sm font-semibold text-slate-800 dark:text-white leading-tight flex items-center gap-1.5">
                                {ad.petName}
                                <span className="text-xs font-semibold text-slate-400">({ad.breed})</span>
                              </h3>
                            </div>

                            {isMyAd && (
                              <button
                                onClick={() => handleDeleteAd(ad.id, 'lost')}
                                className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-red-50 dark:bg-slate-800 dark:text-slate-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>

                          <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            {ad.description}
                          </p>
                        </div>

                        {/* Location, Owner & Phone */}
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-slate-500">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                              <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                              <span>{t('social.ads.last.seen', lang)}: {ad.lastSeenDistrict}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5" />
                              <span>{ad.userName}</span>
                            </div>
                          </div>

                          <a
                            href={`tel:${ad.contactPhone}`}
                            className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/10 hover:brightness-105 active:scale-[0.98] transition-all"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            <span>{ad.contactPhone}</span>
                          </a>
                        </div>

                        {/* Footer Date */}
                        <div className="mt-3 flex items-center gap-1 text-[10px] text-slate-400">
                          <Clock className="h-3 w-3" />
                          <span>{formattedDate}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
          </div>
        ) : (
          <div className="space-y-4">
            {itemAds
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((ad) => {
                const isMyAd = ad.userId === currentUserId;
                const formattedDate = new Date(ad.createdAt).toLocaleDateString(
                  lang === 'tr' ? 'tr-TR' : lang === 'ar' ? 'ar' : 'en-US',
                  { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' },
                );
                return (
                  <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={ad.id} className={kentivaCard(isDark)}>
                    <div className="flex gap-3">
                      {ad.mediaUrl ? (
                        <img
                          src={resolveMediaUrl(ad.mediaUrl)}
                          alt=""
                          className="h-20 w-20 shrink-0 rounded-xl object-cover bg-slate-100 dark:bg-slate-800"
                        />
                      ) : (
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                          <Package className="h-8 w-8" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                              {ad.category}
                            </span>
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{ad.itemTitle}</h3>
                            <p className="text-[11px] text-slate-500">
                              {ad.itemCondition} · {ad.district}
                            </p>
                          </div>
                          {isMyAd && (
                            <button
                              type="button"
                              onClick={() => handleDeleteAd(ad.id, 'items')}
                              className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{ad.description}</p>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {ad.userName}
                          </span>
                          <a
                            href={`tel:${ad.contactPhone}`}
                            className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {t('social.ads.call', lang)}
                          </a>
                        </div>
                        <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
                          <Clock className="h-3 w-3" />
                          {formattedDate}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
          </div>
        )}
      </div>

      {/* Floating Action Button (FAB) */}
      <div className={`fixed right-6 z-30 ${embedded ? 'bottom-24' : 'bottom-6'}`}>
        <button
          onClick={() => {
            setFormType(activeTab);
            setIsModalOpen(true);
          }}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-xl shadow-primary/30 hover:brightness-105 active:scale-95 transition-all"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* CREATE AD MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
            {/* Backdrop click */}
            <div className="absolute inset-0 -z-10" onClick={() => setIsModalOpen(false)} />

            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              className={`w-full max-w-lg overflow-hidden rounded-t-3xl sm:rounded-3xl border p-6 shadow-2xl ${
                isDark
                  ? 'border-slate-800 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-900'
              } max-h-[85vh] overflow-y-auto`}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-semibold">
                    {formType === 'blood'
                      ? t('social.ads.create.blood', lang)
                      : formType === 'lost'
                        ? t('social.ads.create.lost', lang)
                        : t('social.ads.create.items', lang)}
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {t('community.citizenHint', lang)}
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form Selection Tabs */}
              <div className={`${segmentBarClass(isDark)} mt-4`}>
                {(['blood', 'lost', 'items'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFormType(tab)}
                    className={segmentBtnClass(formType === tab, isDark)}
                  >
                    {t(`community.segment.${tab}`, lang)}
                  </button>
                ))}
              </div>

              {formType === 'blood' ? (
                // BLOOD AD FORM
                <form onSubmit={handleSubmitBlood} className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        {t('social.ads.blood.type', lang)}
                      </label>
                      <select
                        value={bloodType}
                        onChange={(e) => setBloodType(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-'].map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        {t('social.ads.patient', lang)}
                      </label>
                      <input
                        type="text"
                        required
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        placeholder={t('social.ads.patient.placeholder', lang)}
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      {t('social.ads.hospital', lang)}
                    </label>
                    <input
                      type="text"
                      required
                      value={hospitalName}
                      onChange={(e) => setHospitalName(e.target.value)}
                      placeholder={t('social.ads.hospital.placeholder', lang)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        {t('social.ads.form.district', lang)}
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={hospitalDistrict}
                        className={`${kentivaInputClass(isDark)} opacity-80`}
                      />
                      <p className="mt-1 text-[10px] text-slate-500">{t('social.ads.form.district.hint', lang)}</p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        {t('social.ads.phone', lang)}
                      </label>
                      <input
                        type="tel"
                        required
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder={t('social.ads.phone.placeholder', lang)}
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      {t('social.ads.description', lang)}
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t('social.ads.desc.placeholder', lang)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500 py-3.5 text-xs font-extrabold text-white shadow-lg shadow-red-500/20 transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('social.ads.publish', lang)}
                  </button>
                </form>
              ) : formType === 'lost' ? (
                <form onSubmit={handleSubmitLostPet} className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        {t('social.ads.pet.name', lang)}
                      </label>
                      <input
                        type="text"
                        required
                        value={petName}
                        onChange={(e) => setPetName(e.target.value)}
                        placeholder={t('social.ads.pet.name.placeholder', lang)}
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        {t('social.ads.pet.type', lang)}
                      </label>
                      <select
                        value={petType}
                        onChange={(e) => setPetType(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="Kedi">Kedi</option>
                        <option value="Köpek">Köpek</option>
                        <option value="Kuş">Kuş</option>
                        <option value="Diğer">Diğer</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        {t('social.ads.pet.breed', lang)}
                      </label>
                      <input
                        type="text"
                        required
                        value={petBreed}
                        onChange={(e) => setPetBreed(e.target.value)}
                        placeholder={t('social.ads.pet.breed.placeholder', lang)}
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        {t('social.ads.last.seen', lang)}
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={lastSeenDistrict}
                        className={`${kentivaInputClass(isDark)} opacity-80`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        {t('social.ads.phone', lang)}
                      </label>
                      <input
                        type="tel"
                        required
                        value={petContactPhone}
                        onChange={(e) => setPetContactPhone(e.target.value)}
                        placeholder={t('social.ads.phone.placeholder', lang)}
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* Photo Upload Box */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      {t('social.ads.photo', lang)}
                    </label>
                    <div className="flex gap-4 items-center">
                      <label className="flex flex-col items-center justify-center w-28 h-28 border border-dashed border-slate-300 rounded-2xl cursor-pointer bg-slate-50 dark:bg-slate-950 dark:border-slate-800 hover:bg-slate-100 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Camera className="w-6 h-6 text-slate-400 mb-2" />
                          <span className="text-[10px] text-slate-400 font-bold">Fotoğraf Seç</span>
                        </div>
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageChange} />
                      </label>

                      {petImagePreview && (
                        <div className="relative w-28 h-28 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                          <img src={petImagePreview} alt="Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              setPetImageFile(null);
                              setPetImagePreview(null);
                            }}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      {t('social.ads.description', lang)}
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={petDescription}
                      onChange={(e) => setPetDescription(e.target.value)}
                      placeholder={t('social.ads.desc.placeholder', lang)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || imageUploading}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 text-xs font-extrabold text-white shadow-lg shadow-indigo-600/20 transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-50"
                  >
                    {submitting || imageUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      t('social.ads.publish', lang)
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSubmitItem} className="mt-4 space-y-4">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      {t('social.ads.items.title', lang)}
                    </label>
                    <input
                      type="text"
                      required
                      value={itemTitle}
                      onChange={(e) => setItemTitle(e.target.value)}
                      className={kentivaInputClass(isDark)}
                      placeholder={t('social.ads.items.title.placeholder', lang)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {t('social.ads.items.category', lang)}
                      </label>
                      <select
                        value={itemCategory}
                        onChange={(e) => setItemCategory(e.target.value)}
                        className={kentivaInputClass(isDark)}
                      >
                        <option value="Giyim">{t('social.ads.items.cat.clothing', lang)}</option>
                        <option value="Mobilya">{t('social.ads.items.cat.furniture', lang)}</option>
                        <option value="Elektronik">{t('social.ads.items.cat.electronics', lang)}</option>
                        <option value="Oyuncak">{t('social.ads.items.cat.toys', lang)}</option>
                        <option value="Diğer">{t('social.ads.items.cat.other', lang)}</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {t('social.ads.items.condition', lang)}
                      </label>
                      <select
                        value={itemCondition}
                        onChange={(e) => setItemCondition(e.target.value)}
                        className={kentivaInputClass(isDark)}
                      >
                        <option value="Sıfır">{t('social.ads.items.cond.new', lang)}</option>
                        <option value="İyi">{t('social.ads.items.cond.good', lang)}</option>
                        <option value="Kullanılmış">{t('social.ads.items.cond.used', lang)}</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {t('social.ads.items.district', lang)}
                      </label>
                      <input
                        type="text"
                        readOnly
                        required
                        value={itemDistrict}
                        className={`${kentivaInputClass(isDark)} opacity-80`}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {t('social.ads.phone', lang)}
                      </label>
                      <input
                        type="tel"
                        required
                        value={itemContactPhone}
                        onChange={(e) => setItemContactPhone(e.target.value)}
                        className={kentivaInputClass(isDark)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      {t('social.ads.photo', lang)}
                    </label>
                    <div className="flex gap-3 items-center">
                      <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                        <Camera className="h-5 w-5 text-slate-400" />
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleItemImageChange} />
                      </label>
                      {itemImagePreview && (
                        <img src={itemImagePreview} alt="" className="h-24 w-24 rounded-xl object-cover" />
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      {t('social.ads.description', lang)}
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={itemDescription}
                      onChange={(e) => setItemDescription(e.target.value)}
                      className={kentivaInputClass(isDark)}
                    />
                  </div>
                  <button type="submit" disabled={submitting || imageUploading} className={primaryBtnClass(submitting)}>
                    {submitting || imageUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      t('social.ads.publish', lang)
                    )}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showIntroModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-sm rounded-3xl border p-6 shadow-2xl transition-all ${
                isDark ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-800'
              }`}
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                <Gift className="h-7 w-7 text-primary animate-bounce" />
              </div>
              
              <h3 className="text-center text-base font-extrabold tracking-tight">
                {lang === 'tr' ? 'Topluluk Yardımlaşma Alanı' : 'Community Solidarity Space'}
              </h3>
              <p className="mt-2 text-center text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-semibold">
                {lang === 'tr'
                  ? 'Hemşehrilerinizle yardımlaşın ve mahalle dayanışmasını güçlendirin.'
                  : 'Collaborate with your neighbors and strengthen local solidarity.'}
              </p>

              <div className="mt-5 space-y-3.5 text-left">
                <div className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
                    <Heart className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {lang === 'tr' ? 'Acil Kan Bağışı' : 'Urgent Blood Donation'}
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">
                      {lang === 'tr' 
                        ? 'İlçenizdeki hastalar için acil kan ilanları açabilir, bölgenizdeki vatandaşların görmesini sağlayabilirsiniz.'
                        : 'Create urgent blood donation ads for patients in your district and let local citizens see them.'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {lang === 'tr' ? 'Kayıp Evcil Hayvan' : 'Lost Pet Alerts'}
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">
                      {lang === 'tr'
                        ? 'Kaybolan evcil hayvanınız için ilan oluşturup, çevredeki komşularınızdan yardım alabilirsiniz.'
                        : 'Post ads for your lost pets and get support from neighbors living nearby.'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                    <Gift className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {lang === 'tr' ? 'Eşya Paylaşımı' : 'Item Donations'}
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">
                      {lang === 'tr'
                        ? 'İhtiyacınız olmayan temiz kıyafet, mobilya ve diğer eşyaları bağışlayarak yardımlaşabilirsiniz.'
                        : 'Donate clean clothing, furniture, or other unused items to share with those in need.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 leading-relaxed font-semibold">
                ℹ️ {lang === 'tr'
                  ? 'Açtığınız tüm ilanlar yalnızca kendi ilçenizdeki vatandaşlara ulaştırılır ve onlara gösterilir.'
                  : 'All ads you post are targeted and shown only to citizens residing in your district.'}
              </div>

              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => {
                    storageService.setItem('belediye_social_ads_intro_shown', 'true');
                    setShowIntroModal(false);
                  }}
                  className="w-full rounded-2xl bg-primary py-3 text-xs font-bold text-white shadow-lg shadow-primary/20 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
                >
                  {lang === 'tr' ? 'Anladım, Keşfet' : 'I Understand, Explore'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

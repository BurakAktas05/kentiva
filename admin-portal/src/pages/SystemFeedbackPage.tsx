import { useEffect, useState } from 'react';
import api from '../api';
import { MessageSquare, Sparkles, Star, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

type FeedbackItem = {
  id: string;
  username: string;
  userEmail: string;
  rating: number;
  content: string;
  sentiment: string;
  category: string;
  createdAt: string;
};

export default function SystemFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<string>('');
  const [reportLoading, setReportLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const fetchFeedbacks = async (p: number) => {
    try {
      setLoading(true);
      const res = await api.get(`/system-feedback?page=${p}&size=10`);
      const data = res.data.data;
      if (p === 0) {
        setFeedbacks(data.content);
      } else {
        setFeedbacks(prev => [...prev, ...data.content]);
      }
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } catch (err) {
      console.error('Geri bildirimler yüklenemedi', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks(0);
  }, []);

  const generateReport = async () => {
    try {
      setReportLoading(true);
      const res = await api.get('/system-feedback/ai-report');
      setReport(res.data.data);
    } catch (err) {
      console.error('Rapor üretilemedi', err);
      setReport('Rapor üretilirken bir hata oluştu.');
    } finally {
      setReportLoading(false);
    }
  };

  const sentimentBadge = (s?: string) => {
    const val = s || 'NEUTRAL';
    switch (val.toUpperCase()) {
      case 'POSITIVE':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">😊 Olumlu</span>;
      case 'NEGATIVE':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">😞 Olumsuz</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400">😐 Nötr</span>;
    }
  };

  const categoryBadge = (c?: string) => {
    const val = c || 'OTHER';
    switch (val.toUpperCase()) {
      case 'PERFORMANCE':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">⚡ Performans</span>;
      case 'UI_DESIGN':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">🎨 Tasarım</span>;
      case 'USER_SUGGESTION':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">💡 Öneri</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400">⚙️ Genel</span>;
    }
  };

  const totalRating = feedbacks.reduce((acc, curr) => acc + curr.rating, 0);
  const averageRating = feedbacks.length > 0 ? (totalRating / feedbacks.length).toFixed(1) : '0.0';

  return (
    <div className="p-6 space-y-6">
      <div>
        <p className="kentiva-eyebrow">Platform Raporları</p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Uygulama Geri Bildirimleri
        </h2>
        <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
          Vatandaşların mobil uygulama hakkındaki görüş, öneri ve puanlamaları.
        </p>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Ortalama Puan</p>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2 flex items-baseline gap-1">
                {averageRating} <span className="text-sm font-semibold text-slate-500">/ 5</span>
              </p>
            </div>
            <div className="p-2.5 bg-yellow-500/10 rounded-xl">
              <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
            </div>
          </div>
          <div className="mt-3 flex gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`h-4 w-4 ${s <= Math.round(Number(averageRating)) ? 'text-yellow-500 fill-yellow-500' : 'text-slate-200 dark:text-slate-750'}`}
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Toplam Yorum</p>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
                {totalElements}
              </p>
            </div>
            <div className="p-2.5 bg-violet-500/10 rounded-xl">
              <MessageSquare className="h-6 w-6 text-violet-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">Kentiva genelindeki tüm vatandaş bildirimleri</p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Yapay Zeka Analizi</p>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mt-2">
                Genel eğilimleri ve raporları anında çıkartın.
              </p>
            </div>
            <div className="p-2.5 bg-sky-500/10 rounded-xl">
              <Sparkles className="h-6 w-6 text-sky-500" />
            </div>
          </div>
          <button
            onClick={generateReport}
            disabled={reportLoading}
            className="w-full mt-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2 px-3 transition-colors flex items-center justify-center gap-1.5 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {reportLoading ? 'Rapor Üretiliyor...' : 'Yapay Zeka Raporu Üret'}
          </button>
        </div>
      </div>

      {/* AI Report Render Area */}
      {report && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-violet-200 bg-violet-50/40 p-5 shadow-sm space-y-3 dark:border-violet-900/50 dark:bg-violet-950/20"
        >
          <div className="flex items-center gap-2 text-violet-800 dark:text-violet-300">
            <Sparkles className="h-5 w-5 fill-violet-800/10" />
            <h3 className="font-extrabold text-sm uppercase tracking-wider">Yapay Zeka Genel Değerlendirme Raporu</h3>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-medium leading-relaxed">
            {report}
          </div>
        </motion.div>
      )}

      {/* Feedback list */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Geri Bildirim Listesi</h3>
        
        {feedbacks.length === 0 && !loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900/50">
            <MessageSquare className="mx-auto h-10 w-10 text-slate-400" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mt-2">Henüz geri bildirim alınmamış.</p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {feedbacks.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{item.username}</h4>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">{item.userEmail}</p>
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3.5 w-3.5 ${star <= item.rating ? 'text-yellow-500 fill-yellow-500' : 'text-slate-200 dark:text-slate-800'}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Content */}
                <p className="text-xs text-slate-750 dark:text-slate-350 leading-relaxed font-medium">
                  {item.content}
                </p>
              </div>

              {/* Badges and date */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                <div className="flex gap-1.5">
                  {sentimentBadge(item.sentiment)}
                  {categoryBadge(item.category)}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 font-semibold">
                  <Calendar className="h-3 w-3" />
                  {new Date(item.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {page + 1 < totalPages && (
          <div className="flex justify-center pt-4">
            <button
              onClick={() => {
                const nextPage = page + 1;
                setPage(nextPage);
                fetchFeedbacks(nextPage);
              }}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-350 dark:hover:bg-slate-800"
            >
              {loading ? 'Yükleniyor...' : 'Daha Fazla Yükle'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

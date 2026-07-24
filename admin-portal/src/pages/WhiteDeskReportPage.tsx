import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Keyboard,
  Loader2,
  MapPin,
  Phone,
  PlusCircle,
  Send,
  Zap,
} from 'lucide-react';
import api, { type Report } from '../api';

type Category = {
  id: string;
  name: string;
  description?: string | null;
};

type CurrentUser = {
  municipality?: {
    id: string;
    name: string;
    displayName?: string | null;
    centerLat?: number;
    centerLng?: number;
  } | null;
};

type FormState = {
  reporterFirstName: string;
  reporterLastName: string;
  reporterEmail: string;
  reporterPhoneNumber: string;
  title: string;
  description: string;
  categoryId: string;
  latitude: string;
  longitude: string;
  district: string;
  kvkkApproved: boolean;
  consentNote: string;
};

const initialForm: FormState = {
  reporterFirstName: '',
  reporterLastName: '',
  reporterEmail: '',
  reporterPhoneNumber: '',
  title: '',
  description: '',
  categoryId: '',
  latitude: '',
  longitude: '',
  district: '',
  kvkkApproved: false,
  consentNote: '',
};

/* ───── Quick templates ───── */
type QuickTemplate = {
  emoji: string;
  label: string;
  title: string;
  description: string;
  categoryKeyword: string;
};

const QUICK_TEMPLATES: QuickTemplate[] = [
  {
    emoji: '🕳️',
    label: 'Çukur',
    title: 'Yolda çukur oluşumu',
    description: 'Vatandaş tarafından bildirilen yol çukuru. Araç ve yaya güvenliğini tehdit etmektedir. Acil onarım talep edilmektedir.',
    categoryKeyword: 'yol',
  },
  {
    emoji: '🧱',
    label: 'Kaldırım',
    title: 'Kırık kaldırım / tretuvar',
    description: 'Kaldırım bozulması veya kırılması nedeniyle yaya geçişi tehlikeli hale gelmiştir. Tamir veya yenileme gerekmektedir.',
    categoryKeyword: 'kaldırım',
  },
  {
    emoji: '💡',
    label: 'Aydınlatma',
    title: 'Sokak aydınlatma arızası',
    description: 'Sokak lambası yanmıyor veya sürekli yanıp sönüyor. Gece güvenliği açısından onarım talep edilmektedir.',
    categoryKeyword: 'aydınlatma',
  },
  {
    emoji: '🗑️',
    label: 'Çöp',
    title: 'Çöp toplama / temizlik talebi',
    description: 'Belirtilen adreste çöp birikimi veya düzensiz toplama sorunu mevcuttur. Temizlik ekibi yönlendirilmesi talep edilmektedir.',
    categoryKeyword: 'temizlik',
  },
  {
    emoji: '🌳',
    label: 'Park Bahçe',
    title: 'Park ve yeşil alan bakımı',
    description: 'Park veya yeşil alanda bakım ihtiyacı bulunmaktadır. Budama, çim biçme veya ekipman tamiri gerekmektedir.',
    categoryKeyword: 'park',
  },
  {
    emoji: '💧',
    label: 'Su Kaçağı',
    title: 'Su kaçağı / patlak boru',
    description: 'Su hattında kaçak veya boru patlaması tespit edilmiştir. Acil müdahale gerektirmektedir.',
    categoryKeyword: 'su',
  },
];

/* ───── Phone formatter ───── */
function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  if (digits.length <= 9)
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)}`;
}

export default function WhiteDeskReportPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdReport, setCreatedReport] = useState<Report | null>(null);
  const [reportCount, setReportCount] = useState(0);

  const firstNameRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const municipality = currentUser?.municipality ?? null;

  const canSubmit = useMemo(() => {
    return (
      form.reporterFirstName.trim().length > 0 &&
      (form.reporterPhoneNumber.trim().length > 0 || form.reporterEmail.trim().length > 0) &&
      form.title.trim().length >= 10 &&
      form.description.trim().length >= 20 &&
      form.categoryId &&
      Number.isFinite(Number(form.latitude)) &&
      Number.isFinite(Number(form.longitude)) &&
      form.kvkkApproved
    );
  }, [form]);

  /* ───── Progress calculation ───── */
  const progress = useMemo(() => {
    let filled = 0;
    const total = 6;
    if (form.reporterFirstName.trim().length > 0) filled++;
    if (form.reporterPhoneNumber.trim().length > 0 || form.reporterEmail.trim().length > 0) filled++;
    if (form.title.trim().length >= 10) filled++;
    if (form.description.trim().length >= 20) filled++;
    if (form.categoryId) filled++;
    if (form.kvkkApproved) filled++;
    return Math.round((filled / total) * 100);
  }, [form]);

  /* ───── Data loading ───── */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const meRes = await api.get('/auth/me');
        const me = meRes.data.data as CurrentUser;
        setCurrentUser(me);

        const municipalityId = me.municipality?.id;
        if (!municipalityId) {
          setError('Belediye kapsamı bulunamadı.');
          setCategories([]);
          return;
        }

        setForm((prev) => ({
          ...prev,
          district: me.municipality?.displayName || me.municipality?.name || '',
          latitude: me.municipality?.centerLat != null ? String(me.municipality.centerLat) : prev.latitude,
          longitude: me.municipality?.centerLng != null ? String(me.municipality.centerLng) : prev.longitude,
        }));

        const categoryRes = await api.get('/categories', { params: { municipalityId } });
        const nextCategories = (categoryRes.data.data ?? []) as Category[];
        setCategories(nextCategories);
        if (nextCategories.length > 0) {
          setForm((prev) => ({ ...prev, categoryId: prev.categoryId || nextCategories[0].id }));
        }
      } catch {
        setError('Beyaz Masa formu yüklenemedi.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  /* ───── Autofocus ───── */
  useEffect(() => {
    if (!loading && firstNameRef.current) {
      firstNameRef.current.focus();
    }
  }, [loading]);

  const resetForNewReport = useCallback(() => {
    setForm((prev) => ({
      ...initialForm,
      categoryId: prev.categoryId,
      district: prev.district,
      latitude: prev.latitude,
      longitude: prev.longitude,
    }));
    setCreatedReport(null);
    setError(null);
    setTimeout(() => firstNameRef.current?.focus(), 50);
  }, []);

  /* ───── Keyboard shortcuts ───── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+Enter → submit
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (canSubmit && !saving) {
          formRef.current?.requestSubmit();
        }
      }
      // Ctrl+N → new report
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        resetForNewReport();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [canSubmit, resetForNewReport, saving]);

  const update = (field: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  /* ───── Apply quick template ───── */
  const applyTemplate = (template: QuickTemplate) => {
    const matchedCategory = categories.find(
      (c) =>
        c.name.toLowerCase().includes(template.categoryKeyword) ||
        template.categoryKeyword.includes(c.name.toLowerCase()),
    );
    setForm((prev) => ({
      ...prev,
      title: template.title,
      description: template.description,
      categoryId: matchedCategory?.id ?? prev.categoryId,
    }));
  };

  /* ───── Submit ───── */
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || saving) return;
    setSaving(true);
    setError(null);
    setCreatedReport(null);
    try {
      const payload = {
        reporterFirstName: form.reporterFirstName.trim(),
        reporterLastName: form.reporterLastName.trim() || null,
        reporterEmail: form.reporterEmail.trim() || null,
        reporterPhoneNumber: form.reporterPhoneNumber.replace(/\s/g, '').trim() || null,
        title: form.title.trim(),
        description: form.description.trim(),
        categoryId: form.categoryId,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        district: form.district.trim() || municipality?.name || null,
        mediaUrls: [],
        kvkkApproved: form.kvkkApproved,
        consentNote: form.consentNote.trim() || null,
      };
      const res = await api.post('/reports/white-desk', payload);
      setCreatedReport(res.data.data as Report);
      setReportCount((c) => c + 1);
      setForm((prev) => ({
        ...initialForm,
        categoryId: prev.categoryId,
        district: prev.district,
        latitude: prev.latitude,
        longitude: prev.longitude,
      }));
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? String((err.response?.data as { message?: string } | undefined)?.message ?? 'İhbar oluşturulamadı.')
        : 'İhbar oluşturulamadı.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6 text-sm font-semibold text-slate-500 dark:text-slate-400">
        Beyaz Masa formu yükleniyor...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            to="/reports"
            className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Raporlara dön
          </Link>
          <p className="kentiva-eyebrow mt-5">Beyaz Masa</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Vatandaş adına ihbar aç
          </h2>
          <p className="mt-1 max-w-3xl text-sm font-medium text-slate-600 dark:text-slate-400">
            Telefon, WhatsApp veya yüz yüze gelen başvurular tek ekrandan kayıt altına alınır.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {reportCount > 0 && (
            <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              Bu oturumda {reportCount} ihbar
            </span>
          )}
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <Phone className="h-4 w-4 text-primary" />
            {municipality?.displayName || municipality?.name || 'Belediye'}
          </div>
        </div>
      </div>

      {/* ── Progress Bar ── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            <Zap className="h-4 w-4 text-primary" />
            Form doluluk
          </div>
          <span className="text-xs font-extrabold text-primary">%{progress}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-sky-400 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          <Keyboard className="mr-1 inline h-3 w-3" />
          Ctrl+Enter → Gönder · Ctrl+N → Yeni kayıt
        </p>
      </div>

      {/* ── Quick templates ── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Zap className="mr-1 inline h-3 w-3" />
          Hızlı şablon seçin
        </p>
        <div className="flex flex-wrap gap-2">
          {QUICK_TEMPLATES.map((tpl) => (
            <button
              key={tpl.label}
              type="button"
              onClick={() => applyTemplate(tpl)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-md active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-primary/40"
            >
              <span className="text-base">{tpl.emoji}</span>
              {tpl.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Success banner ── */}
      {createdReport && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-extrabold">İhbar oluşturuldu.</p>
                <p className="mt-1 font-semibold">
                  Takip no: {createdReport.trackingNumber || createdReport.id}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetForNewReport}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
              >
                <PlusCircle className="h-4 w-4" />
                Yeni ihbar aç
              </button>
              <Link
                to={`/reports/${createdReport.id}`}
                className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900 dark:text-emerald-200"
              >
                Detaya git
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Error banner ── */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      {/* ── Form ── */}
      <form ref={formRef} onSubmit={submit} className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Phone className="h-5 w-5" />
            </span>
            <div>
              <p className="kentiva-eyebrow">Vatandaş bilgisi</p>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Başvuran kişi</h3>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Ad">
              <input
                ref={firstNameRef}
                value={form.reporterFirstName}
                onChange={(e) => update('reporterFirstName', e.target.value)}
                className="kentiva-input"
                required
                placeholder="Vatandaş adı"
              />
            </Field>
            <Field label="Soyad">
              <input value={form.reporterLastName} onChange={(e) => update('reporterLastName', e.target.value)} className="kentiva-input" placeholder="Soyad (isteğe bağlı)" />
            </Field>
            <Field label="Telefon">
              <input
                value={formatPhoneDisplay(form.reporterPhoneNumber)}
                onChange={(e) => update('reporterPhoneNumber', e.target.value.replace(/\D/g, '').slice(0, 11))}
                className="kentiva-input"
                placeholder="05XX XXX XX XX"
                inputMode="tel"
              />
            </Field>
            <Field label="E-posta">
              <input value={form.reporterEmail} onChange={(e) => update('reporterEmail', e.target.value)} className="kentiva-input" type="email" placeholder="ornek@email.com" />
            </Field>
          </div>

          <label className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200">
            <input
              type="checkbox"
              checked={form.kvkkApproved}
              onChange={(e) => update('kvkkApproved', e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              required
            />
            <span>Vatandaşın KVKK aydınlatma metni okundu/onayı alındı.</span>
          </label>

          <Field label="Rıza / görüşme notu">
            <textarea
              value={form.consentNote}
              onChange={(e) => update('consentNote', e.target.value)}
              className="kentiva-input min-h-[96px]"
              placeholder="Örn. Telefon görüşmesinde sözlü onay alındı."
            />
          </Field>
        </section>

        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ClipboardList className="h-5 w-5" />
            </span>
            <div>
              <p className="kentiva-eyebrow">İhbar detayı</p>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Kayıt bilgileri</h3>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <Field label="Başlık">
              <input value={form.title} onChange={(e) => update('title', e.target.value)} className="kentiva-input" minLength={10} maxLength={150} required placeholder="En az 10 karakter" />
            </Field>
            <Field label="Açıklama">
              <textarea value={form.description} onChange={(e) => update('description', e.target.value)} className="kentiva-input min-h-[132px]" minLength={20} maxLength={2000} required placeholder="En az 20 karakter" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Kategori">
                <select value={form.categoryId} onChange={(e) => update('categoryId', e.target.value)} className="kentiva-input" required>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Bölge">
                <input value={form.district} onChange={(e) => update('district', e.target.value)} className="kentiva-input" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Enlem">
                <input value={form.latitude} onChange={(e) => update('latitude', e.target.value)} className="kentiva-input" inputMode="decimal" required />
              </Field>
              <Field label="Boylam">
                <input value={form.longitude} onChange={(e) => update('longitude', e.target.value)} className="kentiva-input" inputMode="decimal" required />
              </Field>
            </div>
            <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500 dark:bg-slate-950/40 dark:text-slate-400">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Varsayılan koordinat belediye merkezidir; saha adresi biliniyorsa enlem/boylam güncellenebilir.
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={resetForNewReport}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Temizle
            </button>
            <button
              type="submit"
              disabled={!canSubmit || saving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-primary-hover disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              İhbarı oluştur
              <kbd className="ml-1 hidden rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold sm:inline-block">
                Ctrl+↵
              </kbd>
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-bold text-slate-700 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}

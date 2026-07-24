import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Clipboard,
  Copy,
  Download,
  Image,
  Megaphone,
  Newspaper,
  QrCode,
} from 'lucide-react';
import api from '../api';

/* ───── Types ───── */
type MunicipalityInfo = {
  id: string;
  name: string;
  displayName?: string | null;
  slug?: string;
  primaryColor?: string | null;
  slogan?: string | null;
  logoUrl?: string | null;
};

type TabId = 'poster' | 'social' | 'press';

const TABS: { id: TabId; label: string; icon: typeof QrCode }[] = [
  { id: 'poster', label: 'QR Afiş', icon: QrCode },
  { id: 'social', label: 'Sosyal Medya', icon: Image },
  { id: 'press', label: 'Basın Bülteni', icon: Newspaper },
];

type Toast = { type: 'success' | 'error'; message: string } | null;

/* ───── Helpers ───── */
function getCitizenBaseUrl() {
  const env = import.meta.env as Record<string, string | undefined>;
  return env.VITE_CITIZEN_APP_URL || env.VITE_PUBLIC_APP_URL || window.location.origin;
}

function buildCitizenLink(slug?: string) {
  if (!slug) return getCitizenBaseUrl();
  try {
    const url = new URL('/', getCitizenBaseUrl());
    url.searchParams.set('municipality', slug);
    return url.toString();
  } catch {
    return `${getCitizenBaseUrl()}?municipality=${slug}`;
  }
}

function todayFormatted() {
  return new Date().toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/* ───── QR generation using canvas ───── */
async function generateQRDataUrl(text: string, size = 256): Promise<string> {
  try {
    const QRCode = await import('qrcode');
    return await QRCode.toDataURL(text, {
      width: size,
      margin: 2,
      color: { dark: '#1e293b', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    });
  } catch {
    // Fallback: use a simple placeholder
    return '';
  }
}

/* ───── Poster template rendering ───── */
type PosterStyle = 'general' | 'urgent' | 'participation';

const POSTER_STYLES: { id: PosterStyle; label: string; subtitle: string; gradientFrom: string; gradientTo: string }[] = [
  { id: 'general', label: '📢 Genel Duyuru', subtitle: 'Kentiva tanıtım afişi', gradientFrom: '#0ea5e9', gradientTo: '#6366f1' },
  { id: 'urgent', label: '⚠️ Acil Sorunlar', subtitle: 'Sorun bildir çağrısı', gradientFrom: '#ef4444', gradientTo: '#f97316' },
  { id: 'participation', label: '🤝 Kent Katılımı', subtitle: 'Katılımcı belediyecilik', gradientFrom: '#10b981', gradientTo: '#06b6d4' },
];

function drawPoster(
  canvas: HTMLCanvasElement,
  municipality: MunicipalityInfo,
  qrDataUrl: string,
  style: PosterStyle,
  citizenLink: string,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = 794; // A4 width at 96dpi
  const H = 1123; // A4 height at 96dpi
  canvas.width = W;
  canvas.height = H;

  const styleConfig = POSTER_STYLES.find((s) => s.id === style) ?? POSTER_STYLES[0];
  const primaryColor = municipality.primaryColor || styleConfig.gradientFrom;

  // Background
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, styleConfig.gradientFrom);
  grad.addColorStop(1, styleConfig.gradientTo);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // White card
  const cardMargin = 40;
  const cardY = 120;
  const cardH = H - cardY - cardMargin;
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, cardMargin, cardY, W - cardMargin * 2, cardH, 24);
  ctx.fill();

  // Header bar
  ctx.fillStyle = primaryColor;
  roundRect(ctx, cardMargin, cardY, W - cardMargin * 2, 80, 24, true);
  ctx.fill();
  // Header fix: fill bottom corners
  ctx.fillRect(cardMargin, cardY + 56, W - cardMargin * 2, 24);

  // Header text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(municipality.displayName || municipality.name, W / 2, cardY + 50);

  // Title
  const titles: Record<PosterStyle, string> = {
    general: 'ŞEHRİNİZE SAHİP ÇIKIN!',
    urgent: 'BİR SORUN MU VAR?',
    participation: 'SESİNİZ ÖNEMLİ!',
  };
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 38px system-ui, -apple-system, sans-serif';
  ctx.fillText(titles[style], W / 2, cardY + 160);

  // Subtitle
  const subtitles: Record<PosterStyle, string> = {
    general: 'Kentiva ile belediyenize ihbar gönderin',
    urgent: 'Hemen Kentiva ile bildirin!',
    participation: 'Kentiva ile şehrinizin geleceğine katkıda bulunun',
  };
  ctx.fillStyle = '#64748b';
  ctx.font = '500 18px system-ui, -apple-system, sans-serif';
  ctx.fillText(subtitles[style], W / 2, cardY + 200);

  // QR code
  if (qrDataUrl) {
    const qrImg = new window.Image();
    qrImg.src = qrDataUrl;
    const qrSize = 220;
    const qrX = (W - qrSize) / 2;
    const qrY = cardY + 240;
    try {
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    } catch {
      // QR not loaded yet
    }
  }

  // "QR kodu okutun" text
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
  ctx.fillText('📱 QR Kodu Okutun veya Aşağıdaki Linki Ziyaret Edin', W / 2, cardY + 500);

  // Link
  ctx.fillStyle = primaryColor;
  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
  const displayLink = citizenLink.length > 60 ? citizenLink.substring(0, 57) + '...' : citizenLink;
  ctx.fillText(displayLink, W / 2, cardY + 530);

  // Features
  const features = [
    '📸 Fotoğraf çekin, konumu otomatik tespit edilsin',
    '🔔 İhbarınızın her aşamasından bilgi alın',
    '🤖 Yapay zeka ile hızlı çözüm',
    '🔒 KVKK uyumlu güvenli platform',
  ];
  ctx.fillStyle = '#475569';
  ctx.font = '500 15px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  features.forEach((f, i) => {
    ctx.fillText(f, cardMargin + 60, cardY + 590 + i * 36);
  });

  // Footer
  ctx.textAlign = 'center';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 12px system-ui, -apple-system, sans-serif';
  ctx.fillText('Kentiva — Akıllı Belediyecilik Platformu', W / 2, H - cardMargin - 20);

  // Slogan
  if (municipality.slogan) {
    ctx.fillStyle = '#64748b';
    ctx.font = 'italic 13px system-ui, -apple-system, sans-serif';
    ctx.fillText(municipality.slogan, W / 2, H - cardMargin - 45);
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  topOnly = false,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  if (topOnly) {
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
  } else {
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  }
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ───── Social media template ───── */
type SocialFormat = { id: string; label: string; w: number; h: number };
const SOCIAL_FORMATS: SocialFormat[] = [
  { id: 'instagram', label: 'Instagram Post', w: 1080, h: 1080 },
  { id: 'twitter', label: 'Twitter/X Post', w: 1200, h: 675 },
  { id: 'facebook', label: 'Facebook Kapak', w: 820, h: 312 },
];

function drawSocialPost(
  canvas: HTMLCanvasElement,
  municipality: MunicipalityInfo,
  qrDataUrl: string,
  format: SocialFormat,
  citizenLink: string,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = format.w;
  canvas.height = format.h;
  const primaryColor = municipality.primaryColor || '#0ea5e9';

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, format.w, format.h);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(0.5, '#1e293b');
  grad.addColorStop(1, '#0f172a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, format.w, format.h);

  // Accent circle
  ctx.fillStyle = primaryColor + '30';
  ctx.beginPath();
  ctx.arc(format.w * 0.85, format.h * 0.3, format.h * 0.5, 0, Math.PI * 2);
  ctx.fill();

  const isWide = format.w / format.h > 1.5;
  const centerY = format.h / 2;

  if (isWide) {
    // Wide layout: text left, QR right
    ctx.textAlign = 'left';
    const textX = 60;

    ctx.fillStyle = primaryColor;
    ctx.font = `bold ${Math.round(format.h * 0.08)}px system-ui, sans-serif`;
    ctx.fillText(municipality.displayName || municipality.name, textX, centerY - format.h * 0.15);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(format.h * 0.12)}px system-ui, sans-serif`;
    ctx.fillText('Şehrinize Sahip Çıkın!', textX, centerY + format.h * 0.05);

    ctx.fillStyle = '#94a3b8';
    ctx.font = `500 ${Math.round(format.h * 0.06)}px system-ui, sans-serif`;
    ctx.fillText('Kentiva ile ihbar gönderin', textX, centerY + format.h * 0.2);

    if (qrDataUrl) {
      const qrSize = Math.min(format.h * 0.5, 160);
      const qrImg = new window.Image();
      qrImg.src = qrDataUrl;
      try { ctx.drawImage(qrImg, format.w - qrSize - 60, (format.h - qrSize) / 2, qrSize, qrSize); } catch {
        // QR image may not be decoded yet; the poster remains valid without it.
      }
    }
  } else {
    // Square layout
    ctx.textAlign = 'center';
    const cx = format.w / 2;

    ctx.fillStyle = primaryColor;
    ctx.font = `bold ${Math.round(format.h * 0.04)}px system-ui, sans-serif`;
    ctx.fillText(municipality.displayName || municipality.name, cx, format.h * 0.12);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(format.h * 0.07)}px system-ui, sans-serif`;
    ctx.fillText('Şehrinize', cx, format.h * 0.28);
    ctx.fillText('Sahip Çıkın!', cx, format.h * 0.36);

    ctx.fillStyle = '#94a3b8';
    ctx.font = `500 ${Math.round(format.h * 0.03)}px system-ui, sans-serif`;
    ctx.fillText('Kentiva ile sorunları bildirin, takip edin', cx, format.h * 0.43);

    if (qrDataUrl) {
      const qrSize = Math.min(format.h * 0.3, 240);
      const qrImg = new window.Image();
      qrImg.src = qrDataUrl;
      try { ctx.drawImage(qrImg, (format.w - qrSize) / 2, format.h * 0.48, qrSize, qrSize); } catch {
        // QR image may not be decoded yet; the poster remains valid without it.
      }
    }

    ctx.fillStyle = '#64748b';
    ctx.font = `500 ${Math.round(format.h * 0.025)}px system-ui, sans-serif`;
    ctx.fillText('📱 QR Kodu Okutun', cx, format.h * 0.85);

    ctx.fillStyle = primaryColor;
    ctx.font = `bold ${Math.round(format.h * 0.022)}px system-ui, sans-serif`;
    const linkDisplay = citizenLink.length > 50 ? citizenLink.substring(0, 47) + '...' : citizenLink;
    ctx.fillText(linkDisplay, cx, format.h * 0.9);

    ctx.fillStyle = '#475569';
    ctx.font = `500 ${Math.round(format.h * 0.02)}px system-ui, sans-serif`;
    ctx.fillText('Kentiva — Akıllı Belediyecilik Platformu', cx, format.h * 0.96);
  }
}

/* ───── Press release template ───── */
function generatePressRelease(municipality: MunicipalityInfo, citizenLink: string): string {
  const name = municipality.displayName || municipality.name;
  return `BASIN BÜLTENİ

${name} Belediyesi — Dijital İhbar Hattı Hizmete Girdi

Tarih: ${todayFormatted()}

${name} Belediyesi, vatandaşların çevrelerindeki sorunları hızlı ve kolay bir şekilde bildirebilmeleri için Kentiva dijital ihbar hattını kullanıma açtı.

UYGULAMA HAKKINDA

Kentiva, yapay zeka destekli akıllı belediyecilik platformudur. Vatandaşlar çukur, kırık kaldırım, aydınlatma arızası, çevre kirliliği gibi tüm belediye sorunlarını fotoğraf ve konum bilgisiyle birlikte tek bir uygulama üzerinden bildirebilir.

NASIL KULLANILIR?

1. ${citizenLink} adresini ziyaret edin veya QR kodu okutun
2. Ücretsiz kayıt olun
3. Sorunu fotoğraflayın — konum otomatik tespit edilir
4. İhbarınızın durumunu canlı olarak takip edin

ÖNE ÇIKAN ÖZELLİKLER

• 📸 Fotoğraflı ihbar — Sorunları görsel olarak belgeleyin
• 📍 GPS tabanlı konum — Adres girmeye gerek yok
• 🤖 Yapay zeka — İhbarlar otomatik kategorize ve önceliklendirilir
• 🔔 Canlı takip — Her aşamadan push bildirim
• 🔒 KVKK uyumlu — Yüz ve plaka otomatik gizlenir
• 🏆 Güven puanı — Doğru ihbar gönderenlere ödül sistemi

${name} Belediye Başkanlığı, vatandaşlarını bu dijital platforma katılmaya ve şehirlerinin sorunlarının çözümüne katkıda bulunmaya davet etmektedir.

Detaylı bilgi ve uygulama erişimi: ${citizenLink}

İletişim:
${name} Belediyesi
Halkla İlişkiler Birimi

---
Bu bülten ${name} Belediyesi adına Kentiva platformu tarafından hazırlanmıştır.`;
}

/* ═══════════════════════════════════════════ */
/* ───── Main Page Component ───── */
/* ═══════════════════════════════════════════ */
export default function MarketingKitPage() {
  const [municipality, setMunicipality] = useState<MunicipalityInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('poster');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [posterStyle, setPosterStyle] = useState<PosterStyle>('general');
  const [socialFormat, setSocialFormat] = useState<SocialFormat>(SOCIAL_FORMATS[0]);
  const [toast, setToast] = useState<Toast>(null);

  const posterCanvasRef = useRef<HTMLCanvasElement>(null);
  const socialCanvasRef = useRef<HTMLCanvasElement>(null);

  const citizenLink = useMemo(() => buildCitizenLink(municipality?.slug), [municipality]);
  const pressRelease = useMemo(
    () => (municipality ? generatePressRelease(municipality, citizenLink) : ''),
    [municipality, citizenLink],
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get('/auth/me');
        const me = res.data.data;
        const m = me?.municipality;
        if (m) {
          setMunicipality({
            id: m.id,
            name: m.name,
            displayName: m.displayName,
            slug: m.slug,
            primaryColor: m.primaryColor ?? null,
            slogan: m.slogan ?? null,
            logoUrl: m.logoUrl ?? null,
          });
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  // Generate QR whenever citizenLink changes
  useEffect(() => {
    if (citizenLink) {
      void generateQRDataUrl(citizenLink, 300).then(setQrDataUrl);
    }
  }, [citizenLink]);

  // Draw poster whenever dependencies change
  useEffect(() => {
    if (municipality && qrDataUrl && posterCanvasRef.current) {
      drawPoster(posterCanvasRef.current, municipality, qrDataUrl, posterStyle, citizenLink);
    }
  }, [municipality, qrDataUrl, posterStyle, citizenLink]);

  // Draw social post
  useEffect(() => {
    if (municipality && qrDataUrl && socialCanvasRef.current) {
      drawSocialPost(socialCanvasRef.current, municipality, qrDataUrl, socialFormat, citizenLink);
    }
  }, [municipality, qrDataUrl, socialFormat, citizenLink]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast({ type: 'success', message: `${label} kopyalandı.` });
    } catch {
      setToast({ type: 'error', message: 'Kopyalama yapılamadı.' });
    }
  };

  const downloadCanvas = (canvas: HTMLCanvasElement | null, filename: string) => {
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const downloadText = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6 text-sm font-semibold text-slate-500 dark:text-slate-400">
        Pazarlama paketi yükleniyor...
      </div>
    );
  }

  if (!municipality) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6 text-sm font-semibold text-slate-500 dark:text-slate-400">
        Belediye bilgisi bulunamadı.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Toast */}
      {toast && (
        <div
          role="status"
          className={`fixed right-6 top-20 z-50 rounded-xl border px-4 py-3 text-sm font-bold shadow-lg ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100'
              : 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="kentiva-eyebrow">Vatandaş büyütme</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Pazarlama Paketi
          </h2>
          <p className="mt-1 max-w-3xl text-sm font-medium text-slate-600 dark:text-slate-400">
            Basıma hazır afiş, sosyal medya görseli ve basın bülteni üretin. Belediyenizin renk ve kimliğiyle otomatik oluşturulur.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
          <Megaphone className="h-4 w-4 text-primary" />
          {municipality.displayName || municipality.name}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-primary text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: QR Poster ── */}
      {activeTab === 'poster' && (
        <div className="grid gap-6 xl:grid-cols-[1fr_0.6fr]">
          <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="kentiva-eyebrow">Afiş önizleme</p>
                <h3 className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">QR Kodlu Afiş</h3>
              </div>
              <button
                type="button"
                onClick={() => downloadCanvas(posterCanvasRef.current, `kentiva-afis-${posterStyle}-${municipality.slug || 'belediye'}.png`)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-primary-hover"
              >
                <Download className="h-4 w-4" />
                PNG İndir
              </button>
            </div>
            <div className="flex justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
              <canvas
                ref={posterCanvasRef}
                className="max-h-[600px] w-auto rounded-lg shadow-lg"
                style={{ imageRendering: 'auto' }}
              />
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="kentiva-eyebrow">Şablon stili</p>
              <h3 className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">Afiş tipi seçin</h3>
              <div className="mt-4 space-y-2">
                {POSTER_STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setPosterStyle(s.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                      posterStyle === s.id
                        ? 'border-primary/40 bg-primary/5 shadow-md dark:border-primary/40'
                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                    }`}
                  >
                    <div
                      className="h-8 w-8 rounded-lg"
                      style={{ background: `linear-gradient(135deg, ${s.gradientFrom}, ${s.gradientTo})` }}
                    />
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{s.label}</p>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{s.subtitle}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="kentiva-eyebrow">QR kodu bağlantısı</p>
              <p className="mt-2 break-all rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
                {citizenLink}
              </p>
              <button
                type="button"
                onClick={() => void copyText(citizenLink, 'Vatandaş linki')}
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Copy className="h-3.5 w-3.5" />
                Linki kopyala
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ── Tab: Social Media ── */}
      {activeTab === 'social' && (
        <div className="grid gap-6 xl:grid-cols-[1fr_0.4fr]">
          <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="kentiva-eyebrow">Sosyal medya</p>
                <h3 className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">
                  {socialFormat.label} ({socialFormat.w}×{socialFormat.h})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => downloadCanvas(socialCanvasRef.current, `kentiva-${socialFormat.id}-${municipality.slug || 'belediye'}.png`)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-primary-hover"
              >
                <Download className="h-4 w-4" />
                PNG İndir
              </button>
            </div>
            <div className="flex justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
              <canvas
                ref={socialCanvasRef}
                className="max-h-[500px] w-auto rounded-lg shadow-lg"
                style={{ imageRendering: 'auto' }}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="kentiva-eyebrow">Format seçin</p>
            <h3 className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">Boyut</h3>
            <div className="mt-4 space-y-2">
              {SOCIAL_FORMATS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSocialFormat(f)}
                  className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all ${
                    socialFormat.id === f.id
                      ? 'border-primary/40 bg-primary/5 shadow-md dark:border-primary/40'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                  }`}
                >
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{f.label}</span>
                  <span className="text-xs font-semibold text-slate-500">{f.w}×{f.h}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ── Tab: Press Release ── */}
      {activeTab === 'press' && (
        <div className="grid gap-6 xl:grid-cols-[1fr_0.4fr]">
          <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="kentiva-eyebrow">Basın bülteni</p>
                <h3 className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">Yerel basına duyuru metni</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void copyText(pressRelease, 'Basın bülteni')}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <Clipboard className="h-3.5 w-3.5" />
                  Kopyala
                </button>
                <button
                  type="button"
                  onClick={() => downloadText(pressRelease, `kentiva-basin-bulteni-${municipality.slug || 'belediye'}.txt`)}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-primary-hover"
                >
                  <Download className="h-4 w-4" />
                  TXT İndir
                </button>
              </div>
            </div>
            <pre className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm font-semibold leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200">
              {pressRelease}
            </pre>
          </section>

          <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="kentiva-eyebrow">Kullanım rehberi</p>
            <h3 className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">Nasıl dağıtılır?</h3>
            <div className="mt-4 space-y-4 text-sm font-medium text-slate-600 dark:text-slate-300">
              <div className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-extrabold text-primary">1</span>
                <p>Metni kopyalayın veya TXT olarak indirin</p>
              </div>
              <div className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-extrabold text-primary">2</span>
                <p>Belediye antetli kağıdına yapıştırın</p>
              </div>
              <div className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-extrabold text-primary">3</span>
                <p>Yerel gazete, haber siteleri ve belediye sosyal medya hesaplarından paylaşın</p>
              </div>
              <div className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-extrabold text-primary">4</span>
                <p>QR afişini muhtarlık, vezne ve hizmet binasına asın</p>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

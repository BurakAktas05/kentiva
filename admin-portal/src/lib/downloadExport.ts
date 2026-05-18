import type { AxiosResponse } from 'axios';

function parseFilename(contentDisposition: string | undefined, fallback: string): string {
  if (!contentDisposition) return fallback;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1].trim());
    } catch {
      /* fall through */
    }
  }
  const plain = /filename="?([^";\n]+)"?/i.exec(contentDisposition);
  if (plain?.[1]) return plain[1].trim();
  return fallback;
}

function mimeForExport(filename: string, contentType: string): string {
  if (contentType && !contentType.includes('json')) return contentType;
  const lower = filename.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.xlsx')) {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  return 'application/octet-stream';
}

/** Blob API yanıtını doğru MIME ve dosya adıyla indirir; JSON hata gövdesini ayıklar. */
export async function downloadBlobResponse(res: AxiosResponse<Blob>, fallbackName: string): Promise<void> {
  const blob = res.data;
  const contentType = (res.headers['content-type'] as string | undefined) ?? blob.type ?? '';

  if (contentType.includes('application/json')) {
    const text = await blob.text();
    let message = 'Dışa aktarma başarısız oldu.';
    try {
      const parsed = JSON.parse(text) as { message?: string };
      if (parsed.message) message = parsed.message;
    } catch {
      if (text.trim()) message = text.slice(0, 200);
    }
    throw new Error(message);
  }

  const filename = parseFilename(res.headers['content-disposition'] as string | undefined, fallbackName);
  const mime = mimeForExport(filename, contentType);
  const url = window.URL.createObjectURL(new Blob([blob], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

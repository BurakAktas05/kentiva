import { useEffect } from 'react';

export type SeoHeadProps = {
  title: string;
  description: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  noIndex?: boolean;
};

const SITE_ORIGIN =
  (import.meta.env.VITE_SITE_URL as string | undefined)?.trim().replace(/\/+$/, '') ||
  (typeof window !== 'undefined' ? window.location.origin : 'https://kentiva.app');

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  const selector = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  const selector = `link[rel="${rel}"]`;
  let el = document.head.querySelector(selector) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function SeoHead({
  title,
  description,
  canonicalPath = '/',
  ogImage,
  ogType = 'website',
  noIndex = false,
}: SeoHeadProps) {
  useEffect(() => {
    document.title = title;
    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', ogType);
    upsertMeta('property', 'og:locale', 'tr_TR');
    upsertMeta('name', 'twitter:card', ogImage ? 'summary_large_image' : 'summary');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);

    const canonical = `${SITE_ORIGIN}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`;
    upsertLink('canonical', canonical);
    upsertMeta('property', 'og:url', canonical);

    if (ogImage) {
      upsertMeta('property', 'og:image', ogImage);
      upsertMeta('name', 'twitter:image', ogImage);
    }

    if (noIndex) {
      upsertMeta('name', 'robots', 'noindex, nofollow');
    } else {
      const robots = document.head.querySelector('meta[name="robots"]');
      robots?.remove();
    }
  }, [title, description, canonicalPath, ogImage, ogType, noIndex]);

  return null;
}

export function siteUrl(path = '/') {
  return `${SITE_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}

import { useEffect } from 'react';

interface SEOOptions {
  title: string;
  description?: string;
  image?: string;
  jsonLd?: Record<string, any>;
}

export function usePageSEO({ title, description, image, jsonLd }: SEOOptions) {
  useEffect(() => {
    // 1. Dynamic Title
    const fullTitle = title.includes('ZENPHIRE') ? title : `${title} | ZENPHIRE`;
    document.title = fullTitle;

    // Helper to set or create meta tag
    const setMetaTag = (selector: string, attrName: string, attrVal: string, content: string) => {
      let element = document.querySelector(selector);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attrName, attrVal);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // 2. Meta Description
    if (description) {
      setMetaTag('meta[name="description"]', 'name', 'description', description);
      setMetaTag('meta[property="og:description"]', 'property', 'og:description', description);
      setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    }

    // 3. Open Graph Title
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', fullTitle);

    // 4. Image
    if (image) {
      setMetaTag('meta[property="og:image"]', 'property', 'og:image', image);
      setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', image);
    }

    // 5. JSON-LD Structured Data
    let scriptEl: HTMLScriptElement | null = null;
    if (jsonLd) {
      scriptEl = document.createElement('script');
      scriptEl.type = 'application/ld+json';
      scriptEl.id = 'jsonld-structured-data';
      scriptEl.text = JSON.stringify(jsonLd);
      document.head.appendChild(scriptEl);
    }

    return () => {
      if (scriptEl && scriptEl.parentNode) {
        scriptEl.parentNode.removeChild(scriptEl);
      }
    };
  }, [title, description, image, jsonLd]);
}

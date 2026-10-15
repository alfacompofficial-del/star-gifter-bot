// Google Ads & Analytics Tracking Helper

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dataLayer?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtag?: (...args: any[]) => void;
  }
}

/**
 * Initialize Google Ads gtag.js if VITE_GOOGLE_ADS_ID is defined in .env
 */
export const initGoogleAds = () => {
  const adsId = import.meta.env.VITE_GOOGLE_ADS_ID;
  if (!adsId || typeof window === "undefined") return;

  // Avoid injecting twice
  if (document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${adsId}"]`)) {
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${adsId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", adsId);
};

/**
 * Track page view for Google Ads / Analytics
 */
export const trackGoogleAdsPageView = (pagePath: string) => {
  const adsId = import.meta.env.VITE_GOOGLE_ADS_ID;
  if (typeof window !== "undefined" && window.gtag && adsId) {
    window.gtag("event", "page_view", {
      page_path: pagePath,
      send_to: adsId,
    });
  }
};

/**
 * Track Google Ads conversion (e.g. on /cart/success)
 */
export const trackGoogleAdsConversion = (value?: number, currency = "UZS") => {
  const adsId = import.meta.env.VITE_GOOGLE_ADS_ID;
  const label = import.meta.env.VITE_GOOGLE_ADS_CONVERSION_LABEL;
  if (typeof window !== "undefined" && window.gtag && adsId) {
    const sendTo = label ? `${adsId}/${label}` : adsId;
    window.gtag("event", "conversion", {
      send_to: sendTo,
      value: value || 0,
      currency,
    });
  }
};

/**
 * Track add_to_cart event for Google Ads
 */
export const trackGoogleAdsAddToCart = (item: { id: number; name: string; price: number }) => {
  const adsId = import.meta.env.VITE_GOOGLE_ADS_ID;
  if (typeof window !== "undefined" && window.gtag && adsId) {
    window.gtag("event", "add_to_cart", {
      send_to: adsId,
      items: [
        {
          id: String(item.id),
          name: item.name,
          price: item.price,
        },
      ],
    });
  }
};

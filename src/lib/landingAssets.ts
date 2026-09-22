declare global {
  interface Window {
    ScrollCraft?: {
      mount: (root: Element | Document, opts?: Record<string, unknown>) => unknown;
      instances: unknown[];
    };
  }
}

// Shared by every screen that needs the landing page's visual language (dark
// canvas, lime accent, Archivo/Space Grotesk) — the marketing page itself,
// and any auth-adjacent screen (signup) reached from it, so the whole
// pre-login experience reads as one brand rather than switching to the
// app's own light management-panel theme partway through.
const LANDING_ASSET_ATTR = "data-landing-asset";

export function ensureLandingAssets(): Promise<void> {
  const head = document.head;

  if (!head.querySelector(`link[href="/landing/scrollcraft.css"]`)) {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "/landing/scrollcraft.css";
    css.setAttribute(LANDING_ASSET_ATTR, "");
    head.appendChild(css);
  }
  if (!head.querySelector(`link[href="/landing/page.css"]`)) {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "/landing/page.css";
    css.setAttribute(LANDING_ASSET_ATTR, "");
    head.appendChild(css);
  }
  if (!head.querySelector(`link[href*="fonts.googleapis.com/css2?family=Archivo"]`)) {
    const preconnect1 = document.createElement("link");
    preconnect1.rel = "preconnect";
    preconnect1.href = "https://fonts.googleapis.com";
    preconnect1.setAttribute(LANDING_ASSET_ATTR, "");
    const preconnect2 = document.createElement("link");
    preconnect2.rel = "preconnect";
    preconnect2.href = "https://fonts.gstatic.com";
    preconnect2.crossOrigin = "anonymous";
    preconnect2.setAttribute(LANDING_ASSET_ATTR, "");
    const fonts = document.createElement("link");
    fonts.rel = "stylesheet";
    fonts.href =
      "https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800;900&family=Space+Grotesk:wght@400;500;600&display=swap";
    fonts.setAttribute(LANDING_ASSET_ATTR, "");
    head.append(preconnect1, preconnect2, fonts);
  }

  if (window.ScrollCraft) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="/landing/scrollcraft.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("scrollcraft.js failed to load")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "/landing/scrollcraft.js";
    script.setAttribute(LANDING_ASSET_ATTR, "");
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("scrollcraft.js failed to load"));
    document.body.appendChild(script);
  });
}

export function removeLandingAssets() {
  document.head.querySelectorAll(`[${LANDING_ASSET_ATTR}]`).forEach((el) => el.remove());
}

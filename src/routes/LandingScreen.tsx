import { useEffect, useRef, useState, type FormEvent } from "react";
import { signInAtRootAndGetHandoff } from "@/lib/api";

declare global {
  interface Window {
    ScrollCraft?: {
      mount: (root: Element | Document, opts?: Record<string, unknown>) => unknown;
      instances: unknown[];
    };
  }
}

// Verified scroll-craft build (scrollcraft/builds/gymkoc-landing). Kept as a
// single markup string so the data-sc-* attributes match the harness-tested
// build byte for byte. The two "giriş yap" anchors carry data-gk-login so the
// click handler below can intercept them instead of navigating to "/".
const LANDING_MARKUP = `
<span data-sc-progress></span>
<div class="sc-grain" aria-hidden="true"></div>
<div class="gk-folio" data-gk-folio>I — Antrenman</div>

<main id="top">

  <section class="gk-hero">
    <div class="gk-hero__mark">
      <svg class="gk-hero__bolt" viewBox="0 0 32 32" fill="none"><path d="M17 3 L8 18 L14.5 18 L13 29 L25 13 L18 13 Z" fill="#B8F028"/></svg>
      <span>Gymkoç</span>
    </div>
    <h1>Salonun<br><em>tek panelde</em>.</h1>
    <p class="gk-hero__sub">Antrenörler dersini sahada, telefonlarından saniyeler içinde girer. Sen her şubeyi, her PT'yi tek ekrandan izlersin.</p>
    <div class="gk-hero__actions">
      <a class="gk-link gk-link--primary" href="/signup">Salonunu oluştur</a>
      <a class="gk-link" href="/" data-gk-login>Giriş yap</a>
    </div>
  </section>

  <section class="sc-section gk-chapter" data-sc-act="flow" data-gk-chapter="I — Antrenman">
    <div class="sc-wrap gk-spread gk-spread--split">
      <div class="gk-spread__text sc-stack" data-sc-in data-sc-stagger="70">
        <span class="gk-eyebrow">I — Antrenman</span>
        <h2 class="gk-h2">Enerji sahada başlar.</h2>
        <p class="sc-body">Bire bir dersler PT'nin elinde. Kimin, ne zaman, kiminle çalıştığı bir bakışta belli — salon sahibi uzaktan, gerçek zamanlı izler.</p>
      </div>
      <div class="gk-spread__media">
        <figure data-sc-reveal="up" data-sc-reveal-at="0.1 0.5">
          <img src="/landing/assets/01-training.webp" width="2736" height="1520" alt="Bir sporcu, zil ağırlığı ile hareketin zirvesinde, karanlık bir salonda lime yeşili ışıkla aydınlanmış.">
        </figure>
      </div>
    </div>
  </section>

  <section class="gk-chapter gk-chapter--alt" data-sc-act="pin" data-sc-span="3.4">
    <div data-sc-stage class="sc-wrap gk-spread gk-spread--split gk-spread--reverse">
      <div class="gk-spread__text" data-sc-cue="0 0.3 0">
        <span class="gk-eyebrow">II — Ekipman</span>
        <h2 class="gk-h2" data-sc-kinetic="lines">Her ekipmanın bir amacı var.</h2>
        <p class="sc-body" data-sc-cue="0.05 0.4 0">Zil ağırlık. Beton zemin. Ve az sonra göreceğin gibi, arkasında gerçekten çalışan bir sistem.</p>
      </div>
      <div class="gk-spread__media">
        <div class="gk-swap-stage" data-gk-object-swap="0.5">
          <img src="/landing/assets/02-equipment.webp" width="1776" height="2352" alt="Beton zeminde tek bir mat siyah zil ağırlık, lime yeşili ışıkla vurgulanmış.">
          <div class="gk-panel">
            <div class="gk-panel__head">
              <span>09:00</span>
              <span>3/3 · Dolu</span>
            </div>
            <div class="gk-slot">
              <span class="gk-slot__time">09:00</span>
              <div class="gk-chips">
                <span class="gk-chip gk-chip--a">E</span>
                <span class="gk-chip gk-chip--b">D</span>
                <span class="gk-chip gk-chip--fill"></span>
              </div>
            </div>
            <div class="gk-slot">
              <span class="gk-slot__time">10:00</span>
              <div class="gk-chips">
                <span class="gk-chip gk-chip--a">E</span>
              </div>
            </div>
            <p class="gk-panel__note">Gerçek ürün arayüzü — mockup değil.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="sc-section gk-chapter" data-sc-act="flow" data-gk-chapter="III — Ekip">
    <div class="sc-wrap gk-spread gk-spread--split">
      <div class="gk-spread__text sc-stack" data-sc-in data-sc-stagger="70">
        <span class="gk-eyebrow">III — Ekip</span>
        <h2 class="gk-h2">Arkasında gerçek insanlar var.</h2>
        <p class="sc-body">Panel, PT'lerin işini kolaylaştırmak için var: raporları, saatleri, kapasiteyi tek yerde tutar — kağıt takvime, WhatsApp mesajına gerek kalmaz.</p>
      </div>
      <div class="gk-spread__media">
        <figure data-sc-reveal="iris" data-sc-reveal-at="0.12 0.55">
          <img src="/landing/assets/03-trainer.webp" width="1776" height="2352" alt="Bir antrenör, kollar kavuşturulmuş, loş bir salon koridorunda kameraya doğrudan bakıyor.">
        </figure>
        <p class="gk-caption">Antrenör, günün tüm derslerini tek ekrandan yönetiyor.</p>
      </div>
    </div>
  </section>

  <section id="join" class="gk-close" data-sc-act="pin" data-sc-span="1.15" data-sc-spotlight>
    <div data-sc-stage>
      <div class="gk-close__mark">
        <svg viewBox="0 0 32 32" fill="none"><path d="M17 3 L8 18 L14.5 18 L13 29 L25 13 L18 13 Z" fill="#B8F028"/></svg>
        <span>Gymkoç</span>
      </div>
      <h2 data-sc-cue="0.06" data-sc-kinetic="lines">
        <a href="/signup" class="gk-link gk-link--inline">Kendi salonunu şimdi oluştur</a>, ya da zaten bir hesabın varsa <a href="/" class="gk-link gk-link--inline" data-gk-login>giriş yap</a>.
      </h2>
      <p class="gk-close__foot">gymkoc — spor salonları için yönetim paneli. Her salon kendi markası, kendi ekibi, kendi verisiyle çalışır.</p>
    </div>
  </section>

</main>

<footer class="gk-footer">
  <div class="gk-footer__row">
    <span>© 2026 gymkoc. Tüm hakları saklıdır.</span>
    <nav class="gk-footer__links">
      <a href="/gizlilik-politikasi">Gizlilik Politikası</a>
      <a href="/kullanim-kosullari">Kullanım Koşulları</a>
      <a href="mailto:emre.korkmaz2407@gmail.com">İletişim</a>
    </nav>
  </div>
</footer>
`;

const LANDING_ASSET_ATTR = "data-landing-asset";

function ensureLandingAssets(): Promise<void> {
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

function removeLandingAssets() {
  document.head.querySelectorAll(`[${LANDING_ASSET_ATTR}]`).forEach((el) => el.remove());
}

type IntroPhase = "hold" | "leaving" | "done";

export function LandingScreen() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [introPhase, setIntroPhase] = useState<IntroPhase>(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "done" : "hold",
  );

  useEffect(() => {
    if (introPhase === "done") return;
    const toLeaving = setTimeout(() => setIntroPhase("leaving"), 500);
    const toDone = setTimeout(() => setIntroPhase("done"), 500 + 900);
    return () => {
      clearTimeout(toLeaving);
      clearTimeout(toDone);
    };
  }, [introPhase]);

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    let folioObserver: IntersectionObserver | null = null;
    let heroCloseObserver: IntersectionObserver | null = null;

    ensureLandingAssets()
      .then(() => {
        if (cancelled || !containerRef.current || !window.ScrollCraft) return;
        window.ScrollCraft.mount(containerRef.current);

        // ---- Signature move: object-to-interface hard cut ------------------
        const stage = containerRef.current.querySelector<HTMLElement>("[data-gk-object-swap]");
        const act = stage?.closest<HTMLElement>("[data-sc-act]") ?? null;
        if (stage && act) {
          const threshold = parseFloat(stage.getAttribute("data-gk-object-swap") || "0.5") || 0.5;
          const band = 0.02;
          let swapped = false;
          const tick = () => {
            const p = parseFloat(getComputedStyle(act).getPropertyValue("--sc-p")) || 0;
            if (!swapped && p > threshold + band) {
              swapped = true;
              stage.classList.add("is-swapped");
            } else if (swapped && p < threshold - band) {
              swapped = false;
              stage.classList.remove("is-swapped");
            }
            rafId = requestAnimationFrame(tick);
          };
          rafId = requestAnimationFrame(tick);
        }

        // ---- Folio: updates as chapters pass --------------------------------
        const folio = containerRef.current.querySelector<HTMLElement>("[data-gk-folio]");
        const chapters = containerRef.current.querySelectorAll<HTMLElement>("[data-gk-chapter]");
        if (folio && chapters.length) {
          folioObserver = new IntersectionObserver(
            (entries) => {
              entries.forEach((e) => {
                if (e.isIntersecting) {
                  folio.textContent = e.target.getAttribute("data-gk-chapter");
                  folio.classList.add("is-visible");
                }
              });
            },
            { rootMargin: "-45% 0px -45% 0px" },
          );
          chapters.forEach((c) => folioObserver!.observe(c));

          const hero = containerRef.current.querySelector<HTMLElement>(".gk-hero");
          const close = containerRef.current.querySelector<HTMLElement>(".gk-close");
          heroCloseObserver = new IntersectionObserver(
            (entries) => {
              entries.forEach((e) => {
                if (e.isIntersecting) folio.classList.remove("is-visible");
              });
            },
            { threshold: 0.6 },
          );
          if (hero) heroCloseObserver.observe(hero);
          if (close) heroCloseObserver.observe(close);
        }
      })
      .catch((err) => {
        console.error(err);
      });

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      folioObserver?.disconnect();
      heroCloseObserver?.disconnect();
      removeLandingAssets();
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement | null)?.closest("[data-gk-login]");
      if (!target) return;
      e.preventDefault();
      setLoginOpen(true);
    }
    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, []);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signInAtRootAndGetHandoff(email.trim(), password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.href = result.handoffUrl;
    } catch {
      setError("Bir şeyler ters gitti, tekrar dene.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div ref={containerRef} dangerouslySetInnerHTML={{ __html: LANDING_MARKUP }} />
      {loginOpen && (
        <div className="gk-login-overlay" onClick={() => setLoginOpen(false)}>
          <div className="gk-login-card" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="gk-login-close" aria-label="Kapat" onClick={() => setLoginOpen(false)}>
              ×
            </button>
            <h3>Giriş yap</h3>
            <p>E-posta ve şifreni gir — hangi salona ait olduğunu biz buluruz.</p>
            <form onSubmit={handleLogin}>
              <div className="gk-login-field">
                <label htmlFor="gk-login-email">E-posta</label>
                <input
                  id="gk-login-email"
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="gk-login-field">
                <label htmlFor="gk-login-password">Şifre</label>
                <input
                  id="gk-login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="gk-login-error">{error}</p>}
              <button type="submit" className="gk-login-submit" disabled={loading}>
                {loading ? "Giriş yapılıyor..." : "Giriş yap"}
              </button>
            </form>
          </div>
        </div>
      )}
      {introPhase !== "done" && (
        <div className={`gk-intro${introPhase === "leaving" ? " gk-intro--leaving" : ""}`} aria-hidden="true">
          <svg className="gk-intro__bolt" viewBox="0 0 32 32" fill="none">
            <path d="M17 3 L8 18 L14.5 18 L13 29 L25 13 L18 13 Z" fill="#B8F028" />
          </svg>
        </div>
      )}
    </>
  );
}

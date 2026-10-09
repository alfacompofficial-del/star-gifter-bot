import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { Shield, Truck, Headphones, ArrowRight, Send } from "lucide-react";
import { CONTACTS } from "@/lib/constants";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import heroPcImage from "@/assets/hero-pc.png";

// ── Animation helper ──────────────────────────────────
const fadeUp = (delay: number = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] as const },
});

// ── Trust badges ──────────────────────────────────────
const TRUST = [
  { icon: Shield,     label: "Гарантия" },
  { icon: Truck,      label: "Быстрая доставка" },
  { icon: Headphones, label: "Поддержка" },
];

const HeroSection = () => {
  const { exchangeRate } = useExchangeRate();
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Parallax — scroll relative to the section itself
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // Image moves slower than scroll (parallax depth)
  const imageY = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? ["0%", "0%"] : ["0%", "12%"]
  );
  // Text moves slightly faster (foreground feel)
  const textY = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? ["0%", "0%"] : ["0%", "6%"]
  );
  // Background radials move slowest
  const bgY = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? ["0%", "0%"] : ["0%", "4%"]
  );

  const scrollToCatalog = () => {
    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="home"
      ref={sectionRef}
      className="hero-root relative overflow-hidden"
    >
      {/* ── Deep background layers ──────────────────── */}
      <div className="hero-bg-base" />
      <motion.div className="hero-bg-radial-left" style={{ y: bgY }} />
      <motion.div className="hero-bg-radial-right" style={{ y: bgY }} />

      {/* Subtle grid overlay */}
      <div className="hero-grid-overlay" />

      {/* Top border line */}
      <div className="hero-top-line" />

      <div className="w-full max-w-[1540px] mx-auto px-4 sm:px-8 xl:px-12 relative z-10 flex flex-col h-full">

        {/* ── MAIN TWO-COLUMN LAYOUT ──────────────── */}
        <div className="hero-columns">

          {/* LEFT — copy (moves slightly with scroll) */}
          <motion.div className="hero-left" style={{ y: textY }}>

            {/* Top location badge */}
            <motion.div {...fadeUp(0.06)} className="flex items-center gap-2.5 mb-3.5">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0f1117] border border-white/[0.08] w-fit shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] status-dot-pulse" />
                <span className="font-mono text-[10px] text-white/60 tracking-[0.1em] uppercase">
                  Ташкент · Склад
                </span>
              </div>
              <div className="h-px flex-1 max-w-[80px] bg-gradient-to-r from-white/[0.10] to-transparent hidden sm:block" />
            </motion.div>

            {/* Headline */}
            <motion.div {...fadeUp(0.12)} className="hero-headline-wrap">
              <h1 className="hero-h1">
                <span className="hero-h1-white">Компьютеры и мониторы</span>
                <br />
                <span className="hero-h1-accent">в Ташкенте</span>
              </h1>
            </motion.div>

            {/* Sub-copy */}
            <motion.p {...fadeUp(0.18)} className="hero-sub">
              Игровые ПК, мониторы 2K/4K/OLED, комплектующие и ИБП<br className="hidden sm:block" />
              с гарантией и быстрой доставкой по Ташкенту и всему Узбекистану.
            </motion.p>

            {/* CTA */}
            <motion.div {...fadeUp(0.26)} className="hero-cta-row">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={scrollToCatalog}
                id="hero-cta-catalog"
                className="hero-cta-btn"
              >
                <span>Смотреть каталог</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>

              <motion.a
                whileTap={{ scale: 0.97 }}
                href={CONTACTS.TELEGRAM}
                target="_blank"
                rel="noopener noreferrer"
                id="hero-cta-consult"
                className="hero-cta-ghost"
              >
                <span>Консультация</span>
                <Send className="w-3.5 h-3.5" />
              </motion.a>
            </motion.div>

            {/* Trust badges */}
            <motion.div {...fadeUp(0.34)} className="hero-trust-row">
              {TRUST.map(({ icon: Icon, label }) => (
                <div key={label} className="hero-trust-item">
                  <div className="hero-trust-icon">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="hero-trust-label">{label}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* RIGHT — hardware image with parallax (moves slower = depth) */}
          <motion.div
            initial={{ opacity: 0, x: 24, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.72, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
            style={{ y: imageY }}
            className="hero-right"
          >
            <img
              src={heroPcImage}
              alt="Игровые ПК и оборудование AlfaComp.uz"
              className="hero-img"
              loading="eager"
              draggable={false}
            />

            {/* Floating rate chip */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.65 }}
              className="hero-rate-chip"
            >
              <span className="hero-rate-dot" />
              <span className="hero-rate-label">USD/UZS</span>
              <span className="hero-rate-value">{exchangeRate.toLocaleString()}</span>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

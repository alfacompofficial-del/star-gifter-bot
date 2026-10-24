import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import hardwareIntroImage from "@/assets/hardware-intro.webp";

interface HardwareIntro3DProps {
  onComplete: () => void;
}

export const INTRO_STORAGE_KEY = "alfacomp_intro_seen_v2";

export function markIntroAsViewed() {
  try {
    localStorage.setItem(INTRO_STORAGE_KEY, "1");
    sessionStorage.setItem(INTRO_STORAGE_KEY, "1");
  } catch {}
}

/**
 * Cinematic Hardware Intro Sequence
 * ─────────────────────────────────────────────────────────────
 * 0.0–0.35s: Мгновенное появление оборудования и логотипа AlfaComp.uz
 * 0.35–1.1s: Плавное движение камеры + янтарный свет по оборудованию
 * 0.9–1.5s:  Световая лазерная линия с анаморфным бликом
 * 1.8–2.2s:  Плавный кинематографичный переход в витрину магазина
 * Всего: 2.2 секунды. Запоминается навсегда (1 раз при входе).
 */
export const HardwareIntro3D: React.FC<HardwareIntro3DProps> = ({ onComplete }) => {
  const [time, setTime] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const finishedRef = useRef(false);

  // Сразу при монтировании интро фиксируем его просмотр, чтобы при любом переходе или
  // перезагрузке страницы интро НИКОГДА не повторялось повторно в домене
  useEffect(() => {
    markIntroAsViewed();
  }, []);

  const handleFinish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    markIntroAsViewed();
    setIsExiting(true);
    setTimeout(() => {
      onComplete();
    }, 350);
  }, [onComplete]);

  // Быстрый пропуск по клавишам ESC или пробел
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === " ") {
        handleFinish();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleFinish]);

  // Контроллер анимации на requestAnimationFrame
  useEffect(() => {
    const startMs = performance.now();
    let rafId: number;

    const tick = (now: number) => {
      if (finishedRef.current) return;
      const elapsedSec = (now - startMs) / 1000;
      setTime(elapsedSec);

      // Завершаем последовательность на 2.2s
      if (elapsedSec >= 2.2) {
        handleFinish();
      } else {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [handleFinish]);

  return (
    <AnimatePresence>
      {!finishedRef.current && (
        <motion.div
          key="cinematic-intro"
          initial={{ opacity: 1 }}
          animate={{ opacity: isExiting || time >= 1.8 ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[99999] bg-[#030407] select-none overflow-hidden cursor-pointer"
          onClick={handleFinish}
          role="region"
          aria-label="AlfaComp Cinematic Intro"
        >
          {/* Ambient Deep Dark Glows */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(255,90,0,0.14) 0%, transparent 70%), radial-gradient(circle at 50% 100%, #030407 0%, transparent 60%)",
            }}
          />

          {/* Precision Tech Grid */}
          <div
            className="absolute inset-0 pointer-events-none opacity-15"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />

          {/* ══════════════════════════════════════════════════════════
              HARDWARE VISUAL STAGE & CAMERA MOVEMENT
             ══════════════════════════════════════════════════════════ */}
          <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-6 md:p-10">
            {/* Cinematic Frame */}
            <motion.div
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{
                opacity: time < 0.05 ? 0 : time < 0.35 ? Math.min(time / 0.35, 1) : 1,
                scale:
                  time < 0.35
                    ? 1.05 - (time / 0.35) * 0.02
                    : 1.03 - Math.min((time - 0.35) / 1.5, 1) * 0.04,
                y: time < 0.35 ? 0 : -Math.min((time - 0.35) / 1.5, 1) * 6,
              }}
              transition={{ ease: "linear", duration: 0 }}
              className="relative w-full max-w-[1100px] h-[82vh] max-h-[760px] aspect-[16/10] rounded-2xl sm:rounded-3xl overflow-hidden border border-white/[0.08] shadow-[0_0_100px_rgba(0,0,0,0.95),0_0_40px_rgba(21,101,192,0.18)] bg-[#05070c]"
            >
              {/* Equipment Photo (WebP, loads instantly) */}
              <img
                src={hardwareIntroImage}
                alt="AlfaComp Hardware"
                className="w-full h-full object-cover object-center select-none"
                draggable={false}
              />

              {/* Edge Vignette */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse 90% 85% at 50% 50%, transparent 45%, rgba(3,4,7,0.75) 100%)",
                }}
              />

              {/* ──────────────────────────────────────────────────────────
                  0.35–1.1s: ОРАНЖЕВЫЙ СВЕТ ПРОХОДИТ ПО ЖЕЛЕЗУ
                 ────────────────────────────────────────────────────────── */}
              {time >= 0.35 && time <= 1.25 && (
                <motion.div
                  initial={{ left: "-40%", opacity: 0 }}
                  animate={{
                    left: ["-40%", "140%"],
                    opacity: [0, 0.9, 0.9, 0],
                  }}
                  transition={{
                    duration: 0.75,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                  className="absolute top-0 bottom-0 w-[45%] pointer-events-none z-20"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent 0%, rgba(21,101,192,0.10) 20%, rgba(255,90,0,0.45) 50%, rgba(255,165,0,0.6) 55%, rgba(255,90,0,0.45) 60%, transparent 100%)",
                    mixBlendMode: "screen",
                    filter: "blur(18px)",
                  }}
                />
              )}

              {/* Hardware specular glint at 0.6s */}
              {time >= 0.55 && time <= 1.15 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{
                    opacity: [0, 0.85, 0],
                    scale: [0.8, 1.2, 0.9],
                  }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="absolute top-[28%] right-[22%] w-24 h-24 rounded-full pointer-events-none z-20"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(255,200,100,0.9) 0%, rgba(255,90,0,0.4) 40%, transparent 70%)",
                    filter: "blur(8px)",
                    mixBlendMode: "screen",
                  }}
                />
              )}

              {/* ──────────────────────────────────────────────────────────
                  0.9–1.5s: СВЕТОВАЯ ЛИНИЯ ПРОХОДИТ ЧЕРЕЗ СЦЕНУ
                 ────────────────────────────────────────────────────────── */}
              {time >= 0.85 && time <= 1.55 && (
                <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
                  <motion.div
                    initial={{ top: "35%", left: "-20%", width: "0%", opacity: 0 }}
                    animate={{
                      left: ["-10%", "110%"],
                      width: ["25%", "60%", "25%"],
                      opacity: [0, 1, 1, 0],
                      top: ["35%", "52%"],
                    }}
                    transition={{
                      duration: 0.45,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="absolute h-[3px]"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent 0%, rgba(255,90,0,0.4) 20%, #ffffff 50%, rgba(255,160,0,0.5) 80%, transparent 100%)",
                      boxShadow:
                        "0 0 20px 4px rgba(255,90,0,0.9), 0 0 45px 10px rgba(255,140,0,0.4), 0 0 4px 1px #ffffff",
                    }}
                  >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-[1px] bg-white blur-[0.5px]" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-8 rounded-full bg-[#1565C0]/50 blur-md" />
                  </motion.div>
                </div>
              )}

              {/* AlfaComp.uz появляется органично с первых долей секунды (без задержки в пустоте) */}
              {time >= 0.1 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, filter: "blur(6px)" }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    filter: "blur(0px)",
                  }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-40 bg-black/40 backdrop-blur-[2px]"
                >
                  {/* Glowing backdrop halo */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: [0, 0.6, 0.4], scale: [0.5, 1.2, 1] }}
                    transition={{ duration: 0.4 }}
                    className="absolute w-72 h-36 rounded-full bg-[#1565C0]/30 blur-3xl pointer-events-none"
                  />

                  {/* Brand Typography */}
                  <motion.div
                    initial={{ letterSpacing: "0.1em", y: 6 }}
                    animate={{ letterSpacing: "-0.03em", y: 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="relative flex items-center justify-center"
                  >
                    <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-[-0.03em] drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)]">
                      Alfa<span className="text-[#1565C0] drop-shadow-[0_0_35px_rgba(255,90,0,0.8)]">Comp</span>
                      <span className="text-white/40 text-2xl sm:text-4xl font-light">.uz</span>
                    </h1>
                  </motion.div>

                  {/* Subtitle */}
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: 0.08 }}
                    className="flex items-center gap-2 mt-2 font-mono text-[10px] sm:text-xs tracking-[0.28em] uppercase text-white/80 font-bold"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1565C0] animate-ping" />
                    <span>HIGH-PERFORMANCE HARDWARE</span>
                    <span className="text-[#1565C0]">//</span>
                    <span>ТАШКЕНТ</span>
                  </motion.div>
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Top Skip Button & ESC indicator */}
          <div className="absolute top-5 sm:top-7 right-5 sm:right-8 z-50">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFinish();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 border border-white/15 hover:border-white/30 text-[11px] font-mono text-white/70 hover:text-white transition-all uppercase tracking-wider backdrop-blur-md shadow-lg"
              title="Пропустить (ESC или пробел)"
            >
              <span>ПРОПУСТИТЬ</span>
              <span className="text-white/40 text-[9px] hidden sm:inline">[ESC]</span>
              <X className="w-3.5 h-3.5 text-white/60 ml-0.5" />
            </button>
          </div>

          {/* Bottom Fast Progress Indicator */}
          <div className="absolute bottom-5 inset-x-0 flex justify-center pointer-events-none z-50">
            <div className="w-36 sm:w-48 h-[2px] bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1565C0] shadow-[0_0_10px_#1565C0] transition-all duration-75"
                style={{ width: `${Math.min((time / 2.2) * 100, 100)}%` }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default HardwareIntro3D;

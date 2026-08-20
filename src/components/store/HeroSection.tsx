import { motion } from "framer-motion";
import { Send, Zap, ChevronRight, ShieldCheck } from "lucide-react";
import { CONTACTS } from "@/lib/constants";

import heroPcImage from "@/assets/hero-pc.png";

const HeroSection = () => {
  const scrollToCatalog = () => {
    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="home" className="min-h-screen flex items-center pt-24 pb-12 relative overflow-hidden mesh-bg">
      {/* Glow effects */}
      <div className="absolute top-1/4 right-0 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-[#00f2ff]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] bg-[#ff0080]/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="container relative z-10 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 sm:gap-10 lg:gap-8 items-center">
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.8, 0.25, 1] }}
            className="order-2 lg:order-1"
          >
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full glass border-[#00f2ff]/30 mb-5 sm:mb-8">
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00f2ff]" />
              <span className="text-[11px] sm:text-sm font-bold text-white/90">Официальный поставщик в Узбекистане</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-5 sm:mb-8">
              Создай свою <br />
              <span className="relative inline-block mt-2">
                <span className="absolute -inset-1 bg-gradient-to-r from-[#00f2ff]/40 to-[#ff0080]/40 blur-xl opacity-50"></span>
                <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-[#00f2ff] via-[#009dff] to-[#ff0080]">Мечту</span>
              </span>
            </h1>
            
            <p className="text-sm sm:text-base lg:text-lg text-white/60 mb-7 sm:mb-10 max-w-xl leading-relaxed font-medium">
              Eng zor kompyuterlar, monitorlar, UPS, Wi-Fi routerlar va elektronikalar. 
              Премиальная электроника — мониторы 144–320 Гц, Wi-Fi 6/7, SSD NVMe, мощные видеокарты с официальной гарантией.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8 sm:mb-12">
              <button
                onClick={scrollToCatalog}
                className="group flex items-center justify-center gap-2 bg-gradient-to-r from-[#00f2ff] to-[#009dff] text-black px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-black text-sm sm:text-base transition-all hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(0,242,255,0.4)]"
              >
                В каталог товаров
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <a
                href={CONTACTS.TELEGRAM}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 glass px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-bold text-sm sm:text-base hover:bg-white/10 hover:border-white/20 transition-all group"
              >
                <Send className="w-4 h-4 sm:w-5 sm:h-5 text-[#00f2ff] group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                Связаться в TG
              </a>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-6 pt-5 sm:pt-6 border-t border-white/10">
              {[
                { value: "80+", label: "Товаров" },
                { value: "1 Год", label: "Гарантия" },
                { value: "24/7", label: "Поддержка" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-xl sm:text-2xl lg:text-3xl font-black text-white">{s.value}</div>
                  <div className="text-[10px] sm:text-xs font-semibold text-[#00f2ff] uppercase tracking-wider mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, rotate: -5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.25, 0.8, 0.25, 1] }}
            className="order-1 lg:order-2 relative"
          >
            {/* Decorative background elements behind image */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#00f2ff]/20 to-[#ff0080]/20 rounded-3xl blur-2xl transform rotate-6 scale-105" />
            
            <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 bg-card/50 backdrop-blur-sm p-2 sm:p-4 shadow-2xl shadow-black/50">
              <div className="absolute top-4 right-4 sm:top-8 sm:right-8 z-20 flex items-center gap-1.5 sm:gap-2 bg-black/60 backdrop-blur-md border border-white/10 text-white px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-sm font-bold shadow-xl">
                <ShieldCheck className="w-3 h-3 sm:w-4 sm:h-4 text-[#00f2ff]" />
                Оригинал 100%
              </div>
              
              <img
                src={heroPcImage}
                alt="Premium PC Setup"
                className="w-full h-auto rounded-xl sm:rounded-2xl object-cover aspect-[4/3] transform transition-transform duration-700 hover:scale-105"
              />
              
              <div className="absolute bottom-4 left-4 sm:bottom-8 sm:left-8 z-20 glass px-3 sm:px-6 py-2 sm:py-4 rounded-xl sm:rounded-2xl border-white/20 shadow-2xl">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-[#ff0080] to-purple-600 flex items-center justify-center text-white font-black text-base sm:text-xl">
                    🔥
                  </div>
                  <div>
                    <div className="text-[9px] sm:text-xs font-bold text-white/60 uppercase tracking-wider mb-0.5 sm:mb-1">Хит продаж</div>
                    <div className="text-sm sm:text-lg font-black text-white">Игровые сборки</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

import { motion } from "framer-motion";
import { Send } from "lucide-react";
import { CONTACTS } from "@/lib/constants";

const HeroSection = () => {
  const scrollToCatalog = () => {
    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="home" className="min-h-screen flex items-center pt-20 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-radial-glow pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

      <div className="container relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold text-primary bg-primary/10 border border-primary/30 mb-6">
              ⚡ Официальный поставщик
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.1] mb-6 tracking-tight">
              Премиальная Электроника в{" "}
              <span className="text-primary drop-shadow-[0_0_30px_hsl(185_100%_50%/0.3)]">
                Узбекистане
              </span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-lg">
              ИБП Ion, игровые мониторы 144–320 Гц, Wi-Fi 6/7 роутеры, SSD NVMe, RTX 50xx — всё в наличии с официальной гарантией.
            </p>

            <div className="flex gap-8 mb-8">
              {[
                { value: "80+", label: "Товаров" },
                { value: "9–19", label: "Поддержка" },
              ].map((s) => (
                <div key={s.label} className="flex flex-col">
                  <span className="text-2xl sm:text-3xl font-extrabold text-primary">{s.value}</span>
                  <span className="text-xs text-muted-foreground mt-1">{s.label}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={scrollToCatalog}
                className="bg-primary text-primary-foreground px-8 py-3.5 rounded-xl font-bold text-sm hover:scale-105 transition-transform glow-primary"
              >
                В каталог
              </button>
              <a
                href={CONTACTS.TELEGRAM}
                target="_blank"
                rel="noopener noreferrer"
                className="glass glass-hover rounded-xl px-8 py-3.5 font-semibold text-sm flex items-center gap-2 hover:border-primary transition-all"
              >
                <Send className="w-4 h-4" />
                Связаться
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="hidden lg:block"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl group">
              <img
                src="https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?auto=format&fit=crop&q=80&w=800"
                alt="Электроника"
                className="w-full h-auto transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute top-4 right-4 bg-accent text-accent-foreground px-4 py-1.5 rounded-full text-sm font-semibold shadow-lg">
                🔥 Хит продаж
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

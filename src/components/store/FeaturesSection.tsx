import { useRef, useEffect } from "react";
import { ShieldCheck, Truck, CreditCard, Headphones } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: ShieldCheck,
    title: "Официальная гарантия",
    desc: "Все поставляемые товары сертифицированы и имеют гарантию от 12 до 36 месяцев.",
    code: "SEC-01",
    accent: "rgba(34,197,94,0.12)",
    accentBorder: "rgba(34,197,94,0.20)",
    iconColor: "text-[#22c55e]",
  },
  {
    icon: Truck,
    title: "Доставка оборудования",
    desc: "Доставка по Ташкенту в день заказа, отправка по регионам Узбекистана от 1 до 3 дней.",
    code: "LOG-02",
    accent: "rgba(255,90,0,0.10)",
    accentBorder: "rgba(255,90,0,0.18)",
    iconColor: "text-[#FF5A00]",
  },
  {
    icon: CreditCard,
    title: "Удобная оплата",
    desc: "Наличный расчет, Uzcard / Humo, Click, Payme и безналичный расчет для организаций.",
    code: "FIN-03",
    accent: "rgba(99,102,241,0.10)",
    accentBorder: "rgba(99,102,241,0.18)",
    iconColor: "text-indigo-400",
  },
  {
    icon: Headphones,
    title: "Консультация специалистов",
    desc: "Помощь в подборе комплектующих, мониторов и ИБП под конкретные задачи и бюджет.",
    code: "SUP-04",
    accent: "rgba(14,165,233,0.10)",
    accentBorder: "rgba(14,165,233,0.18)",
    iconColor: "text-sky-400",
  },
];

const FeaturesSection = () => {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight + 150) {
      el.classList.add("in-view");
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("in-view");
          observer.disconnect();
        }
      },
      { threshold: 0, rootMargin: "80px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="features"
      ref={sectionRef}
      className="py-14 sm:py-20 relative border-t border-white/[0.05] reveal-section"
    >
      <div className="container px-4 sm:px-6 relative z-10">

        {/* Header */}
        <div className="mb-10 max-w-xl">
          <div className="text-label text-[#FF5A00] mb-2 flex items-center gap-2">
            <span className="w-3 h-px bg-[#FF5A00]" />
            УСЛОВИЯ И НАДЁЖНОСТЬ
          </div>
          <h2 className="text-[1.75rem] sm:text-[2.1rem] font-bold tracking-tight text-white mb-2">
            Почему выбирают AlfaComp
          </h2>
          <p className="text-[13px] sm:text-[14px] text-white/45 leading-relaxed font-normal">
            Прозрачные условия поставки, официальная гарантия и оперативная техническая поддержка.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.45, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
              className="group relative bg-[#0f1117] rounded-xl border border-white/[0.07]
                hover:border-white/[0.14] transition-all duration-250 flex flex-col
                overflow-hidden hover:-translate-y-1
                hover:shadow-[0_12px_40px_rgba(0,0,0,0.40)]"
            >
              {/* Top hairline */}
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.11] to-transparent pointer-events-none" />

              {/* Subtle accent bg on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none rounded-xl"
                style={{ background: `radial-gradient(ellipse 80% 70% at 10% 0%, ${f.accent}, transparent 70%)` }}
              />

              <div className="relative p-5 flex flex-col justify-between flex-1">
                {/* Icon & code */}
                <div className="flex items-start justify-between mb-5">
                  <div
                    className="w-10 h-10 rounded-lg border flex items-center justify-center
                      transition-transform duration-250 group-hover:scale-105"
                    style={{ background: f.accent, borderColor: f.accentBorder }}
                  >
                    <f.icon className={`w-5 h-5 ${f.iconColor}`} />
                  </div>
                  <span className="text-data text-[9px] text-white/22 tracking-[0.1em]">
                    {f.code}
                  </span>
                </div>

                <div>
                  <h3 className="text-[14px] font-bold text-white mb-2 tracking-tight leading-snug
                    group-hover:text-white transition-colors">
                    {f.title}
                  </h3>
                  <p className="text-[12px] text-white/45 leading-relaxed font-normal">
                    {f.desc}
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-white/[0.05] flex items-center justify-between">
                  <span className="text-data text-[9px] text-white/22 tracking-[0.08em]">ALFACOMP STANDARD</span>
                  <span className="text-data text-[9px] text-white/22">✓</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;

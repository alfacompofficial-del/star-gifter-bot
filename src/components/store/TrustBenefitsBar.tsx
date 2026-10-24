import { ShieldCheck, CreditCard, Truck, Headphones } from "lucide-react";
import { motion } from "framer-motion";

const BENEFITS = [
  {
    icon: ShieldCheck,
    title: "Оригинальная продукция",
    desc: "Только сертифицированные бренды и официальные поставки",
  },
  {
    icon: CreditCard,
    title: "Удобная оплата",
    desc: "Наличные, карты и в рассрочку",
  },
  {
    icon: Truck,
    title: "Доставка по Узбекистану",
    desc: "Быстро и надежно",
  },
  {
    icon: Headphones,
    title: "Профессиональная поддержка",
    desc: "Консультации и помощь в выборе",
  },
];

const TrustBenefitsBar = () => {
  return (
    <section className="w-full max-w-[1540px] mx-auto px-4 sm:px-8 xl:px-12 py-10 border-t border-white/[0.06]">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {BENEFITS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.06 }}
              className="flex items-center gap-4 p-4 rounded-2xl bg-[#0a1222]/50 border border-white/[0.06] hover:border-[#0066ff]/30 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-[#0066ff]/10 border border-[#0066ff]/25 flex items-center justify-center shrink-0">
                <Icon className="w-6 h-6 text-[#3b82f6]" strokeWidth={1.75} />
              </div>
              <div className="flex flex-col text-left">
                <h4 className="text-[14px] font-bold text-white leading-snug">
                  {item.title}
                </h4>
                <p className="text-[12px] text-white/50 leading-relaxed mt-0.5">
                  {item.desc}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default TrustBenefitsBar;

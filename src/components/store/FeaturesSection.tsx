import { ShieldCheck, Truck, CreditCard, Headset } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  { icon: ShieldCheck, title: "Официальная гарантия", desc: "Все товары сертифицированы и имеют гарантию производителя" },
  { icon: Truck, title: "Быстрая доставка", desc: "Доставка по Ташкенту за 1 день, по Узбекистану — до 3 дней" },
  { icon: CreditCard, title: "Удобная оплата", desc: "Наличные, карта, Click, Payme, Uzumbank" },
  { icon: Headset, title: "Поддержка 9:00–19:00", desc: "Консультации в Telegram и по телефону" },
];

const FeaturesSection = () => (
  <section className="py-20 bg-muted/30">
    <div className="container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <span className="text-xs font-semibold uppercase tracking-[2px] text-primary">Почему мы</span>
        <h2 className="text-3xl sm:text-4xl font-extrabold mt-2 text-gradient">Наши преимущества</h2>
      </motion.div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="glass glass-hover rounded-2xl p-8 text-center group transition-all hover:-translate-y-2"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all group-hover:scale-110">
              <f.icon className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold mb-2">{f.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;

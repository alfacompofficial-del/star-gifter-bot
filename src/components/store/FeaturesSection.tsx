import { ShieldCheck, Truck, CreditCard, Headset } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  { icon: ShieldCheck, title: "Официальная гарантия", desc: "Все товары сертифицированы и имеют гарантию производителя от 1 до 3 лет." },
  { icon: Truck, title: "Быстрая доставка", desc: "Доставка по Ташкенту в день заказа, по всему Узбекистану — от 1 до 3 дней." },
  { icon: CreditCard, title: "Удобная оплата", desc: "Принимаем наличные, карты Uzcard/Humo, Click, Payme, Apelsin." },
  { icon: Headset, title: "Поддержка 24/7", desc: "Профессиональные консультации в Telegram и по телефону в любое время." },
];

const FeaturesSection = () => (
  <section id="features" className="py-16 sm:py-24 relative overflow-hidden">
    {/* Background elements */}
    <div className="absolute top-1/2 left-0 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-[#00f2ff]/5 rounded-full blur-[100px] -translate-y-1/2 pointer-events-none" />
    <div className="absolute top-1/2 right-0 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-[#ff0080]/5 rounded-full blur-[100px] -translate-y-1/2 pointer-events-none" />
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/80 to-transparent pointer-events-none" />

    <div className="container px-4 sm:px-6 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-10 sm:mb-16"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 mb-4">
          <ShieldCheck className="w-4 h-4 text-[#00f2ff]" />
          <span className="text-xs font-bold text-white/80 uppercase tracking-widest">Надежность</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mt-2 text-white">Почему выбирают нас</h2>
        <p className="text-white/50 text-sm sm:text-lg max-w-2xl mx-auto font-medium mt-3 sm:mt-4">
          Мы предоставляем лучший сервис и оригинальную продукцию для наших клиентов по всему Узбекистану.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className="group relative"
          >
            {/* Hover card effect background */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#00f2ff]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl sm:rounded-3xl blur-xl" />
            
            <div className="relative h-full glass rounded-2xl sm:rounded-3xl p-6 sm:p-8 border-white/5 hover:border-[#00f2ff]/30 transition-all duration-300 z-10 flex flex-col items-center text-center">
              <div className="relative mb-5 sm:mb-8 group-hover:scale-110 transition-transform duration-500">
                <div className="absolute inset-0 bg-[#00f2ff]/20 rounded-2xl blur-md" />
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#00f2ff] to-[#009dff] flex items-center justify-center relative z-10 shadow-lg shadow-[#00f2ff]/30 border border-white/20">
                  <f.icon className="w-6 h-6 sm:w-8 sm:h-8 text-black" />
                </div>
              </div>
              
              <h3 className="text-lg sm:text-xl font-black text-white mb-2 sm:mb-3 group-hover:text-[#00f2ff] transition-colors">
                {f.title}
              </h3>
              <p className="text-xs sm:text-sm text-white/50 leading-relaxed font-medium">{f.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;

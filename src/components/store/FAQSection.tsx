import { useState } from "react";
import { ChevronDown, MessageCircleQuestion } from "lucide-react";
import { motion } from "framer-motion";
import { FAQ_DATA } from "@/lib/constants";

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-16 sm:py-24 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[800px] h-[400px] sm:h-[800px] bg-[#00f2ff]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="container px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 sm:mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 mb-4">
            <MessageCircleQuestion className="w-4 h-4 text-[#ff0080]" />
            <span className="text-xs font-bold text-white/80 uppercase tracking-widest">Ответы</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mt-2 text-white">
            Часто задаваемые вопросы
          </h2>
        </motion.div>

        <div className="max-w-3xl mx-auto space-y-3 sm:space-y-4">
          {FAQ_DATA.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={`glass rounded-xl sm:rounded-2xl overflow-hidden border transition-all duration-300 ${
                openIndex === i
                  ? "border-[#00f2ff]/30 shadow-[0_0_30px_rgba(0,242,255,0.1)]"
                  : "border-white/5 hover:border-white/20"
              }`}
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                aria-expanded={openIndex === i}
                className="w-full flex items-center justify-between p-4 sm:p-6 text-left font-bold text-sm sm:text-base hover:bg-white/5 transition-colors group"
              >
                <span className={`transition-colors pr-4 leading-snug ${openIndex === i ? "text-[#00f2ff]" : "text-white group-hover:text-[#00f2ff]"}`}>
                  {item.question}
                </span>
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                  openIndex === i
                    ? "bg-[#00f2ff]/20 text-[#00f2ff]"
                    : "bg-white/5 text-white/50 group-hover:bg-white/10"
                }`}>
                  <ChevronDown className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 ${openIndex === i ? "rotate-180" : ""}`} />
                </div>
              </button>
              <div className={`overflow-hidden transition-all duration-500 ease-in-out ${openIndex === i ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
                <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2">
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-3 sm:mb-4" />
                  <p className="text-xs sm:text-sm text-white/60 whitespace-pre-line leading-relaxed font-medium">
                    {item.answer}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;

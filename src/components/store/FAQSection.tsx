import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FAQ_DATA } from "@/lib/constants";

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-14 sm:py-20 relative border-t border-white/[0.05]">
      <div className="container px-4 sm:px-6 relative z-10">

        {/* Header */}
        <div className="text-center mb-10 max-w-xl mx-auto">
          <div className="text-label text-[#FF5A00] mb-2 flex items-center justify-center gap-2">
            <span className="w-3 h-px bg-[#FF5A00]" />
            СПРАВОЧНЫЙ ЦЕНТР
            <span className="w-3 h-px bg-[#FF5A00]" />
          </div>
          <h2 className="text-[1.75rem] sm:text-[2.1rem] font-bold tracking-tight text-white mb-2">
            Частые вопросы
          </h2>
          <p className="text-[13px] text-white/45">
            О доставке, гарантии, способах оплаты и оформлении заказа.
          </p>
        </div>

        {/* Accordion */}
        <div className="max-w-2xl mx-auto space-y-2">
          {FAQ_DATA.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.35, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                className={`rounded-xl border overflow-hidden transition-all duration-200 ${
                  isOpen
                    ? "border-[#FF5A00]/30 bg-[#0f1117]"
                    : "border-white/[0.07] bg-[#0f1117] hover:border-white/[0.12]"
                }`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left group"
                >
                  <span className={`pr-4 text-[13px] sm:text-[14px] font-semibold leading-snug tracking-tight transition-colors ${
                    isOpen ? "text-[#FF5A00]" : "text-white group-hover:text-white"
                  }`}>
                    {item.question}
                  </span>

                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-200 ${
                    isOpen
                      ? "bg-[#FF5A00]/12 border-[#FF5A00]/25 text-[#FF5A00]"
                      : "bg-[#181B22] border-white/[0.09] text-white/40 group-hover:text-white/70"
                  }`}>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-250 ${isOpen ? "rotate-180" : ""}`} />
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                      style={{ overflow: "hidden" }}
                    >
                      <div className="px-4 sm:px-5 pb-4 sm:pb-5">
                        <div className="h-px w-full bg-white/[0.05] mb-3" />
                        <p className="text-[12.5px] text-white/55 whitespace-pre-line leading-relaxed font-normal">
                          {item.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;

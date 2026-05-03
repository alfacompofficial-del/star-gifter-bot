import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { FAQ_DATA } from "@/lib/constants";

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-20">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-xs font-semibold uppercase tracking-[2px] text-primary">FAQ</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold mt-2 text-gradient">Часто задаваемые вопросы</h2>
        </motion.div>
        <div className="max-w-2xl mx-auto space-y-3">
          {FAQ_DATA.map((item, i) => (
            <div key={i} className="glass rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left font-semibold text-sm hover:bg-[hsl(var(--glass-hover))] transition-colors"
              >
                {item.question}
                <ChevronDown
                  className={`w-5 h-5 text-muted-foreground transition-transform ${
                    openIndex === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === i ? "max-h-60 pb-5 px-5" : "max-h-0"
                }`}
              >
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {item.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;

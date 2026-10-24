import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import compImg from "@/assets/categories/components.png";
import monImg from "@/assets/categories/monitors.png";
import cpuImg from "@/assets/categories/processors.png";
import gpuImg from "@/assets/categories/videocards.png";
import ramImg from "@/assets/categories/ram.png";
import ssdImg from "@/assets/categories/ssd.png";
import mouseImg from "@/assets/categories/peripherals.png";
import accImg from "@/assets/categories/accessories.png";

interface PopularCategoriesProps {
  onSelectCategory?: (category: string) => void;
}

const CATEGORIES = [
  {
    slug: "Комплектующие",
    label: "Комплектующие",
    img: compImg,
  },
  {
    slug: "Мониторы",
    label: "Мониторы",
    img: monImg,
  },
  {
    slug: "Процессоры",
    label: "Процессоры",
    img: cpuImg,
  },
  {
    slug: "Видеокарты",
    label: "Видеокарты",
    img: gpuImg,
  },
  {
    slug: "Оперативная память",
    label: "Оперативная память",
    img: ramImg,
  },
  {
    slug: "SSD",
    label: "SSD",
    img: ssdImg,
  },
  {
    slug: "Мышки",
    label: "Мышки",
    img: mouseImg,
  },
  {
    slug: "Аксессуары",
    label: "Аксессуары",
    img: accImg,
  },
];

const PopularCategories = ({ onSelectCategory }: PopularCategoriesProps) => {
  const handleClick = (catSlug: string) => {
    if (onSelectCategory) {
      onSelectCategory(catSlug);
    } else {
      window.dispatchEvent(new CustomEvent("select-category", { detail: catSlug }));
    }
    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="w-full max-w-[1540px] mx-auto px-4 sm:px-8 xl:px-12 py-4">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3.5">
        <h2 className="text-[17px] sm:text-[19px] font-bold text-white tracking-tight">
          Популярные категории
        </h2>
        <button
          onClick={() => {
            if (onSelectCategory) onSelectCategory("all");
            document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
          }}
          className="flex items-center gap-1.5 text-[12px] sm:text-[13px] text-[#0066ff] hover:text-[#3b82f6] font-medium transition-colors cursor-pointer"
        >
          <span>Все категории</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Sleek compact 8-card single row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
        {CATEGORIES.map(({ slug, label, img }, i) => (
          <motion.div
            key={slug}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.25, delay: i * 0.02 }}
          >
            <div
              onClick={() => handleClick(slug)}
              className="group flex flex-col items-center justify-between cursor-pointer rounded-xl sm:rounded-2xl bg-[#0a1224] border border-white/[0.08] hover:border-[#0066ff]/60 hover:bg-[#0e1a33] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(0,102,255,0.25)] p-2.5 sm:p-3 h-full min-h-[110px] sm:min-h-[125px]"
            >
              {/* Crisp Artwork Box */}
              <div className="w-full h-14 sm:h-16 flex items-center justify-center overflow-hidden rounded-lg bg-[#070e1b]/80 border border-white/[0.04]">
                <img
                  src={img}
                  alt={label}
                  className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder.svg";
                  }}
                />
              </div>

              {/* Category label */}
              <span className="text-[11px] sm:text-[12px] font-semibold text-white/85 group-hover:text-white text-center mt-2 line-clamp-1 transition-colors">
                {label}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default PopularCategories;

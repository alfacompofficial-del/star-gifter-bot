import React, { useState } from "react";
import { Star, CheckCircle2, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useProductRating } from "@/hooks/useProductRating";

interface ProductRatingWidgetProps {
  productId: number;
  initialRating?: number | null;
  initialRatingCount?: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const ProductRatingWidget: React.FC<ProductRatingWidgetProps> = ({
  productId,
  initialRating,
  initialRatingCount,
  size = "md",
  className = "",
}) => {
  const { userRating, averageRating, ratingCount, isSubmitting, submitRating } =
    useProductRating({ productId, initialRating, initialRatingCount });

  const [hoverRating, setHoverRating] = useState<number | null>(null);
  // Whether user clicked "изменить" to re-vote
  const [isChanging, setIsChanging] = useState(false);

  const starSizeClass = size === "sm" ? "w-3.5 h-3.5" : size === "lg" ? "w-6 h-6" : "w-4 h-4";

  // Stars are interactive only if: no vote yet OR user opened change-mode
  const canVote = !userRating || isChanging;

  const handleStarClick = async (starIndex: number) => {
    if (!canVote || isSubmitting) return;
    await submitRating(starIndex);
    setIsChanging(false);
  };

  return (
    <div className={`rounded-xl bg-[#0e1118]/80 border border-white/[0.08] p-3.5 sm:p-4 backdrop-blur-md ${className}`}>
      {/* Average display row */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight">
              {averageRating.toFixed(1)}
            </span>
            <span className="text-[11px] font-mono text-white/40">/ 5.0</span>
          </div>
          <div className="flex items-center gap-0.5 text-amber-400 ml-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={`w-3.5 h-3.5 ${
                  averageRating >= i - 0.2
                    ? "fill-amber-400 text-amber-400"
                    : "text-white/20 fill-white/[0.05]"
                }`}
              />
            ))}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] font-mono text-white/60">
            {ratingCount > 0
              ? `${ratingCount} ${ratingCount === 1 ? "оценка" : ratingCount < 5 ? "оценки" : "оценок"}`
              : "Пока нет оценок"}
          </div>
          <div className="text-[9px] font-mono text-white/30 uppercase tracking-wider">
            AlfaComp Рейтинг
          </div>
        </div>
      </div>

      {/* Interactive voting bar */}
      <div className="pt-2.5 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono text-white/50">
            {userRating && !isChanging ? "Ваша оценка:" : "Оценить товар:"}
          </span>
          <div className="flex items-center gap-1" onMouseLeave={() => setHoverRating(null)}>
            {[1, 2, 3, 4, 5].map((starIndex) => {
              const activeScore = canVote
                ? (hoverRating ?? userRating ?? 0)
                : (userRating ?? 0);
              const isStarActive = activeScore >= starIndex;
              return (
                <motion.button
                  key={starIndex}
                  type="button"
                  whileHover={canVote ? { scale: 1.25 } : {}}
                  whileTap={canVote ? { scale: 0.9 } : {}}
                  disabled={!canVote || isSubmitting}
                  onMouseEnter={() => canVote && setHoverRating(starIndex)}
                  onClick={() => handleStarClick(starIndex)}
                  className={`p-1 -m-1 focus:outline-none transition-colors group ${canVote ? "cursor-pointer" : "cursor-default"}`}
                  title={canVote ? `Поставить ${starIndex} из 5 звёзд` : `Ваша оценка: ${userRating} ★`}
                >
                  <Star
                    className={`${starSizeClass} transition-all duration-150 ${
                      isStarActive
                        ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                        : canVote
                        ? "text-white/30 fill-transparent group-hover:text-amber-400/60"
                        : "text-white/20 fill-white/[0.05]"
                    }`}
                  />
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Status badge */}
        <AnimatePresence mode="wait">
          {userRating && !isChanging ? (
            <motion.div
              key="voted"
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span>Вы поставили {userRating} ★</span>
              </div>
              <button
                onClick={() => setIsChanging(true)}
                className="flex items-center gap-1 text-[9px] font-mono text-white/30 hover:text-white/60 transition-colors"
                title="Изменить оценку"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                <span>изменить</span>
              </button>
            </motion.div>
          ) : isChanging ? (
            <motion.div
              key="changing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <span className="text-[10px] font-mono text-amber-400/70">
                Выберите новую оценку
              </span>
              <button
                onClick={() => { setIsChanging(false); setHoverRating(null); }}
                className="text-[9px] font-mono text-white/30 hover:text-white/60 transition-colors"
              >
                отмена
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="no-vote"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[10px] font-mono text-white/35"
            >
              Нажмите на звезду для оценки
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ProductRatingWidget;

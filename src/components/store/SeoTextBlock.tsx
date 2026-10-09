import React from "react";
import { Cpu, Monitor, ShieldCheck, Truck } from "lucide-react";

const SeoTextBlock: React.FC = () => {
  return (
    <section className="py-12 sm:py-16 bg-[#090A0D] border-t border-white/[0.05] relative text-white/70">
      <div className="container px-4 sm:px-6 max-w-5xl mx-auto">
        {/* H2 Title */}
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 tracking-tight">
          Интернет-магазин компьютеров и мониторов в Ташкенте — AlfaComp.uz
        </h2>

        <p className="text-xs sm:text-sm leading-relaxed mb-6 text-white/60">
          Добро пожаловать в <strong className="text-white">AlfaComp.uz</strong> — ваш надежный компьютерный магазин в Ташкенте! Мы специализируемся на продаже игровых и офисных компьютеров, современных мониторов высокого разрешения, источников бесперебойного питания (ИБП) и комплектующих для ПК с доставкой по всему Узбекистану.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
          <div className="p-4 rounded-xl bg-[#0F1117] border border-white/[0.07]">
            <div className="flex items-center gap-2 mb-2 text-[#FF5A00] font-semibold text-sm sm:text-base">
              <Cpu className="w-4 h-4" />
              <h3>Сборка и продажа компьютеров в Ташкенте</h3>
            </div>
            <p className="text-xs leading-relaxed text-white/55">
              Ищете где купить мощный игровой ПК или надежный компьютер для офиса и работы с 3D-графикой? В AlfaComp вы можете заказать индивидуальную сборку ПК на базе новейших процессоров Intel Core и AMD Ryzen, а также видеокарт NVIDIA GeForce RTX 5070 и RTX 40-серии. Каждая система проходит обязательное стресс-тестирование и имеет официальную гарантию.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0F1117] border border-white/[0.07]">
            <div className="flex items-center gap-2 mb-2 text-[#FF5A00] font-semibold text-sm sm:text-base">
              <Monitor className="w-4 h-4" />
              <h3>Игровые и профессиональные мониторы</h3>
            </div>
            <p className="text-xs leading-relaxed text-white/55">
              У нас представлен широкий выбор мониторов от ведущих мировых брендов: <strong className="text-white/80">MSI, ASUS ROG, Dell Alienware, LG, BenQ и Samsung</strong>. В наличии модели с частотой обновления от 144 Гц до 360 Гц, матрицы Fast IPS и OLED, разрешения Full HD, 2K QHD и 4K UHD для киберспорта, дизайна и ежедневной работы.
            </p>
          </div>
        </div>

        <h3 className="text-base sm:text-lg font-bold text-white mb-3">
          Почему клиенты выбирают AlfaComp в Узбекистане:
        </h3>

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-white/60 mb-6">
          <li className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />
            <span><strong>Официальная гарантия:</strong> На все товары предоставляется гарантийное обслуживание от 12 до 36 месяцев.</span>
          </li>
          <li className="flex items-start gap-2">
            <Truck className="w-4 h-4 text-[#FF5A00] shrink-0 mt-0.5" />
            <span><strong>Быстрая доставка:</strong> Доставка по Ташкенту в день заказа, экспресс-доставка в Самарканд, Бухару, Фергану и все регионы РУз.</span>
          </li>
        </ul>

        <p className="text-xs text-white/40 leading-relaxed">
          Теги: купить компьютер Ташкент, игровые ПК Узбекистан, купить монитор MSI ASUS Dell в Ташкенте, видеокарты RTX, ИБП Ion, компьютерные комплектующие в Ташкенте по лучшим ценам.
        </p>
      </div>
    </section>
  );
};

export default SeoTextBlock;

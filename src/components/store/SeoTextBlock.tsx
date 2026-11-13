import React from "react";
import { Link } from "react-router-dom";
import { Cpu, Monitor, ShieldCheck, MapPin, Zap } from "lucide-react";

const SeoTextBlock: React.FC = () => {
  return (
    <section className="py-12 sm:py-16 bg-[#090A0D] border-t border-white/[0.05] relative text-white/70">
      <div className="container px-4 sm:px-6 max-w-5xl mx-auto">
        {/* H2 Title */}
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 tracking-tight">
          Интернет-магазин компьютеров и мониторов в Ташкенте — AlfaComp.uz
        </h2>

        <p className="text-xs sm:text-sm leading-relaxed mb-6 text-white/60">
          Добро пожаловать в <strong className="text-white">AlfaComp.uz</strong> — ваш надежный компьютерный магазин в Ташкенте! Мы специализируемся на продаже игровых и офисных компьютеров, современных мониторов высокого разрешения, источников бесперебойного питания (ИБП) и комплектующих для ПК. Наш магазин находится в Ташкенте (базар «Малика», блок А27). — <em>Toshkentdagi kompyuter do'koni: o'yin kompyuterlari, monitorlar, komplektuyuvchilar va UPS («Malika» bozori, A27 blok).</em>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
          <div className="p-4 rounded-xl bg-[#0F1117] border border-white/[0.07]">
            <div className="flex items-center gap-2 mb-2 text-[#1565C0] font-semibold text-sm sm:text-base">
              <Cpu className="w-4 h-4" />
              <h3>Сборка и продажа компьютеров в Ташкенте</h3>
            </div>
            <p className="text-xs leading-relaxed text-white/55">
              Ищете где купить мощный игровой ПК или надежный компьютер для офиса и работы с 3D-графикой? В AlfaComp вы можете заказать индивидуальную сборку ПК на базе новейших процессоров Intel Core и AMD Ryzen, а также видеокарт NVIDIA GeForce RTX 5070 и RTX 40-серии. Каждая система проходит обязательное стресс-тестирование и имеет официальную гарантию. <Link to="/category/computers" className="text-[#1565C0] hover:underline">Смотреть компьютеры →</Link>
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0F1117] border border-white/[0.07]">
            <div className="flex items-center gap-2 mb-2 text-[#1565C0] font-semibold text-sm sm:text-base">
              <Monitor className="w-4 h-4" />
              <h3>Игровые и профессиональные мониторы</h3>
            </div>
            <p className="text-xs leading-relaxed text-white/55">
              У нас представлен широкий выбор мониторов от ведущих мировых брендов: <strong className="text-white/80">MSI, ASUS ROG, Dell Alienware, LG, BenQ и Samsung</strong>. В наличии модели с частотой обновления от 144 Гц до 360 Гц, матрицы Fast IPS и OLED, разрешения Full HD, 2K QHD и 4K UHD. <Link to="/category/monitors" className="text-[#1565C0] hover:underline">Смотреть мониторы →</Link>
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0F1117] border border-white/[0.07]">
            <div className="flex items-center gap-2 mb-2 text-[#1565C0] font-semibold text-sm sm:text-base">
              <Zap className="w-4 h-4" />
              <h3>ИБП Ion — защита от перебоев питания</h3>
            </div>
            <p className="text-xs leading-relaxed text-white/55">
              Купить ИБП Ion в Ташкенте: линейно-интерактивные и онлайн ИБП мощностью от 650VA до 120kVA для ПК, серверов, котлов и медтехники. Официальный дистрибьютор Ion в Узбекистане. <Link to="/category/ups" className="text-[#1565C0] hover:underline">Смотреть ИБП →</Link>
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0F1117] border border-white/[0.07]">
            <div className="flex items-center gap-2 mb-2 text-[#1565C0] font-semibold text-sm sm:text-base">
              <Cpu className="w-4 h-4" />
              <h3>Kompyuter sotib olish Toshkentda</h3>
            </div>
            <p className="text-xs leading-relaxed text-white/55">
              AlfaComp — Toshkentdagi kompyuter do'koni. <strong className="text-white/80">Gaming kompyuterlar, monitorlar, videokartalar va UPS</strong> sotib olish uchun bizga murojaat qiling. Do'konimiz «Malika» bozori, A27 blokda joylashgan. <Link to="/category/computers" className="text-[#1565C0] hover:underline">Kompyuterlarni ko'rish →</Link>
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
            <MapPin className="w-4 h-4 text-[#1565C0] shrink-0 mt-0.5" />
            <span><strong>Удобный самовывоз:</strong> Наш физический магазин находится в Ташкенте, базар «Малика», блок А27. Проверка товара перед покупкой.</span>
          </li>
        </ul>

        <p className="text-xs text-white/50 leading-relaxed mb-3">
          Магазин AlfaComp ждет вас ежедневно (Пн–Сб 09:00–19:00) на базаре «Малика», блок А27. Свяжитесь с нами через Telegram для консультации по подбору компьютера, монитора или ИБП под ваш бюджет.
        </p>

        <nav aria-label="Категории товаров" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/40">
          <Link to="/category/computers" className="hover:text-white/70 transition-colors">Компьютеры</Link>
          <Link to="/category/monitors" className="hover:text-white/70 transition-colors">Мониторы</Link>
          <Link to="/category/videocards" className="hover:text-white/70 transition-colors">Видеокарты</Link>
          <Link to="/category/ups" className="hover:text-white/70 transition-colors">ИБП Ion</Link>
          <Link to="/category/components" className="hover:text-white/70 transition-colors">Комплектующие</Link>
          <Link to="/category/wifi-routers" className="hover:text-white/70 transition-colors">Wi-Fi роутеры</Link>
          <Link to="/category/all-in-one" className="hover:text-white/70 transition-colors">Моноблоки</Link>
          <Link to="/category/accessories" className="hover:text-white/70 transition-colors">Аксессуары</Link>
        </nav>
      </div>
    </section>
  );
};

export default SeoTextBlock;

import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { 
  ShieldCheck, 
  Truck, 
  Phone, 
  MapPin, 
  Send, 
  Clock, 
  CreditCard, 
  RotateCcw, 
  ChevronRight, 
  CheckCircle2, 
  Building2, 
  Sparkles,
  ArrowLeft
} from "lucide-react";
import Header from "@/components/store/Header";
import Footer from "@/components/store/Footer";
import { CONTACTS } from "@/lib/constants";
import { useCart } from "@/hooks/useCart";
import CartModal from "@/components/store/CartModal";
import MobileBottomNav from "@/components/store/MobileBottomNav";

export type InfoPageType = "about" | "delivery" | "warranty" | "contacts";

interface InfoPageProps {
  type: InfoPageType;
}

export const InfoPage = ({ type }: InfoPageProps) => {
  const cart = useCart();

  const getPageConfig = () => {
    switch (type) {
      case "about":
        return {
          title: "О компании AlfaComp — магазин компьютеров и электроники в Ташкенте",
          description: "AlfaComp.uz — надежный поставщик компьютеров, мониторов, комплектующих и сетевого оборудования в Ташкенте. Официальная гарантия, экспертная сборка ПК и доставка по Узбекистану.",
          canonical: "https://alfacomp.uz/about",
          h1: "О магазине AlfaComp",
          breadcrumb: "О компании",
        };
      case "delivery":
        return {
          title: "Доставка и оплата компьютеров и электроники в Ташкенте | AlfaComp",
          description: "Условия доставки по Ташкенту (1 день) и регионам Узбекистана (до 3 дней). Оплата: наличные, Click, Payme, Uzumbank, безналичный расчет для юрлиц. AlfaComp.",
          canonical: "https://alfacomp.uz/delivery",
          h1: "Доставка и оплата",
          breadcrumb: "Доставка и оплата",
        };
      case "warranty":
        return {
          title: "Гарантия и сервисное обслуживание в Ташкенте | AlfaComp",
          description: "Официальная гарантия от 12 до 36 месяцев на всю технику в AlfaComp. Собственный сервисный центр, обмен и возврат в течение 14 дней в Ташкенте.",
          canonical: "https://alfacomp.uz/warranty",
          h1: "Гарантия и возврат",
          breadcrumb: "Гарантия",
        };
      case "contacts":
      default:
        return {
          title: "Контакты магазина компьютеров AlfaComp в Ташкенте — адрес, телефон, Telegram",
          description: "Контакты интернет-магазина AlfaComp: Ташкент, Узбекистан. Телефон: +998 88 320 33 33. Telegram: @ALIBABO777. Консультации и заказ техники.",
          canonical: "https://alfacomp.uz/contacts",
          h1: "Контакты AlfaComp",
          breadcrumb: "Контакты",
        };
    }
  };

  const config = getPageConfig();

  const breadcrumbsJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Главная",
        item: "https://alfacomp.uz/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: config.breadcrumb,
        item: config.canonical,
      },
    ],
  };

  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "ComputerStore",
    name: "AlfaComp",
    image: "https://alfacomp.uz/banner.jpg",
    url: "https://alfacomp.uz/",
    telephone: CONTACTS.PHONE,
    email: CONTACTS.EMAIL,
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: CONTACTS.ADDRESS,
      addressLocality: "Ташкент",
      addressRegion: "Ташкент",
      addressCountry: "UZ",
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "09:00",
        closes: "19:00",
      },
    ],
    sameAs: [CONTACTS.TELEGRAM],
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-[62px] md:pb-0">
      <Helmet>
        <title>{config.title}</title>
        <meta name="description" content={config.description} />
        <link rel="canonical" href={config.canonical} />
        <meta property="og:title" content={config.title} />
        <meta property="og:description" content={config.description} />
        <meta property="og:url" content={config.canonical} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(breadcrumbsJsonLd)}</script>
        {type === "contacts" && (
          <script type="application/ld+json">{JSON.stringify(localBusinessJsonLd)}</script>
        )}
      </Helmet>

      <Header cartCount={cart.count} onCartClick={() => cart.setIsOpen(true)} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
        {/* Breadcrumbs */}
        <nav aria-label="Хлебные крошки" className="flex items-center gap-2 text-xs text-white/50 mb-6">
          <Link to="/" className="hover:text-white transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Главная
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-white/20" />
          <span className="text-[#FF5A00] font-medium">{config.breadcrumb}</span>
        </nav>

        {/* Header Title */}
        <div className="mb-10">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            {config.h1}
          </h1>
          <p className="text-sm sm:text-base text-white/60 leading-relaxed max-w-3xl">
            {config.description}
          </p>
        </div>

        {/* Content by Type */}
        {type === "about" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#0f1117] border border-white/[0.07] rounded-xl p-5">
                <div className="w-10 h-10 rounded-lg bg-[#FF5A00]/10 border border-[#FF5A00]/20 flex items-center justify-center mb-3">
                  <Sparkles className="w-5 h-5 text-[#FF5A00]" />
                </div>
                <h3 className="text-base font-bold text-white mb-1.5">Премиум качество</h3>
                <p className="text-xs text-white/55 leading-relaxed">
                  Поставляем только оригинальное оборудование ведущих мировых брендов: MSI, ASUS, Dell, LG, Ion, TP-Link.
                </p>
              </div>

              <div className="bg-[#0f1117] border border-white/[0.07] rounded-xl p-5">
                <div className="w-10 h-10 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center mb-3">
                  <ShieldCheck className="w-5 h-5 text-[#22c55e]" />
                </div>
                <h3 className="text-base font-bold text-white mb-1.5">Официальная гарантия</h3>
                <p className="text-xs text-white/55 leading-relaxed">
                  Все товары сопровождаются гарантией производителя и поддержкой нашего сервисного центра в Ташкенте.
                </p>
              </div>

              <div className="bg-[#0f1117] border border-white/[0.07] rounded-xl p-5">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3">
                  <Truck className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-base font-bold text-white mb-1.5">Быстрая логистика</h3>
                <p className="text-xs text-white/55 leading-relaxed">
                  Доставка курьером в течение 24 часов по Ташкенту и надёжная отправка во все регионы Узбекистана.
                </p>
              </div>
            </div>

            <div className="bg-[#0f1117] border border-white/[0.07] rounded-xl p-6 sm:p-8 space-y-4">
              <h2 className="text-lg sm:text-xl font-bold text-white">Наша специализация</h2>
              <p className="text-sm text-white/70 leading-relaxed">
                AlfaComp — специализированный магазин в Ташкенте, ориентированный на геймеров, разработчиков, дизайнеров и корпоративных клиентов. Мы предлагаем не просто компьютерное «железо», а выверенные решения для максимальной продуктивности:
              </p>
              <ul className="space-y-2 text-sm text-white/70">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#FF5A00] shrink-0 mt-0.5" />
                  <span><strong>ИБП (источники бесперебойного питания) Ion:</strong> защита оборудования от скачков напряжения и аварийных отключений (от домашних ПК до серверных стоек).</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#FF5A00] shrink-0 mt-0.5" />
                  <span><strong>Игровые и профессиональные мониторы:</strong> 2K, 4K, OLED матрицы с частотой от 144 до 360 Гц.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#FF5A00] shrink-0 mt-0.5" />
                  <span><strong>Комплектующие и сборка ПК:</strong> видеокарты RTX нового поколения, быстрая память DDR5, NVMe SSD накопители.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#FF5A00] shrink-0 mt-0.5" />
                  <span><strong>Сетевое оборудование:</strong> бесшовные Mesh-системы Wi-Fi 6 и Wi-Fi 7 для квартир, офисов и загородных домов.</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {type === "delivery" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#0f1117] border border-white/[0.07] rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#FF5A00]/10 border border-[#FF5A00]/20 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-[#FF5A00]" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Доставка по Ташкенту</h2>
                    <span className="text-xs text-[#22c55e]">Срок: 1 день</span>
                  </div>
                </div>
                <p className="text-sm text-white/60 leading-relaxed mb-3">
                  Доставка осуществляется собственной курьерской службой прямо до двери. Вы можете проверить целостность и работоспособность товара при получении.
                </p>
                <div className="text-xs font-mono text-white/40">Стоимость: от 30 000 сум</div>
              </div>

              <div className="bg-[#0f1117] border border-white/[0.07] rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Доставка по Узбекистану</h2>
                    <span className="text-xs text-blue-400">Срок: 1–3 дня</span>
                  </div>
                </div>
                <p className="text-sm text-white/60 leading-relaxed mb-3">
                  Отправка в Самарканд, Бухару, Андижан, Наманган, Фергану и другие города через проверенные экспресс-почты с трек-номером.
                </p>
                <div className="text-xs font-mono text-white/40">Надежная бронеупаковка хрупкой электроники</div>
              </div>
            </div>

            <div className="bg-[#0f1117] border border-white/[0.07] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-[#22c55e]" />
                </div>
                <h2 className="text-base font-bold text-white">Способы оплаты</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-white/70">
                <div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-lg">
                  <div className="font-semibold text-white mb-1">Наличные / Терминал</div>
                  Оплата при получении курьеру
                </div>
                <div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-lg">
                  <div className="font-semibold text-white mb-1">Click & Payme</div>
                  Быстрый перевод в сумах
                </div>
                <div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-lg">
                  <div className="font-semibold text-white mb-1">Uzumbank</div>
                  Удобная онлайн-оплата
                </div>
                <div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-lg">
                  <div className="font-semibold text-white mb-1">Безналичный расчет</div>
                  Счет-фактура для юрлиц с НДС
                </div>
              </div>
            </div>
          </div>
        )}

        {type === "warranty" && (
          <div className="space-y-6">
            <div className="bg-[#0f1117] border border-white/[0.07] rounded-xl p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-[#22c55e]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Условия гарантии</h2>
                  <p className="text-xs text-white/50">Надежная защита вашей покупки</p>
                </div>
              </div>

              <p className="text-sm text-white/70 leading-relaxed">
                На всю приобретенную в AlfaComp технику распространяется официальная гарантия от 12 до 36 месяцев (в зависимости от категории и производителя товара).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 bg-white/[0.02] border border-white/[0.05] rounded-lg">
                  <div className="font-semibold text-sm text-white mb-1">ИБП Ion</div>
                  <div className="text-xs text-white/50">Гарантия 12–24 месяца с полной заменой или ремонтом в сертифицированном сервисе.</div>
                </div>
                <div className="p-3.5 bg-white/[0.02] border border-white/[0.05] rounded-lg">
                  <div className="font-semibold text-sm text-white mb-1">Мониторы MSI / ASUS / Dell / LG</div>
                  <div className="text-xs text-white/50">Гарантия до 36 месяцев на матрицу и электронные блоки питания.</div>
                </div>
                <div className="p-3.5 bg-white/[0.02] border border-white/[0.05] rounded-lg">
                  <div className="font-semibold text-sm text-white mb-1">Комплектующие для ПК</div>
                  <div className="text-xs text-white/50">Видеокарты, SSD и память — от 12 до 36 месяцев заводской гарантии.</div>
                </div>
                <div className="p-3.5 bg-white/[0.02] border border-white/[0.05] rounded-lg">
                  <div className="font-semibold text-sm text-white mb-1">Сетевое оборудование</div>
                  <div className="text-xs text-white/50">Роутеры и Mesh-системы — 12 месяцев официальной гарантии.</div>
                </div>
              </div>
            </div>

            <div className="bg-[#0f1117] border border-white/[0.07] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#FF5A00]/10 border border-[#FF5A00]/20 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5 text-[#FF5A00]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Возврат и обмен товара</h2>
                  <span className="text-xs text-white/50">14 дней со дня покупки</span>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-white/65 leading-relaxed">
                Вы можете вернуть или обменять исправный товар надлежащего качества в течение 14 дней с момента приобретения, если сохранены его товарный вид, потребительские свойства, оригинальная упаковка, пломбы и чек покупки.
              </p>
            </div>
          </div>
        )}

        {type === "contacts" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#0f1117] border border-white/[0.07] rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-[#FF5A00]/10 border border-[#FF5A00]/20 flex items-center justify-center mb-3">
                    <Phone className="w-5 h-5 text-[#FF5A00]" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">Телефон для заказов</h3>
                  <p className="text-xs text-white/50 mb-3">Звонки принимаются ежедневно</p>
                </div>
                <a
                  href={`tel:${CONTACTS.PHONE}`}
                  className="text-base font-mono font-bold text-white hover:text-[#FF5A00] transition-colors"
                >
                  {CONTACTS.PHONE}
                </a>
              </div>

              <div className="bg-[#0f1117] border border-white/[0.07] rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center mb-3">
                    <Send className="w-5 h-5 text-[#22c55e]" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">Telegram менеджер</h3>
                  <p className="text-xs text-white/50 mb-3">Быстрый ответ и консультация</p>
                </div>
                <a
                  href={CONTACTS.TELEGRAM}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#22c55e] hover:underline"
                >
                  Написать в Telegram →
                </a>
              </div>

              <div className="bg-[#0f1117] border border-white/[0.07] rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3">
                    <Clock className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">График работы</h3>
                  <p className="text-xs text-white/50 mb-3">Время в Ташкенте (UTC+5)</p>
                </div>
                <div className="text-sm font-semibold text-white">
                  Пн – Сб: 09:00 – 19:00
                </div>
              </div>
            </div>

            <div className="bg-[#0f1117] border border-white/[0.07] rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/[0.05] border border-white/[0.1] flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-white/80" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Локация</h3>
                  <p className="text-xs text-white/50">{CONTACTS.ADDRESS} (доставка по всему городу и Узбекистану)</p>
                </div>
              </div>
              <Link
                to="/"
                className="btn-accent px-5 py-2.5 text-xs font-semibold rounded-lg shrink-0"
              >
                Перейти в каталог →
              </Link>
            </div>
          </div>
        )}

        {/* Back to Catalog CTA */}
        <div className="mt-12 pt-8 border-t border-white/[0.08] flex items-center justify-between">
          <Link to="/" className="text-xs text-white/50 hover:text-white flex items-center gap-1.5 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Вернуться на главную
          </Link>
          <div className="flex items-center gap-4 text-xs text-white/40">
            <Link to="/about" className="hover:text-white transition-colors">О нас</Link>
            <Link to="/delivery" className="hover:text-white transition-colors">Доставка</Link>
            <Link to="/warranty" className="hover:text-white transition-colors">Гарантия</Link>
            <Link to="/contacts" className="hover:text-white transition-colors">Контакты</Link>
          </div>
        </div>
      </main>

      <Footer />

      <CartModal
        isOpen={cart.isOpen}
        onClose={() => cart.setIsOpen(false)}
        items={cart.items}
        total={cart.total}
        onUpdateQuantity={cart.updateQuantity}
        onRemove={cart.removeItem}
        onClear={cart.clearCart}
      />

      <MobileBottomNav cartCount={cart.count} onCartClick={() => cart.setIsOpen(true)} />
    </div>
  );
};

export default InfoPage;

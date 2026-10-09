import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { BookOpen, ArrowRight, ArrowLeft, ChevronRight, Cpu, HardDrive, Monitor, Zap } from "lucide-react";
import Header from "@/components/store/Header";
import Footer from "@/components/store/Footer";
import { useCart } from "@/hooks/useCart";
import CartModal from "@/components/store/CartModal";
import MobileBottomNav from "@/components/store/MobileBottomNav";

interface GuideItem {
  id: string;
  title: string;
  category: string;
  categoryLink: string;
  icon: any;
  snippet: string;
  readTime: string;
}

const GUIDES: GuideItem[] = [
  {
    id: "how-to-choose-gaming-pc",
    title: "Как выбрать игровой компьютер в 2026 году: баланс процессора и видеокарты",
    category: "Компьютеры",
    categoryLink: "/category/components",
    icon: Cpu,
    snippet: "Разбираем, на что обращать внимание при выборе игрового ПК: соотношение производительности видеокарты RTX и процессора, достаточный объем быстрой памяти и эффективное охлаждение.",
    readTime: "5 мин",
  },
  {
    id: "ram-ddr5-6000mhz-guide",
    title: "DDR5 6000 MHz и выше: сколько оперативной памяти нужно для современных задач",
    category: "Комплектующие",
    categoryLink: "/category/components",
    icon: Zap,
    snippet: "Почему для современных платформ стандартом становится 32GB и 64GB DDR5 с частотой 6000 MHz и низкими таймингами. Влияние на FPS в играх и скорость рендера.",
    readTime: "4 мин",
  },
  {
    id: "nvme-ssd-choice-guide",
    title: "Как выбрать надежный SSD NVMe накопитель для работы и игр",
    category: "SSD накопители",
    categoryLink: "/category/components",
    icon: HardDrive,
    snippet: "В чем разница между PCIe 4.0 и 5.0, зачем нужен DRAM-буфер и радиатор охлаждения, и сколько терабайт памяти действительно требуется под операционную систему и библиотеку проектов.",
    readTime: "4 мин",
  },
  {
    id: "monitor-selection-tashkent",
    title: "Как выбрать монитор: 2K vs 4K, IPS или OLED для дизайна и киберспорта",
    category: "Мониторы",
    categoryLink: "/category/monitors",
    icon: Monitor,
    snippet: "Сравнение технологий матриц, разницы между 144 Гц и 360 Гц, цветопередачи DCI-P3 и стандартов защиты глаз для продолжительной комфортной работы.",
    readTime: "6 мин",
  },
];

export const GuidesPage = () => {
  const cart = useCart();

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
        name: "Гайды и советы",
        item: "https://alfacomp.uz/guides",
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-[62px] md:pb-0">
      <Helmet>
        <title>Гайды и экспертные советы по выбору ПК и электроники | AlfaComp</title>
        <meta
          name="description"
          content="Полезные практические руководства по выбору игровых компьютеров, комплектующих, мониторов и ИБП в Ташкенте. Экспертные советы от инженеров AlfaComp."
        />
        <link rel="canonical" href="https://alfacomp.uz/guides" />
        <meta property="og:title" content="Гайды и советы по выбору электроники — AlfaComp" />
        <meta
          property="og:description"
          content="Практические советы по выбору железа, мониторов и ИБП в Ташкенте от AlfaComp."
        />
        <meta property="og:url" content="https://alfacomp.uz/guides" />
        <meta property="og:type" content="article" />
        <script type="application/ld+json">{JSON.stringify(breadcrumbsJsonLd)}</script>
      </Helmet>

      <Header cartCount={cart.count} onCartClick={() => cart.setIsOpen(true)} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
        {/* Breadcrumbs */}
        <nav aria-label="Хлебные крошки" className="flex items-center gap-2 text-xs text-white/50 mb-6">
          <Link to="/" className="hover:text-white transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Главная
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-white/20" />
          <span className="text-[#FF5A00] font-medium">Гайды и статьи</span>
        </nav>

        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5A00]/10 border border-[#FF5A00]/20 text-[#FF5A00] text-xs font-semibold mb-3">
            <BookOpen className="w-3.5 h-3.5" /> База знаний AlfaComp
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            Гайды по выбору электроники и комплектующих
          </h1>
          <p className="text-sm sm:text-base text-white/60 leading-relaxed max-w-3xl">
            Подробные экспертные материалы, которые помогут вам выбрать оптимальное компьютерное оборудование без переплаты за лишние функции.
          </p>
        </div>

        {/* Guides Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {GUIDES.map((guide) => {
            const IconComponent = guide.icon;
            return (
              <div
                key={guide.id}
                className="bg-[#0f1117] border border-white/[0.07] rounded-xl p-6 flex flex-col justify-between hover:border-white/[0.15] transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-semibold text-[#FF5A00] uppercase tracking-wider">
                      {guide.category}
                    </span>
                    <span className="text-[11px] text-white/40">{guide.readTime}</span>
                  </div>

                  <h2 className="text-base sm:text-lg font-bold text-white group-hover:text-[#FF5A00] transition-colors leading-snug mb-2.5">
                    {guide.title}
                  </h2>

                  <p className="text-xs sm:text-sm text-white/60 leading-relaxed mb-4">
                    {guide.snippet}
                  </p>
                </div>

                <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
                  <Link
                    to={guide.categoryLink}
                    className="text-xs font-semibold text-[#FF5A00] hover:text-[#FF6A15] inline-flex items-center gap-1 transition-colors"
                  >
                    Смотреть товары категории <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Back to Catalog CTA */}
        <div className="mt-12 pt-8 border-t border-white/[0.08] flex items-center justify-between">
          <Link to="/" className="text-xs text-white/50 hover:text-white flex items-center gap-1.5 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Вернуться в каталог
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

export default GuidesPage;

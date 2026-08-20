import { Send, MapPin, Phone, Clock, Mail, ShieldCheck } from "lucide-react";
import { CONTACTS } from "@/lib/constants";

const Footer = () => (
  <footer id="contact" className="pt-16 sm:pt-24 pb-8 relative overflow-hidden bg-[#020202]">
    {/* Top border glow */}
    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00f2ff]/30 to-transparent" />
    
    <div className="container px-4 sm:px-6 relative z-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 lg:gap-12 mb-12 sm:mb-16">
        {/* Brand */}
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00f2ff] to-[#009dff] flex items-center justify-center shadow-lg shadow-[#00f2ff]/20">
              <span className="text-sm font-black text-black">A</span>
            </div>
            <span className="text-2xl font-black tracking-tight text-white">
              Alfa<span className="text-[#00f2ff]">Comp</span>
            </span>
          </div>
          <p className="text-sm text-white/50 leading-relaxed font-medium mb-5 sm:mb-6 max-w-xs">
            Ваш надёжный поставщик премиальной электроники в Узбекистане. Только оригинальные бренды, официальная гарантия и честные цены.
          </p>
          <div className="flex gap-3">
            <a
              href={CONTACTS.TELEGRAM}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Telegram менеджер AlfaComp"
              className="w-10 h-10 glass rounded-xl flex items-center justify-center text-[#00f2ff] hover:bg-[#00f2ff] hover:text-black transition-all hover:scale-110 shadow-lg"
            >
              <Send className="w-4 h-4" />
            </a>
            <a
              href="https://t.me/alfacomp_computers"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Telegram канал AlfaComp"
              title="Telegram канал"
              className="w-10 h-10 glass rounded-xl flex items-center justify-center text-[#00f2ff] hover:bg-[#00f2ff] hover:text-black transition-all hover:scale-110 shadow-lg"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.927 14.14l-2.955-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.836.952z"/>
              </svg>
            </a>
            <a
              href="https://www.instagram.com/alfacomp.uz/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram AlfaComp"
              className="w-10 h-10 glass rounded-xl flex items-center justify-center text-[#ff0080] hover:bg-gradient-to-br hover:from-[#ff0080] hover:to-[#ff6b35] hover:text-white transition-all hover:scale-110 shadow-lg"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Navigation */}
        <div>
          <h3 className="font-bold text-white mb-5 sm:mb-6 uppercase tracking-wider text-sm">Навигация</h3>
          <ul className="space-y-2.5 sm:space-y-3">
            {[
              { id: "home", label: "Главная" },
              { id: "catalog", label: "Каталог товаров" },
              { id: "features", label: "О нас" },
              { id: "faq", label: "Вопросы (FAQ)" }
            ].map((l) => (
              <li key={l.id}>
                <button
                  onClick={() => document.getElementById(l.id)?.scrollIntoView({ behavior: "smooth" })}
                  className="text-sm font-medium text-white/50 hover:text-[#00f2ff] transition-all hover:translate-x-1"
                >
                  {l.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Categories */}
        <div>
          <h3 className="font-bold text-white mb-5 sm:mb-6 uppercase tracking-wider text-sm">Категории</h3>
          <ul className="space-y-2.5 sm:space-y-3 text-sm font-medium text-white/50">
            {[
              "ИБП и Питание",
              "Игровые Мониторы",
              "Сетевое оборудование",
              "Комплектующие ПК",
              "Моноблоки",
              "Периферия"
            ].map((c) => (
              <li key={c} className="hover:text-white transition-colors cursor-pointer hover:translate-x-1 transition-transform">
                {c}
              </li>
            ))}
          </ul>
        </div>

        {/* Contacts */}
        <div>
          <h3 className="font-bold text-white mb-5 sm:mb-6 uppercase tracking-wider text-sm">Контакты</h3>
          <ul className="space-y-3 sm:space-y-4 text-sm font-medium text-white/60">
            <li className="flex items-start gap-3 group">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-[#00f2ff] mt-0.5 group-hover:scale-110 transition-transform" />
              <span className="leading-relaxed">{CONTACTS.ADDRESS}</span>
            </li>
            <li className="flex items-center gap-3 group">
              <Phone className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-[#00f2ff] group-hover:scale-110 transition-transform" />
              <a href={`tel:${CONTACTS.PHONE}`} className="hover:text-white transition-colors break-all">
                {CONTACTS.PHONE}
              </a>
            </li>
            <li className="flex items-center gap-3 group">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-[#00f2ff] group-hover:scale-110 transition-transform" />
              <span>Пн–Сб 9:00–19:00</span>
            </li>
            <li className="flex items-center gap-3 group">
              <Mail className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-[#00f2ff] group-hover:scale-110 transition-transform" />
              <a href={`mailto:${CONTACTS.EMAIL}`} className="hover:text-white transition-colors break-all text-xs sm:text-sm">
                {CONTACTS.EMAIL}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center pt-6 sm:pt-8 border-t border-white/10 gap-3 sm:gap-4">
        <p className="text-xs font-semibold text-white/40 text-center sm:text-left">
          © 2025 Alfacomp. Все права защищены.
        </p>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold text-white/40 text-center">
            Безопасные платежи: Payme, Click, Uzumbank
          </span>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;

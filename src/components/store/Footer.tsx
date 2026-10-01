import { Send, MapPin, Phone, Clock, Mail, ShieldCheck } from "lucide-react";
import { CONTACTS } from "@/lib/constants";

const Footer = () => (
  <footer id="contact" className="pt-16 pb-12 relative bg-[#08090c] border-t border-white/[0.06]">
    {/* Subtle top gradient */}
    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#FF5A00]/15 to-transparent pointer-events-none" />

    <div className="container px-4 sm:px-6 relative z-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-12">

        {/* Brand */}
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#14171E] border border-white/[0.09] flex items-center justify-center">
              <span className="text-[#FF5A00] font-black font-mono text-sm">α</span>
            </div>
            <span className="text-[16px] font-bold tracking-tight text-white">
              Alfa<span className="text-[#FF5A00]">Comp</span>
            </span>
          </div>

          <p className="text-[12.5px] text-white/42 leading-relaxed mb-5 font-normal max-w-xs">
            Склад и поставка компьютерной техники, игровых мониторов 144–320&nbsp;Гц,
            ИБП&nbsp;Ion и сетевого оборудования в Ташкенте.
          </p>

          {/* Social links */}
          <div className="flex gap-2">
            {[
              {
                href: CONTACTS.TELEGRAM,
                label: "Telegram менеджер",
                icon: (
                  <Send className="w-3.5 h-3.5" />
                ),
              },
              {
                href: "https://t.me/alfacomp_computers",
                label: "Telegram канал",
                icon: (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.927 14.14l-2.955-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.836.952z"/>
                  </svg>
                ),
              },
              {
                href: "https://www.instagram.com/alfacomp.uz/",
                label: "Instagram",
                icon: (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                ),
              },
            ].map(({ href, label, icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="w-9 h-9 rounded-lg bg-[#14171E] border border-white/[0.08] flex items-center justify-center
                  text-white/50 hover:text-white hover:border-[#FF5A00]/40 transition-all duration-200"
                title={label}
              >
                {icon}
              </a>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div>
          <h3 className="text-label text-white/30 mb-4">Навигация</h3>
          <ul className="space-y-2">
            {[
              { id: "home", label: "Главная" },
              { id: "catalog", label: "Каталог продукции" },
              { id: "features", label: "Условия и гарантия" },
              { id: "faq", label: "Вопросы и ответы" },
            ].map((l) => (
              <li key={l.id}>
                <button
                  onClick={() => document.getElementById(l.id)?.scrollIntoView({ behavior: "smooth" })}
                  className="text-[12.5px] text-white/48 hover:text-white transition-colors font-medium"
                >
                  {l.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Categories */}
        <div>
          <h3 className="text-label text-white/30 mb-4">Категории</h3>
          <ul className="space-y-2">
            {[
              "ИБП Ion",
              "Мониторы 144–320 Гц",
              "Сетевое оборудование",
              "Комплектующие ПК",
              "Моноблоки",
              "Аксессуары",
            ].map((c) => (
              <li
                key={c}
                onClick={() => document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" })}
                className="text-[12.5px] text-white/48 hover:text-white transition-colors cursor-pointer font-medium"
              >
                {c}
              </li>
            ))}
          </ul>
        </div>

        {/* Contacts */}
        <div>
          <h3 className="text-label text-white/30 mb-4">Контакты</h3>
          <ul className="space-y-3">
            {[
              { icon: MapPin, text: CONTACTS.ADDRESS, href: undefined },
              { icon: Phone, text: CONTACTS.PHONE, href: `tel:${CONTACTS.PHONE}` },
              { icon: Clock, text: "Пн–Сб 9:00–19:00", href: undefined },
              { icon: Mail, text: CONTACTS.EMAIL, href: `mailto:${CONTACTS.EMAIL}` },
            ].map(({ icon: Icon, text, href }) => (
              <li key={text} className="flex items-start gap-2.5">
                <Icon className="w-3.5 h-3.5 text-[#FF5A00] shrink-0 mt-0.5" />
                {href ? (
                  <a href={href} className="text-data text-[11.5px] text-white/48 hover:text-white transition-colors">
                    {text}
                  </a>
                ) : (
                  <span className="text-data text-[11.5px] text-white/48">{text}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="pt-6 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-data text-[11px] text-white/28">
          © 2025 AlfaComp. Все права защищены.
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-[#22c55e]" />
          <span className="text-data text-[11px] text-white/28">Payme · Click · Uzcard · Наличные</span>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;

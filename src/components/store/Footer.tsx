import { Send, MapPin, Phone, Clock, Mail } from "lucide-react";
import { CONTACTS } from "@/lib/constants";

const Footer = () => (
  <footer id="contact" className="pt-20 pb-8 bg-card border-t border-border">
    <div className="container">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
        <div>
          <span className="text-2xl font-extrabold gradient-text">AlfaComp</span>
          <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
            Ваш надёжный поставщик электроники в Ташкенте. Только проверенные бренды, гарантия и честные цены.
          </p>
          <div className="flex gap-3 mt-5">
            <a
              href={CONTACTS.TELEGRAM}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 glass rounded-lg flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all hover:-translate-y-1"
            >
              <Send className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div>
          <h4 className="font-bold mb-4">Навигация</h4>
          <ul className="space-y-2.5">
            {["Главная", "Каталог", "FAQ", "Контакты"].map((l) => (
              <li key={l}>
                <button
                  onClick={() => document.getElementById(l === "Контакты" ? "contact" : l === "Главная" ? "home" : l.toLowerCase())?.scrollIntoView({ behavior: "smooth" })}
                  className="text-sm text-muted-foreground hover:text-primary hover:pl-1 transition-all"
                >
                  {l}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-bold mb-4">Категории</h4>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            {["ИБП", "Мониторы", "Сеть", "Комплектующие", "Моноблоки", "Аксессуары"].map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-bold mb-4">Контакты</h4>
          <ul className="space-y-4 text-sm text-muted-foreground">
            <li className="flex gap-3"><MapPin className="w-4 h-4 shrink-0 mt-0.5" />{CONTACTS.ADDRESS}</li>
            <li className="flex gap-3"><Phone className="w-4 h-4 shrink-0 mt-0.5" /><a href={`tel:${CONTACTS.PHONE}`} className="hover:text-primary transition-colors">+998 88 320 33 33</a></li>
            <li className="flex gap-3"><Clock className="w-4 h-4 shrink-0 mt-0.5" />Пн–Сб 9:00–19:00</li>
            <li className="flex gap-3"><Mail className="w-4 h-4 shrink-0 mt-0.5" /><a href={`mailto:${CONTACTS.EMAIL}`} className="hover:text-primary transition-colors">{CONTACTS.EMAIL}</a></li>
          </ul>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center pt-8 border-t border-border gap-4">
        <p className="text-xs text-muted-foreground">© 2025 Alfacomp. Все права защищены.</p>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>Payme</span><span>Click</span><span>Uzumbank</span>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;

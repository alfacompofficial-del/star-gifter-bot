## Что вернуть в `HeroSection.tsx`

1. **Заголовок (H1)** — вернуть оригинальный вид:
   - «Премиальная электроника в **Узбекистане**» (без вставки `kompyuterlar va UPS`).
2. **Изображение справа** — вернуть старое фото ноутбука с Unsplash:
   `https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?auto=format&fit=crop&q=80&w=800`
   (вместо `88f25643-9187-49bd-8459-f1fd6cde5d65.png`, которого нет в проекте — поэтому картинка сейчас «сломана»).
3. **Подзаголовок (`<p>`)** — оставить текущий текст с ключевыми словами (`Eng zor kompyuterlar, monitorlar, UPS...`), он полезен для SEO и читается нормально.
4. **Скрытый SEO-блок `<p class="sr-only">`** — оставить как есть.

## Что НЕ трогаем

- `index.html` — title, description, keywords, og:*, JSON-LD остаются.
- `public/robots.txt`, `public/sitemap.xml`, `scripts/generate-sitemap.ts` — без изменений.
- Все остальные SEO-улучшения сохраняются.

## Файлы

- править: `src/components/store/HeroSection.tsx` (только H1 и `<img src>`)

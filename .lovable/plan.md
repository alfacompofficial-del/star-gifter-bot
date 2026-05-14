## Цель

Улучшить SEO сайта AlfaComp, чтобы он находился по ключевым словам на узбекском и русском: **elektronikalar, kompyuterlar, UPS, monitorlar, eng zor kompyuterlar**, при этом сохранив текущие: **Премиальная электроника, AlfaComp, Лучшие электроники, Лучшие поставщики, Лучшие техники**, Yandex помощники, Wi-Fi router.

## Что изменю

### 1. `index.html` — основные мета-теги

- `**<title>**`: «AlfaComp — Премиальная электроника, kompyuterlar, UPS, monitorlar в Узбекистане» (≤60 симв., с ключами).
- `**<meta name="description">**`: краткое описание с ключами на двух языках: «AlfaComp — eng zor kompyuterlar, monitorlar, UPS (ИБП), elektronikalar в Ташкенте. Лучшие поставщики, гарантия, доступные цены.»
- `**<meta name="keywords">**`: elektronikalar, kompyuterlar, UPS, ИБП, monitorlar, eng zor kompyuterlar, премиальная электроника, AlfaComp, лучшие электроники, лучшие поставщики, Ташкент, Узбекистан.
- `**og:title`, `og:description`, `twitter:***` — синхронизирую с новыми значениями.
- `**<link rel="canonical">**` на основной домен.
- `**<html lang="ru">**` оставлю, но добавлю `<meta http-equiv="content-language" content="ru, uz">`.

### 2. JSON-LD структурированные данные

Добавлю в `<head>` два блока:

- **Organization** — имя AlfaComp, описание, адрес (Ташкент), URL.
- **Store / LocalBusiness** — категории товаров (Computers, Monitors, UPS, Electronics) с ключами на uz/ru, чтобы Google понял тематику.

### 3. `public/robots.txt`

Уже существует — добавлю строку `Sitemap: alfacomp.uz/sitemap.xml`.

### 4. Sitemap

Создам `scripts/generate-sitemap.ts` + добавлю `predev`/`prebuild` хуки. Включу `/`, `/download`. (`/admin` исключаю.)

### 5. Видимый контент (важно для ранжирования)

SEO-боты читают текст на странице. Добавлю на главную (`HeroSection` / `Footer`) ненавязчивый блок с ключевыми словами на двух языках, например подзаголовок: «Eng zor kompyuterlar, monitorlar, UPS va elektronikalar — premium sifat» рядом с русским «Лучшие компьютеры, мониторы и ИБП в Узбекистане».

- H1 на главной — один, с основным ключом.
- `alt`-тексты у изображений товаров уже есть через `name` — проверю.

## Технические замечания

- Сейчас используется **HashRouter** (`#/admin`). Поисковики плохо индексируют hash-маршруты, но т.к. главная страница — это `/`, для главной это не критично. Менять роутер **не буду** без вашего согласия (это ломает существующие ссылки).
- Домен для canonical/sitemap: `https://star-gift-anon.lovable.app` (превью Lovable). Если у вас есть боевой домен (alfacomp.uz?) — укажите, подставлю его.

## Файлы

- править: `index.html`, `public/robots.txt`, `src/components/store/HeroSection.tsx` (или Footer)
- создать: `scripts/generate-sitemap.ts`, добавить скрипты в `package.json`

Все перенсти в lovable и гитхаб через гитхаб я сам подключу к домену 
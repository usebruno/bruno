[English](../../contributing.md)

## Давайте разом покращимо Bruno!!

Ми раді, що ви хочете покращити Bruno. Нижче наведено рекомендації щодо запуску Bruno на вашому комп'ютері.

### Технологічний стек

Bruno створено за допомогою React та використовує Electron для випуску настільної версії (з підтримкою локальних колекцій).

Бібліотеки, які ми використовуємо

- CSS - Tailwind
- Редактори коду - Codemirror
- Керування станом - Redux
- Піктограми - Піктограми Tabler
- Форми - formik
- Перевірка схеми - Так
- Клієнт запиту - axios
- Спостерігач файлової системи - chokidar
- i18n - i18next

> [!ВАЖЛИВО]
> Вам знадобиться [Node v22.x або остання версія LTS](https://nodejs.org/en/). У проекті ми використовуємо робочі простори npm

## Розробка

Bruno — це настільний додаток. Вам потрібно завантажити застосунок, окремо запустивши фронтенд та застосунок Electron.

> Примітка: Ми використовуємо React для фронтенду та rsbuild для збірки та сервера розробки.

## Встановлення залежностей

```bash
# використання nodejs 22 версії
використання nvm

# встановлення залежностей
npm i --legacy-peer-deps
```

### Локальна розробка (Варіант 1)

```bash
# збірка пакетів
npm run build:graphql-docs
npm run build:bruno-query
npm run build:bruno-common
npm run build:bruno-converters
npm run build:bruno-requests

# бібліотеки sandbox bundle js
npm run sandbox:bundle-libraries --workspace=packages/bruno-js

# запуск програми react (термінал 1)
npm run dev:web

# запуск програми electron (термінал 2)
npm run dev:electron
```

### Локальна розробка (Варіант 2)

```bash
# встановлення залежностей та налаштування
npm run setup

# одночасний запуск програм electron та react
npm run dev
```

### Виправлення неполадок

Під час запуску `npm install` може виникнути помилка `Unsupported platform`. Щоб виправити це, вам потрібно видалити `node_modules` та `package-lock.json` і запустити `npm install`. Це має встановити всі необхідні пакети для запуску програми.

```shell
# Видалення node_modules у підкаталогах
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
rm -rf "$dir"
done

# Видалення package-lock у підкаталогах
find . -type f -name "package-lock.json" -delete
```

### Тестування

```bash
# запустити тести bruno-schema
npm test --workspace=packages/bruno-schema

# запустити тести по всіх робочих просторах
npm test --workspaces --if-present
```

### Створити пул-реквести

- Будь ласка, робіть запити на злиття невеликими та зосередженими на одній речі
- Будь ласка, дотримуйтесь формату створення гілок
- feature/[назва функції]: Ця гілка повинна містити зміни для певної функції
- Приклад: feature/dark-mode
- bugfix/[назва помилки]: Ця гілка повинна містити лише виправлення помилок для певної помилки
- Приклад bugfix/bug-1
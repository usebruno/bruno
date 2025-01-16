[English](../../contributing.md)

## Давайте зробимо Bruno краще, разом !!

Я дуже радий що Ви бажаєте покращити Bruno. Нижче наведені вказівки як розпочати розробку Bruno на Вашому комп'ютері.

### Стек технологій

Bruno побудований на Next.js та React. Також для десктопної версії (яка підтримує локальні колекції) використовується Electron

Бібліотеки, які ми використовуємо

- CSS - Tailwind
- Редактори коду - Codemirror
- Керування станом - Redux
- Іконки - Tabler Icons
- Форми - formik
- Валідація по схемі - Yup
- Клієнт запитів - axios
- Спостерігач за файловою системою - chokidar

### Залежності

Вам знадобиться [Node v20.x або остання LTS версія](https://nodejs.org/en/) та npm 8.x. Ми використовуєм npm workspaces в цьому проекті

### Починаєм писати код

Будь ласка, зверніться до [development_ua.md](docs/development_ua.md) за інструкціями щодо запуску локального середовища розробки.

### Створення Pull Request-ів

- Будь ласка, робіть PR-и маленькими і сфокусованими на одній речі
- Будь ласка, слідуйте формату назв гілок
  - feature/[назва feature]: Така гілка має містити зміни лише щодо конкретної feature
    - Приклад: feature/dark-mode
  - bugfix/[назва баґу]: Така гілка має містити лише виправлення конкретного багу
    - Приклад: bugfix/bug-1

## Розробка

Bruno розробляється як декстопний застосунок. Вам потрібно запустити Next.js в одній сесії терміналу, та запустити застосунок Electron в іншій сесії терміналу.

### Залежності

- NodeJS v18

### Локальна розробка

```bash
# Використовуйте nodejs 18-ї версії
nvm use

# встановіть залежності
npm i --legacy-peer-deps

# зберіть документацію graphql
npm run build:graphql-docs

# зберіть bruno query
npm run build:bruno-query

# запустіть додаток next (термінал 1)
npm run dev:web

# запустіть додаток електрон (термінал 2)
npm run dev:electron
```

### Усунення несправностей

Ви можете зтикнутись із помилкою `Unsupported platform` коли запускаєте `npm install`. Щоб усунути цю проблему, вам потрібно видалити `node_modules` та `package-lock.json`, і тоді запустити `npm install`. Це має встановити всі потрібні для запуску додатку пекеджі.

```shell
# Видаліть node_modules в піддиректоріях
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
  rm -rf "$dir"
done

# Видаліть package-lock в піддиректоріях
find . -type f -name "package-lock.json" -delete
```

### Тестування

```bash
# bruno-schema
npm test --workspace=packages/bruno-schema

# bruno-lang
npm test --workspace=packages/bruno-lang
```

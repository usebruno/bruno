[English](/docs/development.md) | **Українська** | [Русский](/docs/development_ru.md)

## Розробка

Bruno розробляється як декстопний застосунок. Вам потрібно запустити nextjs в одній сесії терміналу, та запустити застосунок Electron в іншій сесії терміналу.

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

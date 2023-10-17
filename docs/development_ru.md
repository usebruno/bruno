[English](/docs/development.md) | [Українська](/docs/development_ua.md) | **Русский**

## Разработка

Bruno разрабатывается как десктопное приложение. Необходимо загрузить приложение, запустив приложение nextjs в одном терминале, а затем запустить приложение electron в другом терминале.

### Зависимости

- NodeJS v18

### Локальная разработка

```bash
# используйте nodejs 18 версии
nvm use

# установите зависимости
npm i --legacy-peer-deps

# билд документации по graphql
npm run build:graphql-docs

# билд bruno query
npm run build:bruno-query

# запустить next приложение ( терминал 1 )
npm run dev:web

# запустить приложение electron ( терминал 2 )
npm run dev:electron
```

### Устранение неисправностей

При запуске `npm install` может возникнуть ошибка `Unsupported platform`. Чтобы исправить это, необходимо удалить `node_modules` и `package-lock.json` и запустить `npm install`. В результате будут установлены все пакеты, необходимые для работы приложения.

```shell
# Удаление node_modules в подкаталогах
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
  rm -rf "$dir"
done

# Удаление package-lock в подкаталогах
find . -type f -name "package-lock.json" -delete
```

### Тестирование

```bash
# bruno-schema
npm test --workspace=packages/bruno-schema

# bruno-lang
npm test --workspace=packages/bruno-lang
```

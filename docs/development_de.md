[English](/docs/development.md) | [Українська](/docs/development_ua.md) | [Русский](/docs/development_ru.md) | **Deutsch** | [Français](/docs/development_fr.md) | [हिंदी](/docs/development_hi.md)

## Entwicklung

Bruno wird als Desktop-Anwendung entwickelt. Um die App zu starten, musst Du zuerst die Next.js App in einem Terminal ausführen und anschließend in einem anderen Terminal die Electron-App.

### Abhängigkeiten

- NodeJS v18

### Lokales Entwickeln

```bash
# use nodejs 18 version
nvm use

# install deps
npm i --legacy-peer-deps

# build graphql docs
npm run build:graphql-docs

# build bruno query
npm run build:bruno-query

# run next app (terminal 1)
npm run dev:web

# run electron app (terminal 2)
npm run dev:electron
```

### Troubleshooting

Es kann sein, dass Du einen `Unsupported platform`-Fehler bekommst, wenn Du `npm install` ausführst. Um dies zu beheben, musst Du `node_modules` und `package-lock.json` löschen und `npm install` erneut ausführen. Dies sollte alle notwendigen Pakete installieren, die zum Ausführen der Anwendung benötigt werden.

```shell
# Delete node_modules in sub-directories
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
  rm -rf "$dir"
done

# Delete package-lock in sub-directories
find . -type f -name "package-lock.json" -delete
```

### Testen

```bash
# bruno-schema
npm test --workspace=packages/bruno-schema

# bruno-lang
npm test --workspace=packages/bruno-lang
```

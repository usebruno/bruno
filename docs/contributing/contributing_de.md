[English](../../contributing.md)

## Lass uns Bruno noch besser machen, gemeinsam!!

Ich freue mich, dass Du Bruno verbessern möchtest. Hier findest Du eine Anleitung, mit der Du Bruno auf Deinem Computer einrichten kannst.

### Technologie Stack

Bruno ist mit Next.js und React erstellt. Außerdem benötigen wir electron für die Desktop Version (die lokale Sammlungen unterstützt).

Bibliotheken die wir benutzen

- CSS - Tailwind
- Code Editoren - Codemirror
- State Management - Redux
- Icons - Tabler Icons
- Formulare - formik
- Schema Validierung - Yup
- Request Client - axios
- Dateisystem Watcher - chokidar

### Abhängigkeiten

Du benötigst [Node v20.x oder die neuste LTS Version](https://nodejs.org/en/) und npm 8.x. Wir benutzen npm workspaces in dem Projekt.

### Lass uns coden

Eine Anleitung zum Ausführen einer lokalen Entwicklungsumgebung findest Du in [development.md](docs/development_de.md).

### Pull Request erstellen

- Bitte halte die PRs klein und begrenzt auf eine Sache
- Bitte halte Dich beim Erstellen eines Branches an das folgende Format
  - feature/[feature name]: Dieser Branch soll Änderungen für ein bestimmtes Feature enthalten
    - Beispiel: feature/dark-mode
  - bugfix/[bug name]: Dieser Branch soll ausschließlich Bugfixes für einen bestimmten Bug enthalten
    - Beispiel: bugfix/bug-1

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

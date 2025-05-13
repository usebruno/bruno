[English](../../contributing.md)

## Lass uns Bruno noch besser machen, gemeinsam!!

Wir freuen uns, dass Du Bruno verbessern möchtest. Nachfolgend findest Du die Richtlinien, um Bruno auf Deinem Computer auszuführen.

### Technologie-Stack

Bruno basiert auf React und nutzt Electron für die Desktop-Version (mit Unterstützung für lokale Sammlungen).

Verwendete Bibliotheken

– CSS – Tailwind
– Code-Editoren – Codemirror
– Statusverwaltung – Redux
– Symbole – Tabler-Symbole
– Formulare – formik
– Schemavalidierung – Yup
– Request-Client – ​​axios
– Dateisystem-Watcher – chokidar
– i18n – i18next

> [!WICHTIG]
> Sie benötigen [Node v22.x oder die neueste LTS-Version](https://nodejs.org/en/). Wir verwenden npm-Workspaces im Projekt.

## Entwicklung

Bruno ist eine Desktop-App. Sie müssen die App laden, indem Sie sowohl das Frontend als auch die Electron-App separat ausführen.

> Hinweis: Wir verwenden React für das Frontend und rsbuild für den Build- und Entwicklungsserver.

## Abhängigkeiten installieren

```bash
# Node.js Version 22 verwenden
nvm verwenden

# Deps installieren
npm i --legacy-peer-deps
```

### Lokale Entwicklung (Option 1)

```bash
# Pakete erstellen
npm run build:graphql-docs
npm run build:bruno-query
npm run build:bruno-common
npm run build:bruno-converters
npm run build:bruno-requests

# JS-Sandbox-Bibliotheken bündeln
npm run sandbox:bundle-libraries --workspace=packages/bruno-js

# React-App ausführen (Terminal 1)
npm run dev:web

# Electron-App ausführen (Terminal 2)
npm run dev:electron
```

### Lokale Entwicklung (Option 2)

```bash
# Abhängigkeiten installieren und einrichten
npm run setup

# Electron und React App gleichzeitig ausführen
npm run dev
```

### Fehlerbehebung

Beim Ausführen von `npm install` tritt möglicherweise die Fehlermeldung „Nicht unterstützte Plattform“ auf. Um dies zu beheben, müssen Sie `node_modules` und `package-lock.json` löschen und `npm install` ausführen. Dadurch sollten alle für die Ausführung der App erforderlichen Pakete installiert sein.

```shell
# Node_modules in Unterverzeichnissen löschen
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
rm -rf "$dir"
done

# Package-Lock in Unterverzeichnissen löschen
find . -type f -name "package-lock.json" -delete
```

### Testen

```bash
# Bruno-Schema-Tests ausführen
npm test --workspace=packages/bruno-schema

# Tests für alle Arbeitsbereiche ausführen
npm test --workspaces --if-present
```

### Pull Requests erstellen

- Bitte halten Sie die PRs kurz und konzentrieren Sie sich auf ein Thema.
- Bitte beachten Sie das Format zum Erstellen von Branches.
- feature/[Featurename]: Dieser Branch sollte Änderungen für ein bestimmtes Feature enthalten.
- Beispiel: feature/dark-mode
- bugfix/[Fehlername]: Dieser Branch sollte nur Fehlerbehebungen für einen bestimmten Fehler enthalten.
- Beispiel: bugfix/bug-1
[English](/contributing.md) | [Українська](/contributing_ua.md) | [Русский](/contributing_ru.md) | [Türkçe](/contributing_tr.md) | **Deutsch** | [Español](/contributing_es.md)

## Lass uns Bruno noch besser machen, gemeinsam !!

Ich freue mich, dass Du Bruno verbessern möchtest. Hier findest Du eine Anleitung, mit der Du Bruno auf Deinem Computer einrichten kannst.

### Technologie Stack

Bruno ist mit NextJs und React erstellt. Außerdem benötigen wir electron für die Desktop Version (die lokale Sammlungen unterstützt).

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

Du benötigst [Node v18.x oder die neuste LTS Version](https://nodejs.org/en/) und npm 8.x. Wir benutzen npm workspaces in dem Projekt.

### Lass uns coden

Eine Anleitung zum Ausführen einer lokalen Entwicklungsumgebung findest Du in [development.md](docs/development_de.md).

### Pull Request erstellen

- Bitte halte die PRs klein und begrenzt auf eine Sache
- Bitte halte Dich beim Erstellen eines Branches an das folgende Format
  - feature/[feature name]: Dieser Branch soll Änderungen für ein bestimmtes Feature enthalten
    - Beispiel: feature/dark-mode
  - bugfix/[bug name]: Dieser Branch soll ausschließlich Bugfixes für einen bestimmten Bug enthalten
    - Beispiel: bugfix/bug-1

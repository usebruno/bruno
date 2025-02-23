[English](../../contributing.md)

## Laten we Bruno samen beter maken !!

We zijn blij dat je Bruno wilt verbeteren. Hieronder staan de richtlijnen om Bruno op je computer op te zetten.

### Technologiestack

Bruno is gebouwd met Next.js en React. We gebruiken ook Electron om een desktopversie te leveren (die lokale collecties ondersteunt).

Bibliotheken die we gebruiken:

- CSS - Tailwind
- Code Editors - Codemirror
- State Management - Redux
- Iconen - Tabler Icons
- Formulieren - formik
- Schema Validatie - Yup
- Request Client - axios
- Bestandsysteem Watcher - chokidar

### Afhankelijkheden

Je hebt [Node v18.x of de nieuwste LTS-versie](https://nodejs.org/en/) en npm 8.x nodig. We gebruiken npm workspaces in het project.

## Ontwikkeling

Bruno wordt ontwikkeld als een desktop-app. Je moet de app laden door de Next.js app in één terminal te draaien en daarna de Electron app in een andere terminal te draaien.

### Lokale Ontwikkeling

```bash
# gebruik voorgeschreven node versie
nvm use

# installeer afhankelijkheden
npm i --legacy-peer-deps

# build pakketten
npm run build:graphql-docs
npm run build:bruno-query
npm run build:bruno-common

# draai next app (terminal 1)
npm run dev:web

# draai electron app (terminal 2)
npm run dev:electron
```

### Problemen oplossen

Je kunt een `Unsupported platform`-fout tegenkomen wanneer je `npm install` uitvoert. Om dit te verhelpen, moet je `node_modules` en `package-lock.json` verwijderen en `npm install` uitvoeren. Dit zou alle benodigde afhankelijkheden moeten installeren om de app te draaien.

```shell
# Verwijder node_modules in subdirectories
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
  rm -rf "$dir"
done

# Verwijder package-lock in subdirectories
find . -type f -name "package-lock.json" -delete
```

### Testen

```bash
# bruno-schema
npm test --workspace=packages/bruno-schema

# bruno-lang
npm test --workspace=packages/bruno-lang
```

### Pull Requests indienen

- Houd de PR's klein en gefocust op één ding
- Volg het formaat voor het aanmaken van branches
  - feature/[feature naam]: Deze branch moet wijzigingen voor een specifieke functie bevatten
    - Voorbeeld: feature/dark-mode
  - bugfix/[bug naam]: Deze branch moet alleen bugfixes voor een specifieke bug bevatten
    - Voorbeeld: bugfix/bug-1
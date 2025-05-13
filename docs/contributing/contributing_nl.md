[English](../../contributing.md)

## Laten we Bruno samen beter maken !!

We zijn blij dat je Bruno wilt verbeteren. Hieronder staan de richtlijnen om Bruno op je computer uit te voeren.

### Technologie Stack

Bruno is gebouwd mit React en gebruuk Electron um un desktopversie te versjiepe (mit ondersteuning veur lokale collecties).

Bibliotheke die we gebruke

- CSS - Tailwind
- Code Editors - Codemirror
- Staatsbeheer - Redux
- Pictogramme - Tableerpictogramme
- Vörm - formik
- Schemavalidatie - Jao
- Verzoekcliënt - axios
- Filesystem Watcher - chokidar
- i18n - i18next

> [!BELAANGRIEK]
> Geer zout [Node v22.x of de meis recente LTS-versie](https://nodejs.org/en/) nuudig höbbe. Ver gebruke npm-werkruimte in ut projek

## Ontwikkeling

Bruno is un desktop-app. Geer moot de app lade door zoewel de frontend es de Electron-app apaart te draaie.

> Opmerking: Ver gebruke React veur de frontend en rsbuild veur de build en dev server.


## Afhankelikhede installeren

```bash
# gebruuk nodejs 22 versie
nvm gebruuk

# installer deps
npm i --legacy-peer-deps
```

### Lokale ontwikkeling (optie 1)

```bash
# build packages
npm run build:graphql-docs
npm run build:bruno-query
npm run build:bruno-common
npm run build:bruno-converters
npm run build:bruno-requests

# bundle js sandbox libraries
npm run sandbox:bundle-libraries --workspace=packages/bruno-js

# run react app (terminal 1)
npm run dev:web

# run electron app (terminal 2)
npm run dev:electron
```

### Lokale ontwikkeling (optie 2)

```bash
# aafhankelekhede installere en insjtèlle
npm run setup

# elektron- en react-app tegeliekertied oetveure
npm run dev
```

### Probleemoplossinge

Geer kin un `Neet ondersteund platform`-fout tegekomme es geer `npm install` oetveurt. Um dit op te losse, mot u `node_modules` en `package-lock.json` verwijdere en `npm install` oetveure. Dit zou alle nuudige pakkette motte installere die nuudig zien um de app oet te veure.

```shell
# Verwijder node_modules in subdirectories
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; dooch 
rm -rf "$dir"
gedoan

# Package-lock in subdirectories wisse
vinge . -type f -name "package-lock.json" -delete
```

### Teste

```bash
# bruno-sjema-tests oetveure
npm test --workspace=packages/bruno-schema

# tests oetveure euver alle werkruimtes
npm test --workspaces --if-present
```

### Open Pull Requests

- Houw de PR's klein en geriech op ein ding
- Volg de formaat vaan 't make vaan takke 
- feature/[feature name]: Deze tak zou wijziginge motte bevatte veur un specifieke functie 
- Veurbeeld: functie/donkermodus 
- bugfix/[bug name]: Deze branch zou allein bugfixes veur un specifieke fout motte bevatte 
- Veurbeeld bugfix/bug-1
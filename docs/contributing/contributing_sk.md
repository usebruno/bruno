## Urobme bruno lepším, spoločne !!

Sme radi, že chcete vylepšiť Bruna. Nižšie uvádzame pokyny, ako začať používať Bruna na vašom počítači.

### Technologický stack

Bruno je vytvorené pomocou Reactu a používa Electron na dodávanie desktopovej verzie (s podporou lokálnych kolekcií).

Knižnice, ktoré používame

- CSS - Tailwind
- Editory kódu - Codemirror
- Správa stavu - Redux
- Ikony - Ikony Tableru
- Formuláre - formik
- Overenie schémy - Áno
- Request Client - axios
- Filesystem Watcher - chokidar
- i18n - i18next

> [!DÔLEŽITÉ]
> Budete potrebovať [Node v22.x alebo najnovšiu verziu LTS](https://nodejs.org/en/). V projekte používame pracovné priestory npm

## Vývoj

Bruno je desktopová aplikácia. Aplikáciu musíte načítať samostatným spustením frontendu aj aplikácie Electron.

> Poznámka: Pre frontend používame React a pre zostavovací a vývojový server rsbuild.

## Inštalácia závislostí

```bash
# použitie nodejs 22 verzie
nvm použitie

# inštalácia závislostí
npm i --legacy-peer-deps
```

### Lokálny vývoj (Možnosť 1)

```bash
# zostavenie balíčkov
npm run build:graphql-docs
npm run build:bruno-query
npm run build:bruno-common
npm run build:bruno-converters
npm run build:bruno-requests

# knižnice sandboxu bundle js
npm run sandbox:bundle-libraries --workspace=packages/bruno-js

# spustenie aplikácie react (terminál 1)
npm run dev:web

# spustenie aplikácie electron (terminál 2)
npm run dev:electron
```

### Lokálny vývoj (Možnosť 2)

```bash
# inštalácia závislostí a nastavenie
npm run setup

# Súbežné spustenie aplikácií Electron a React
npm run dev
```

### Riešenie problémov

Pri spustení `npm install` sa môže vyskytnúť chyba `Nepodporovaná platforma`. Ak to chcete opraviť, budete musieť odstrániť `node_modules` a `package-lock.json` a spustiť `npm install`. Týmto by sa mali nainštalovať všetky potrebné balíky na spustenie aplikácie.

```shell
# Odstránenie node_modules v podadresároch
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
rm -rf "$dir"
done

# Odstránenie package-lock v podadresároch
find . -type f -name "package-lock.json" -delete
```

### Testovanie

```bash
# spustenie testov bruno-schema
npm test --workspace=packages/bruno-schema

# spustenie testov vo všetkých pracovných priestoroch
npm test --workspaces --if-present
```

### Vytvorenie Pull Requestov

- Prosím, udržujte PR krátke a zamerané na jednu vec
- Prosím, dodržujte formát vytvárania vetiev
- feature/[názov funkcie]: Táto vetva by mala obsahovať zmeny pre konkrétnu funkciu
- Príklad: feature/dark-mode
- bugfix/[názov chyby]: Táto vetva by mala obsahovať iba opravy chýb pre konkrétnu chybu
- Príklad bugfix/bug-1
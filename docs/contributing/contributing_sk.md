## Urobme bruno lepším, spoločne !!

Sme radi, že chcete zlepšiť bruno. Nižšie sú uvedené pokyny, ako začať s výchovou bruno na vašom počítači.

### Technologický zásobník

Bruno je vytvorené pomocou Next.js a React. Na dodávanie desktopovej verzie (ktorá podporuje lokálne kolekcie) používame aj electron.

Balíčky, ktoré používame:

- CSS - Tailwind
- Editory kódu - Codemirror
- Správa stavu - Redux
- Ikony - Tabler Icons
- Formuláre - formik
- Overovanie schém - Yup
- Klient požiadaviek - axios
- Sledovač súborového systému - chokidar

### Závislosti

Budete potrebovať [NodeJS v18.x alebo najnovšiu verziu LTS](https://nodejs.org/en/) a npm versiu 8.x. V projekte používame pracovné priestory npm

## Vývoj

Bruno sa vyvíja ako desktopová aplikácia. Aplikáciu je potrebné načítať spustením aplikácie Next.js v jednom termináli a potom spustiť aplikáciu electron v inom termináli.

### Závislosti

- NodeJS v18

### Miestny vývoj

```bash
# použite verziu nodejs 18
nvm use

# nainštalovať balíčky
npm i --legacy-peer-deps

# zostaviť balíčky
npm run build:graphql-docs
npm run build:bruno-query
npm run build:bruno-common
npm run build:bruno-converters
npm run build:bruno-requests

# spustite ďalšiu aplikáciu (terminál 1)
npm run dev:web

# spustite aplikáciu electron (terminál 2)
npm run dev:electron
```

### Riešenie problémov

Pri spustení `npm install` sa môžete stretnúť s chybou `Unsupported platform`. Ak chcete túto chybu odstrániť, musíte odstrániť súbory `node_modules`, `package-lock.json` a spustiť `npm install`. Tým by sa mali nainštalovať všetky potrebné balíky potrebné na spustenie aplikácie.

```shell
# Odstrániť node_modules v podadresároch
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
  rm -rf "$dir"
done

# Odstráňte package-lock v podadresároch
find . -type f -name "package-lock.json" -delete
```

### Testovanie

````bash
# spustiť bruno-schema testy
npm test --workspace=packages/bruno-schema

# spustiť testy vo všetkých pracovných priestoroch
npm test --workspaces --if-present
```

### Vyrobenie Pull Request

- Prosím, aby PR boli malé a zamerané na jednu vec
- Prosím, dodržujte formát vytvárania vetiev
  - feature/[názov funkcie]: Táto vetva by mala obsahovať zmeny pre konkrétnu funkciu
    - Príklad: feature/dark-mode
  - bugfix/[názov chyby]: Táto vetva by mala obsahovať iba opravy konkrétnej chyby
    - Príklad: bugfix/bug-1

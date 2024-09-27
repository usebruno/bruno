[English](../../contributing.md)

## Haideţi să îmbunătățim Bruno, împreună!!

Ne bucurăm că doriți să îmbunătățiți bruno. Mai jos sunt instrucțiunile pentru ca să porniți bruno pe calculatorul dvs.

### Stack-ul tehnologic

Bruno este construit cu Next.js și React. De asemenea, folosim electron pentru a livra o versiune desktop (care poate folosi colecții locale)

Bibliotecile pe care le folosim

- CSS - Tailwind
- Editori de cod - Codemirror
- Management de condiție - Redux
- Icoane - Tabler Icons
- Formulare - formik
- Validarea schemelor - Yup
- Cererile client - axios
- Observatorul sistemului de fișiere - chokidar

### Dependențele

Veți avea nevoie de [Node v20.x sau cea mai recentă versiune LTS](https://nodejs.org/en/) și npm 8.x. Noi folosim spații de lucru npm în proiect

## Dezvoltarea

Bruno este dezvoltat ca o aplicație desktop. Ca să porniți aplicatia trebuie să rulați aplicația Next.js într-un terminal și apoi să rulați aplicația electron într-un alt terminal.

```shell
# folosiți nodejs versiunea 18
nvm use

# instalați dependențele
npm i --legacy-peer-deps

# construiți documente graphql
npm run build:graphql-docs

# construiți bruno query
npm run build:bruno-query

# rulați aplicația next (terminal 1)
npm run dev:web

# rulați aplicația electron (terminal 2)
npm run dev:electron
```

### Depanare

Este posibil să întâmpinați o eroare `Unsupported platform` când rulați „npm install”. Pentru a remedia acest lucru, va trebui să ștergeți `node_modules` și `package-lock.json` și să rulați `npm install`. Aceasta ar trebui să instaleze toate pachetele necesare pentru a rula aplicația.

```shell
# Ștergeți node_modules din subdirectoare
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
  rm -rf "$dir"
done

# Ștergeți package-lock din subdirectoare
find . -type f -name "package-lock.json" -delete
```

### Testarea

```shell
# bruno-schema
npm test --workspace=packages/bruno-schema

# bruno-lang
npm test --workspace=packages/bruno-lang
```

### Crearea unui Pull Request

- Vă rugăm să păstrați PR-urile mici și concentrate pe un singur lucru
- Vă rugăm să urmați formatul de creare a branchurilor
  - feature/[Numele funcției]: Acest branch ar trebui să conțină modificări pentru o funcție anumită
    - Exemplu: feature/dark-mode
  - bugfix/[Numele eroarei]: Acest branch ar trebui să conţină numai remedieri pentru o eroare anumită
    - Exemplu bugfix/bug-1

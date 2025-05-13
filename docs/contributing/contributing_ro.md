[English](../../contributing.md)

## Haideţi să îmbunătățim Bruno, împreună!!

Ne bucurăm că vrei să-l îmbunătățești pe Bruno. Mai jos sunt instrucțiunile pentru a executa Bruno pe computer.

### Stiva tehnologică

Bruno este construit folosind React și folosește Electron pentru a livra o versiune desktop (cu suport pentru colecții locale).

Biblioteci pe care le folosim

- CSS - Tailwind
- Editori de cod - Codemirror
- Managementul stării - Redux
- Pictograme - Pictograme Tabler
- Formulare - formik
- Validare schemă - Yup
- Client de solicitare - axios
- Observator sistem de fișiere - chokidar
- i18n - i18next

> [!IMPORTANT]
> Vei avea nevoie de [Node v22.x sau cea mai recentă versiune LTS](https://nodejs.org/en/). Folosim spații de lucru npm în proiect

## Dezvoltare

Bruno este o aplicație desktop. Trebuie să încarci aplicația rulând separat atât frontend-ul, cât și aplicația Electron.

> Notă: Folosim React pentru frontend și rsbuild pentru serverul de compilare și dezvoltare.

## Instalare Dependențe

```bash
# se folosește nodejs versiunea 22
nvm use

# se instalează dependențe
npm i --legacy-peer-deps
```

### Dezvoltare Locală (Opțiunea 1)

```bash
# se construiesc pachete
npm run build:graphql-docs
npm run build:bruno-query
npm run build:bruno-common
npm run build:bruno-converters
npm run build:bruno-requests

# bundle js sandbox biblioteci 
npm run sandbox:bundle-libraries --workspace=packages/bruno-js

# se execută react app (terminalul 1)
npm run dev:web

# se execută electron app (terminalul 2)
npm run dev:electron
```

### Dezvoltare Locală (Opțiunea 2)

```bash
# se instalează dependențe și se configurează
npm run setup

# se execută electron și reacționează aplicația concomitent
npm rulează dev
```

### Depanare

Este posibil să întâmpinați o eroare `Platformă neacceptată` atunci când rulați `npm install`. Pentru a remedia acest lucru, va trebui să ștergeți `node_modules` și `package-lock.json` și să rulați `npm install`. Aceasta ar trebui să instaleze toate pachetele necesare pentru a rula aplicația.

```shell
# Șterge node_modules din subdirectoare
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
rm -rf "$dir"
done
# Șterge package-lock din subdirectoare
find . -type f -name "package-lock.json" -delete
```

### Testare

```bash
# rulează teste bruno-schema
npm test --workspace=packages/bruno-schema

# rulează teste în toate spațiile de lucru
npm test --workspaces --if-present
```

### Crearea unui Pull Request

- Vă rugăm să păstrați cererile de extragere (PR) mici și concentrate pe un singur lucru
- Vă rugăm să urmați formatul de creare a ramurilor
- feature/[feature name]: Această ramură ar trebui să conțină modificări pentru o anumită funcționalitate
- Exemplu: feature/dark-mode
- bugfix/[bug name]: Această ramură ar trebui să conțină doar corecții de erori pentru o anumită funcționalitate
- Exemplu bugfix/bug-1
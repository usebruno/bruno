[English](../../contributing.md)

## Insieme, miglioriamo Bruno!

Sono felice di vedere che hai intenzione di migliorare Bruno. Di seguito, troverai le regole e le guide per ripristinare Bruno sul tuo computer.

### Tecnologie utilizzate

Bruno è costruito utilizzando Next.js e React. Utilizziamo anche Electron per incorporare la versione desktop (che consente raccolte locali).

Le librerie che utilizziamo sono:

- CSS - Tailwind
- Code Editors - Codemirror
- State Management - Redux
- Icons - Tabler Icons
- Forms - formik
- Schema Validation - Yup
- Request Client - axios
- Filesystem Watcher - chokidar

### Dependences

Hai bisogno di [Node v20.x o dell'ultima versione LTS](https://nodejs.org/en/) di npm 8.x. Utilizziamo gli spazi di lavoro npm (_npm workspaces_) in questo progetto.

### Iniziamo a codificare

Si prega di fare riferimento alla [documentazione di sviluppo](docs/development_it.md) per le istruzioni su come avviare l'ambiente di sviluppo locale.

### Aprire una richiesta di pull (Pull Request)

- Si prega di mantenere le Pull Request (PR) brevi e concentrate su un singolo obiettivo.
- Si prega di seguire il formato di denominazione dei rami.
  - feature/[feature name]: Questo ramo dovrebbe contenere una specifica funzionalità.
    - Esempio: feature/dark-mode
  - bugfix/[bug name]: Questo ramo dovrebbe contenere solo una soluzione per un bug specifico.
    - Esempio: bugfix/bug-1

## Sviluppo

Bruno è sviluppato come un'applicazione "heavy". È necessario caricare l'applicazione avviando Next.js in una finestra del terminale e quindi avviare l'applicazione Electron in un altro terminale.

### Sviluppo

- NodeJS v18

### Sviluppo locale

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

### Risoluzione dei problemi

Potresti trovare un errore `Unsupported platform` durante l'esecuzione di `npm install`. Per risolvere questo problema, ti preghiamo di eliminare la cartella `node_modules`, il file `package-lock.json` e di seguito nuovamente `npm install`. Qeusto dovrebbe installare tutti i pacchetti necessari per avviare l'applicazione.

```shell
# delete node_modules in sub-directories
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
  rm -rf "$dir"
done

# delete package-lock in sub-directories
find . -type f -name "package-lock.json" -delete
```

### Tests

```bash
# bruno-schema
npm test --workspace=packages/bruno-schema

# bruno-lang
npm test --workspace=packages/bruno-lang
```

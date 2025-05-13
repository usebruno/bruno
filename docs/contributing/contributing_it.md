[English](../../contributing.md)

## Insieme, miglioriamo Bruno!

Sono felice di vedere che hai intenzione di migliorare Bruno. Di seguito, troverai le regole per eseguire Bruno sul tuo computer.

### Stack Tecnologico

Bruno è sviluppato con React e utilizza Electron per la versione desktop (con supporto per le collezioni locali).

Librerie che utilizziamo

- CSS - Tailwind
- Editor di codice - Codemirror
- Gestione dello stato - Redux
- Icone - Icone Tabler
- Form - formik
- Validazione dello schema - Yup
- Client di richiesta - axios
- Filesystem Watcher - chokidar
- i18n - i18next

> [!IMPORTANTE]
> Avrai bisogno di [Node v22.x o l'ultima versione LTS](https://nodejs.org/en/). Utilizziamo spazi di lavoro npm nel progetto.

## Sviluppo

Bruno è un'app desktop. Devi caricare l'app eseguendo separatamente sia il frontend che l'app Electron.

> Nota: utilizziamo React per il frontend e rsbuild per il server di build e sviluppo.

## Installa Dipendenze

```bash
# usa nodejs versione 22
nvm usa

# installa dipendenze
npm i --legacy-peer-deps
```

### Sviluppo Locale (Opzione 1)

```bash
# compila pacchetti
npm run build:graphql-docs
npm run build:bruno-query
npm run build:bruno-common
npm run build:bruno-converters
npm run build:bruno-requests

# raggruppa librerie sandbox js
npm run sandbox:bundle-libraries --workspace=packages/bruno-js

# esegui l'app React (terminale 1)
npm run dev:web

# esegui l'app Electron (terminale 2)
npm run dev:electron
```

### Sviluppo Locale (Opzione 2)

```bash
# installa dipendenze e setup
npm run setup

# esegue le app electron e react contemporaneamente
npm run dev
```

### Risoluzione dei problemi

Potresti riscontrare un errore `Piattaforma non supportata` quando esegui `npm install`. Per risolvere il problema, dovrai eliminare `node_modules` e `package-lock.json` ed eseguire `npm install`. Questo dovrebbe installare tutti i pacchetti necessari per eseguire l'app.

```shell
# Elimina node_modules nelle sottodirectory
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
rm -rf "$dir"
done

# Elimina package-lock nelle sottodirectory
find . -type f -name "package-lock.json" -delete
```

### Test

```bash
# esegue i test di bruno-schema
npm test --workspace=packages/bruno-schema

# esegue i test su tutti gli spazi di lavoro
npm test --workspaces --if-present
```

### Richieste pull aperte

- Si prega di mantenere le richieste di pull brevi e concentrate su un unico argomento
- Si prega di seguire il formato per la creazione di branch
- feature/[nome della feature]: questo branch dovrebbe contenere le modifiche per una feature specifica
- Esempio: feature/dark-mode
- bugfix/[nome del bug]: questo branch dovrebbe contenere solo le correzioni di bug per un bug specifico
- Esempio bugfix/bug-1
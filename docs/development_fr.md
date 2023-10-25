[English](/docs/development.md) | [Українська](/docs/development_ua.md) | [Русский](/docs/development_ru.md) | [Deutsch](/docs/development_de.md) | **Français** | [हिंदी](/docs/development_hi.md)

## Développement

Bruno est développé comme une application de _lourde_. Vous devez charger l'application en démarrant nextjs dans un terminal, puis démarre l'application Electron dans un autre terminal.

### Dépendances

- NodeJS v18

### Développement local

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

### Dépannage

Vous pourriez rencontrer une error  `Unsupported platform` pendant le lancement de `npm install`. Pour résoudre cela, veuillez supprimer le répertoire `node_modules`, le fichier `package-lock.json` et lancer à nouveau `npm install`. Cela devrait isntaller tous les paquets nécessaires pour lancer l'application.

```shell
# Delete node_modules in sub-directories
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
  rm -rf "$dir"
done

# Delete package-lock in sub-directories
find . -type f -name "package-lock.json" -delete
```

### Tests

```bash
# bruno-schema
npm test --workspace=packages/bruno-schema

# bruno-lang
npm test --workspace=packages/bruno-lang
```

[English](/docs/development.md) | [Українська](/docs/development_ua.md) | [Русский](/docs/development_ru.md) | [Türkçe](/contributing_tr.md) | [Deutsch](/docs/development_de.md) | **Français**

## Développement

Bruno est développé en tant qu'application de bureau. Vous devez lancer l'application en exécutant l'application Next.js dans un terminal, puis exécuter l'application Electron dans un autre terminal.

### Dépendances

- NodeJS v18

### Développement Local

```bash
# Utilisez la version 18 de NodeJS
nvm use

# Installer les dépendances
npm i --legacy-peer-deps

# Construire le module graphql-docs
npm run build:graphql-docs

# Construire le module bruno-query
npm run build:bruno-query

# Exécuter l'application Next.js (terminal 1)
npm run dev:web

# Exécuter l'application Electron (terminal 2)
npm run dev:electron
```

### Dépannage

Vous pourriez rencontrer une erreur `Unsupported platform` lorsque vous exécutez `npm install`. Pour résoudre ce problème, vous devrez supprimer le dossier `node_modules` et le fichier `package-lock.json`, puis exécuter `npm install`. Cela devrait installer tous les packages nécessaires pour exécuter l'application.

```shell
# Supprimer node_modules dans les sous-répertoires
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
  rm -rf "$dir"
done

# Supprimer package-lock dans les sous-répertoires
find . -type f -name "package-lock.json" -delete
```

### Tests

```bash
# bruno-schema
npm test --workspace=packages/bruno-schema

# bruno-lang
npm test --workspace=packages/bruno-lang
```

J'espère que cela vous aide. Si vous avez d'autres questions ou si vous avez besoin de plus d'informations, n'hésitez pas à nous le demander !

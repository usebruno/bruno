[English](/docs/development.md) | [Українська](/docs/development_ua.md) | [Русский](/docs/development_ru.md) | [Deutsch](/docs/development_de.md) | **Español**

## Desarrollo

Bruno está siendo desarrollado como una aplicación de escritorio. Para ejecutarlo, primero debes ejecutar la aplicación de nextjs en una terminal y luego ejecutar la aplicación de electron en otra terminal.

### Dependencias

- NodeJS v18

### Desarrollo local

```bash
# Utiliza la versión 18 de nodejs
nvm use

# Instala las dependencias
npm i --legacy-peer-deps

# Construye la documentación de graphql
npm run build:graphql-docs

# Construye bruno-query
npm run build:bruno-query

# Ejecuta la aplicación de nextjs (terminal 1)
npm run dev:web

# Ejecuta la aplicación de electron (terminal 2)
npm run dev:electron
```

### Solución de problemas

Es posible que encuentres un error de `Unsupported platform` cuando ejecutes `npm install`. Para solucionarlo, debes eliminar la carpeta `node_modules` y el archivo `package-lock.json`, luego, ejecuta `npm install`. Lo anterior debería instalar todos los paquetes necesarios para ejecutar la aplicación.

```shell
# Elimina la carpeta node_modules en los subdirectorios
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
  rm -rf "$dir"
done

# Elimina el archivo package-lock en los subdirectorios
find . -type f -name "package-lock.json" -delete
```

### Pruebas

```bash
# bruno-schema
npm test --workspace=packages/bruno-schema

# bruno-lang
npm test --workspace=packages/bruno-lang
```

[English](../../contributing.md)

## ¡Juntos, hagamos a Bruno mejor!

Estamos encantados de que quieras ayudar a mejorar Bruno. A continuación encontrarás las instrucciones para ejecutar Bruno en tu computadora.

### Pila tecnológica

Bruno se creó con React y usa Electron para ofrecer una versión de escritorio (compatible con colecciones locales).

Bibliotecas que usamos

- CSS - Tailwind
- Editores de código - Codemirror
- Gestión de estados - Redux
- Iconos - Iconos de Tabler
- Formularios - Formik
- Validación de esquemas - Yup
- Cliente de solicitudes - axios
- Vigilante del sistema de archivos - chokidar
- i18n - i18next

> [!IMPORTANTE]
> Necesitará [Node v22.x o la última versión LTS](https://nodejs.org/en/). Usamos espacios de trabajo npm en el proyecto.

## Desarrollo

Bruno es una aplicación de escritorio. Debe cargar la aplicación ejecutando el frontend y la aplicación Electron por separado.

> Nota: Usamos React para el frontend y rsbuild para el servidor de compilación y desarrollo.

## Instalar dependencias

```bash
# usar la versión 22 de node.js
nvm usar

# instalar dependencias
npm i --legacy-peer-deps
```

### Desarrollo local (Opción 1)

```bash
# compilar paquetes
npm run build:graphql-docs
npm run build:bruno-query
npm run build:bruno-common
npm run build:bruno-converters
npm run build:bruno-requests

# agrupar bibliotecas de sandbox de JS
npm run sandbox:bundle-libraries --workspace=packages/bruno-js

# ejecutar la aplicación React (terminal 1)
npm run dev:web

# ejecutar la aplicación Electron (terminal 2)
npm run dev:electron
```

### Desarrollo local (Opción 2)

```bash
# instalar dependencias y configurar
npm run setup

# Ejecutar la aplicación Electron y React simultáneamente
npm run dev
```

### Solución de problemas

Es posible que aparezca el error "Plataforma no compatible" al ejecutar `npm install`. Para solucionarlo, deberá eliminar `node_modules` y `package-lock.json` y ejecutar `npm install`. Esto debería instalar todos los paquetes necesarios para ejecutar la aplicación.

```shell
# Eliminar node_modules en subdirectorios
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
rm -rf "$dir"
done

# Eliminar package-lock en subdirectorios
find . -type f -name "package-lock.json" -delete
```

### Pruebas

```bash
# Ejecutar pruebas de bruno-schema
npm test --workspace=packages/bruno-schema

# Ejecutar pruebas en todos los espacios de trabajo
npm test --workspaces --if-present
```

### Crea un Pull Request

- Por favor, mantenga las solicitudes de extracción breves y centradas en un solo objetivo.
- Siga el formato de creación de ramas:

- feature/[nombre de la característica]: Esta rama debe contener cambios para una característica específica.

- Ejemplo: feature/dark-mode

- bugfix/[nombre del error]: Esta rama debe contener solo correcciones para un error específico.

- Ejemplo: bugfix/bug-1
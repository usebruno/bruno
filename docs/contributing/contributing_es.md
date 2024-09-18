[English](../../contributing.md)

## ¡Juntos, hagamos a Bruno mejor!

Estamos encantados de que quieras ayudar a mejorar Bruno. A continuación encontrarás las instrucciones para empezar a trabajar con Bruno en tu computadora.

### Tecnologías utilizadas

Bruno está construido con NextJs y React. También usamos electron para distribuir una versión de escritorio (que soporta colecciones locales).

Librerías que utilizamos:

- CSS - Tailwind
- Editores de código - Codemirror
- Manejo del estado - Redux
- Íconos - Tabler Icons
- Formularios - formik
- Validación de esquemas - Yup
- Cliente de peticiones - axios
- Monitor del sistema de archivos - chokidar

### Dependencias

Necesitarás [Node v20.x o la última versión LTS](https://nodejs.org/es) y npm 8.x. Ten en cuenta que utilizamos espacios de trabajo de npm en el proyecto.

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

### Crea un Pull Request

- Por favor, mantén los Pull Request pequeños y enfocados en una sola cosa.
- Por favor, sigue el siguiente formato para la creación de ramas:
  - feature/[nombre de la funcionalidad]: Esta rama debe contener los cambios para una funcionalidad específica.
    - Ejemplo: feature/dark-mode
  - bugfix/[nombre del error]: Esta rama debe contener solo correcciones de errores para un error específico.
    - Ejemplo: bugfix/bug-1

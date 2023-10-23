[English](/contributing.md) | [Українська](/contributing_ua.md) | [Русский](/contributing_ru.md) | [Türkçe](/contributing_tr.md) | **Español**

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

Necesitarás [Node v18.x o la última versión LTS](https://nodejs.org/es) y npm 8.x. Ten en cuenta que utilizamos espacios de trabajo de npm en el proyecto.

### Comienza a programar

Por favor, consulta [development.md](docs/development_es.md) para obtener instrucciones sobre cómo ejecutar el entorno de desarrollo local.

### Crea un Pull Request

- Por favor, mantén los Pull Request pequeños y enfocados en una sola cosa.
- Por favor, sigue el siguiente formato para la creación de ramas:
  - feature/[nombre de la funcionalidad]: Esta rama debe contener los cambios para una funcionalidad específica.
    - Ejemplo: feature/dark-mode
  - bugfix/[nombre del error]: Esta rama debe contener solo correcciones de errores para un error específico.
    - Ejemplo: bugfix/bug-1

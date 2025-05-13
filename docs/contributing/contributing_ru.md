[English](../../contributing.md)

## Давайте сделаем Bruno лучше вместе!!

Мы рады, что вы хотите улучшить Bruno. Ниже приведены рекомендации по запуску Bruno на вашем компьютере.

### Технологический стек

Bruno создан с использованием React и использует Electron для поставки настольной версии (с поддержкой локальных коллекций).

Библиотеки, которые мы используем

- CSS - Tailwind
- Редакторы кода - Codemirror
- Управление состоянием - Redux
- Значки - Значки Tabler
- Формы - formik
- Проверка схемы - Yup
- Клиент запроса - axios
- Наблюдатель файловой системы - chokidar
- i18n - i18next

> [!ВАЖНО]
> Вам понадобится [Node v22.x или последняя версия LTS](https://nodejs.org/en/). Мы используем рабочие пространства npm в проекте

## Разработка

Bruno — это настольное приложение. Вам нужно загрузить приложение, запустив как фронтенд, так и приложение Electron по отдельности.

> Примечание: мы используем React для фронтенда и rsbuild для сервера сборки и разработки.

## Установка зависимостей

```bash
# использование nodejs 22 версии
nvm использование

# установка зависимостей
npm i --legacy-peer-deps
```

### Локальная разработка (вариант 1)

```bash
# сборка пакетов
npm run build:graphql-docs
npm run build:bruno-query
npm run build:bruno-common
npm run build:bruno-converters
npm run build:bruno-requests

# bundle js sandbox библиотеки
npm run sandbox:bundle-libraries --workspace=packages/bruno-js

# запуск приложения react (терминал 1)
npm run dev:web

# запуск приложения electron (терминал 2)
npm run dev:electron
```

### Локальная разработка (вариант 2)

```bash
# установка зависимостей и настройка
npm run setup

# запустить electron и react app одновременно
npm run dev
```

### Устранение неполадок

Вы можете столкнуться с ошибкой `Unsupported platform` при запуске `npm install`. Чтобы исправить это, вам нужно удалить `node_modules` и `package-lock.json` и запустить `npm install`. Это должно установить все необходимые пакеты, необходимые для запуска приложения.

```shell
# Удалить node_modules в подкаталогах
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
rm -rf "$dir"
done

# Удалить package-lock в подкаталогах
find . -type f -name "package-lock.json" -delete
```

### Тестирование

```bash
# запуск тестов bruno-schema
npm test --workspace=packages/bruno-schema

# запуск тестов по всем рабочим пространствам
npm test --workspaces --if-present
```

### Создание запросов на извлечение

- Пожалуйста, сделайте PR небольшими и сфокусированными на чем-то одном
- Пожалуйста, следуйте формату создания веток
- feature/[имя функции]: эта ветка должна содержать изменения для определенной функции
- Пример: feature/dark-mode
- bugfix/[имя ошибки]: эта ветка должна содержать только исправления для определенной ошибки
- Пример bugfix/bug-1
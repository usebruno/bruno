[English](../../contributing.md)

## Давайте вместе сделаем Бруно лучше!!!

Я рад, что Вы хотите усовершенствовать bruno. Ниже приведены рекомендации по запуску bruno на вашем компьютере.

### Стек

Bruno построен с использованием Next.js и React. Мы также используем electron для поставки десктопной версии ( которая поддерживает локальные коллекции )

Библиотеки, которые мы используем

- CSS - Tailwind
- Редакторы кода - Codemirror
- Управление состоянием - Redux
- Иконки - Tabler Icons
- Формы - formik
- Валидация схем - Yup
- Запросы клиента - axios
- Наблюдатель за файловой системой - chokidar

### Зависимости

Вам потребуется [Node v20.x или последняя версия LTS](https://nodejs.org/en/) и npm 8.x. В проекте мы используем рабочие пространства npm

### Приступим к коду

Пожалуйста, обратитесь к [development_ru.md](docs/development_ru.md) для получения инструкций по запуску локальной среды разработки.

### Создание Pull Request

- Пожалуйста, пусть PR будет небольшим и сфокусированным на одной вещи
- Пожалуйста, соблюдайте формат создания веток
  - feature/[название функции]: Эта ветка должна содержать изменения для конкретной функции
    - Пример: feature/dark-mode
  - bugfix/[название ошибки]: Эта ветка должна содержать только исправления для конкретной ошибки
    - Пример bugfix/bug-1

## Разработка

Bruno разрабатывается как десктопное приложение. Необходимо загрузить приложение, запустив приложение Next.js в одном терминале, а затем запустить приложение electron в другом терминале.

### Зависимости

- NodeJS v18

### Локальная разработка

```bash
# используйте nodejs 18 версии
nvm use

# установите зависимости
npm i --legacy-peer-deps

# билд документации по graphql
npm run build:graphql-docs

# билд bruno query
npm run build:bruno-query

# запустить next приложение ( терминал 1 )
npm run dev:web

# запустить приложение electron ( терминал 2 )
npm run dev:electron
```

### Устранение неисправностей

При запуске `npm install` может возникнуть ошибка `Unsupported platform`. Чтобы исправить это, необходимо удалить `node_modules` и `package-lock.json` и запустить `npm install`. В результате будут установлены все пакеты, необходимые для работы приложения.

```shell
# Удаление node_modules в подкаталогах
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
  rm -rf "$dir"
done

# Удаление package-lock в подкаталогах
find . -type f -name "package-lock.json" -delete
```

### Тестирование

```bash
# bruno-schema
npm test --workspace=packages/bruno-schema

# bruno-lang
npm test --workspace=packages/bruno-lang
```

[English](../../contributing.md)

## Wspólnie uczynijmy Bruno lepszym !!

Cieszymy się, że chcesz ulepszyć Bruno. Poniżej znajdują się wytyczne, jak uruchomić Bruno na swoim komputerze.

### Stos technologiczny

Bruno jest tworzony przy użyciu React i używa Electron do dostarczania wersji desktopowej (z obsługą lokalnych kolekcji).

Biblioteki, których używamy

- CSS - Tailwind
- Edytory kodu - Codemirror
- Zarządzanie stanem - Redux
- Ikony - Ikony Tabler
- Formularze - formik
- Walidacja schematu - Yup
- Klient żądania - axios
- Obserwator systemu plików - chokidar
- i18n - i18next

> [!WAŻNE]
> Potrzebny będzie [Node v22.x lub najnowsza wersja LTS](https://nodejs.org/en/). W projekcie używamy obszarów roboczych npm

## Rozwój

Bruno to aplikacja desktopowa. Musisz załadować aplikację, uruchamiając osobno zarówno frontend, jak i aplikację Electron.

> Uwaga: Używamy React dla frontendu i rsbuild dla serwera build i dev.

## Zainstaluj zależności

```bash
# użyj wersji nodejs 22
użyj nvm

# zainstaluj zależności
npm i --legacy-peer-deps
```

### Lokalny rozwój (opcja 1)

```bash
# kompilacja pakietów
npm run build:graphql-docs
npm run build:bruno-query
npm run build:bruno-common
npm run build:bruno-converters
npm run build:bruno-requests

# pakiet bibliotek piaskownicy js
npm run sandbox:bundle-libraries --workspace=packages/bruno-js

# uruchom aplikację react (terminal 1)
npm run dev:web

# uruchom aplikację electron (terminal 2)
npm run dev:electron
```

### Lokalny rozwój (opcja 2)

```bash
# zainstaluj zależności i skonfiguruj
npm run setup

# uruchom jednocześnie aplikację electron i react
npm run dev
```

### Rozwiązywanie problemów

Podczas uruchamiania `npm install` może wystąpić błąd `Nieobsługiwana platforma`. Aby to naprawić, musisz usunąć `node_modules` i `package-lock.json` i uruchomić `npm install`. Powinno to zainstalować wszystkie niezbędne pakiety potrzebne do uruchomienia aplikacji.

```shell
# Usuń node_modules w podkatalogach
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
rm -rf "$dir"
done

# Usuń package-lock w podkatalogach
find . -type f -name "package-lock.json" -delete
```

### Testowanie

```bash
# uruchom testy bruno-schema
npm test --workspace=packages/bruno-schema

# uruchom testy we wszystkich obszarach roboczych
npm test --workspaces --if-present
```

### Zgłaszanie żądań ściągnięcia

- Proszę zachować małe żądania ściągnięcia i skupić się na jednej rzeczy
- Proszę postępować zgodnie ze schematem tworzenia gałęzi
- feature/[nazwa funkcji]: Ta gałąź powinna zawierać zmiany dla określonej funkcji
- Przykład: feature/dark-mode
- bugfix/[nazwa błędu]: Ta gałąź powinna zawierać tylko poprawki błędów dla określonego błędu
- Przykład bugfix/bug-1
[English](../../contributing.md)

## Wspólnie uczynijmy Bruno lepszym !!

Cieszymy się, że chcesz udoskonalić Bruno. Poniżej znajdziesz wskazówki, jak rozpocząć pracę z Bruno na Twoim komputerze.

### Stos Technologiczny

Bruno jest zbudowane przy użyciu Next.js i React. Używamy również electron do stworzenia wersji desktopowej (która obsługuje lokalne kolekcje)

Biblioteki, których używamy

- CSS - Tailwind
- Edytory Kodu - Codemirror
- Zarządzanie Stanem - Redux
- Ikony - Tabler Icons
- Formularze - formik
- Walidacja Schematu - Yup
- Klient Zapytań - axios
- Obserwator Systemu Plików - chokidar

### Zależności

Będziesz potrzebować [Node v20.x lub najnowszej wersji LTS](https://nodejs.org/en/) oraz npm 8.x. W projekcie używamy npm workspaces

## Rozwój

Bruno jest rozwijane jako aplikacja desktopowa. Musisz załadować aplikację, uruchamiając aplikację Next.js w jednym terminalu, a następnie uruchomić aplikację electron w innym terminalu.

### Zależności

- NodeJS v18

### Lokalny Rozwój

```bash
# użyj wersji nodejs 18
nvm use

# zainstaluj zależności
npm i --legacy-peer-deps

# zbuduj dokumentację graphql
npm run build:graphql-docs

# zbuduj zapytanie bruno
npm run build:bruno-query

# uruchom aplikację next (terminal 1)
npm run dev:web

# uruchom aplikację electron (terminal 2)
npm run dev:electron
```

### Rozwiązywanie Problemów

Możesz napotkać błąd `Unsupported platform` podczas uruchamiania `npm install`. Aby to naprawić, będziesz musiał usunąć `node_modules` i `package-lock.json`, a następnie uruchomić `npm install`. Powinno to zainstalować wszystkie niezbędne pakiety potrzebne do uruchomienia aplikacji.

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
# bruno-schema
npm test --workspace=packages/bruno-schema

# bruno-lang
npm test --workspace=packages/bruno-lang
```

### Tworzenie Pull Request

- Prosimy, aby PR były małe i skoncentrowane na jednej rzeczy
- Prosimy przestrzegać formatu tworzenia gałęzi
  - feature/[nazwa funkcji]: Ta gałąź powinna zawierać zmiany dotyczące konkretnej funkcji
    - Przykład: feature/dark-mode
  - bugfix/[nazwa błędu]: Ta gałąź powinna zawierać tylko poprawki dla konkretnego błędu
    - Przykład bugfix/bug-1

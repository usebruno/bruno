[English](../../contributing.md)

## Mari buat Bruno lebih baik, bersama!!

Kami senang Anda ingin meningkatkan Bruno. Berikut adalah panduan untuk menjalankan Bruno di komputer Anda.

### Stack Teknologi

Bruno dibangun menggunakan React dan Electron.

Library yang kami gunakan

- CSS - Tailwind
- Code Editors - Codemirror
- State Management - Redux
- Icons - Tabler Icons
- Forms - formik
- Schema Validation - Yup
- Request Client - axios
- Filesystem Watcher - chokidar
- i18n - i18next

> [!IMPORTANT]
> Anda memerlukan [Node v22.x atau versi LTS terbaru](https://nodejs.org/en/). Kami menggunakan npm workspaces dalam proyek ini

## Pengembangan

Bruno adalah aplikasi desktop. Berikut adalah instruksi untuk menjalankan Bruno.

> Catatan: Kami menggunakan React untuk frontend dan rsbuild untuk build dan dev server.

## Install Dependencies

```bash
#  gunakan nodejs versi 22
nvm use

# install deps
npm i --legacy-peer-deps
```

### Pengembangan Lokal

#### Build packages

##### Option 1

```bash
# build packages
npm run build:graphql-docs
npm run build:bruno-query
npm run build:bruno-common
npm run build:bruno-converters
npm run build:bruno-requests
npm run build:schema-types
npm run build:bruno-filestore

# bundle js sandbox libraries
npm run sandbox:bundle-libraries --workspace=packages/bruno-js
```

##### Option 2

```bash
# install dependencies and setup
npm run setup
```

#### Run the app

##### Option 1

```bash
# jalankan react app (terminal 1)
npm run dev:web

# jalankan electron app (terminal 2)
npm run dev:electron
```

##### Option 2

```bash
# jalankan electron dan react app secara bersamaan
npm run dev
```

#### Customize Electron `userData` path

Jika `ELECTRON_USER_DATA_PATH` env-variable tersedia dan dalam mode development, maka `userData` path akan dimodifikasi sesuai.

e.g.

```sh
ELECTRON_USER_DATA_PATH=$(realpath ~/Desktop/bruno-test) npm run dev:electron
```

Ini akan membuat folder bruno-test di Desktop Anda dan menggunakannya sebagai `userData` path.

### Pemecahan Masalah

Anda mungkin mengalami error `Unsupported platform` ketika menjalankan `npm install`. Untuk memperbaikinya, Anda perlu menghapus `node_modules` dan `package-lock.json` lalu menjalankan `npm install`. Ini akan menginstal semua paket yang diperlukan untuk menjalankan aplikasi.

```shell
# Hapus node_modules di sub-direktori
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
  rm -rf "$dir"
done

# Hapus package-lock di sub-direktori
find . -type f -name "package-lock.json" -delete
```

### Testing

```bash
# jalankan bruno-schema tests
npm run test --workspace=packages/bruno-schema

# jalankan bruno-query tests
npm run test --workspace=packages/bruno-query

# jalankan bruno-common tests
npm run test --workspace=packages/bruno-common

# jalankan bruno-converters tests
npm run test --workspace=packages/bruno-converters

# jalankan bruno-app tests
npm run test --workspace=packages/bruno-app

# jalankan bruno-electron tests
npm run test --workspace=packages/bruno-electron

# jalankan bruno-lang tests
npm run test --workspace=packages/bruno-lang

# jalankan bruno-toml tests
npm run test --workspace=packages/bruno-toml

# jalankan tests untuk semua workspaces
npm test --workspaces --if-present
```

### Membuat Pull Request

- Harap buat PR yang kecil dan fokus pada satu hal
- Harap ikuti format pembuatan branch
  - fitur/[nama fitur]: Branch ini harus berisi perubahan untuk fitur tertentu
    - Contoh: fitur/dark-mode
  - bugfix/[nama bug]: Branch ini harus hanya berisi perbaikan bug untuk bug tertentu
    - Contoh: bugfix/bug-1

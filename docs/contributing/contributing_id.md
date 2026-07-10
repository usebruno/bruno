## Mari kita buat Bruno lebih baik bersama-sama!!

Kami senang Anda ingin meningkatkan kinerja Bruno. Berikut adalah panduan untuk menjalankan Bruno di komputer Anda.

### Tumpukan Teknologi

Bruno dibangun menggunakan React dan Electron.

Perpustakaan yang kami gunakan

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
> Anda memerlukan [Node v22.x atau versi LTS terbaru](https://nodejs.org/en/). Kami menggunakan npm workspaces dalam proyek ini.

## Perkembangan

Bruno adalah aplikasi desktop. Berikut adalah petunjuk untuk menjalankan Bruno.

> Catatan: Kami menggunakan React untuk frontend dan rsbuild untuk build dan server pengembangan.

## Instal Dependensi

```bash
# gunakan nodejs versi 22
nvm use

# instal dependensi
npm i --legacy-peer-deps
```

### Pengembangan Lokal

#### Membangun paket

##### Opsi 1

```bash
# membangun paket
npm run build:graphql-docs
npm run build:bruno-query
npm run build:bruno-common
npm run build:bruno-converters
npm run build:bruno-requests
npm run build:schema-types
npm run build:bruno-filestore

# bundel pustaka sandbox js
npm run sandbox:bundle-libraries --workspace=packages/bruno-js
```

##### Opsi 2

```bash
# instal dependensi dan pengaturan
npm run setup
```

#### Sesuaikan jalur `userData` Electron

Jika variabel lingkungan `ELECTRON_USER_DATA_PATH` ada dan mode pengembangan diaktifkan, maka jalur `userData` akan dimodifikasi sesuai kebutuhan.

Contoh:

```sh
ELECTRON_USER_DATA_PATH=$(realpath ~/Desktop/bruno-test) npm run dev:electron
```

Ini akan membuat folder `bruno-test` di Desktop Anda dan menggunakannya sebagai jalur `userData`.

### Pemecahan Masalah

Anda mungkin menemui kesalahan `Platform tidak didukung` saat menjalankan `npm install`. Untuk memperbaikinya, Anda perlu menghapus `node_modules` dan `package-lock.json` lalu menjalankan `npm install`. Ini akan menginstal semua yang diperlukan.

```shell
# Hapus node_modules di subdirektori
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do

rm -rf "$dir"
done

# Hapus package-lock di subdirektori
find . -type f -name "package-lock.json" -delete
```

### Pengujian

```bash
# jalankan pengujian bruno-schema
npm run test --workspace=packages/bruno-schema

# jalankan pengujian bruno-query
npm run test --workspace=packages/bruno-query

# jalankan pengujian bruno-common
npm run test --workspace=packages/bruno-common

# jalankan pengujian bruno-converters
npm run test --workspace=packages/bruno-converters

# jalankan pengujian bruno-app
npm run test --workspace=packages/bruno-app

# jalankan pengujian bruno-electron
npm run test --workspace=packages/bruno-electron

# jalankan pengujian bruno-lang
npm run test --workspace=packages/bruno-lang

# jalankan pengujian bruno-toml
npm run test --workspace=packages/bruno-toml

# jalankan pengujian di semua ruang kerja
npm test --workspaces --if-present
```

### Mengajukan Pull Request

- Mohon agar permintaan pull request (PR) berukuran kecil dan fokus pada satu hal saja.
- Harap ikuti format pembuatan cabang
  - feature/[nama fitur]: Cabang ini harus berisi perubahan untuk fitur tertentu
    - Contoh: feature/mode-gelap
  - bugfix/[nama bug]: Cabang ini hanya boleh berisi perbaikan bug untuk bug tertentu.
    - Contoh: bugfix/bug-1

**Tiếng Việt**
| [English](../../contributing.md)
| [Українська](./contributing_ua.md)
| [Русский](./contributing_ru.md)
| [Türkçe](./contributing_tr.md)
| [Deutsch](./contributing_de.md)
| [Français](./contributing_fr.md)
| [Português (BR)](./contributing_pt_br.md)
| [한국어](./contributing_kr.md)
| [বাংলা](./contributing_bn.md)
| [Español](./contributing_es.md)
| [Italiano](./contributing_it.md)
| [Română](./contributing_ro.md)
| [Polski](./contributing_pl.md)
| [简体中文](./contributing_cn.md)
| [正體中文](./contributing_zhtw.md)
| [日本語](./contributing_ja.md)
| [हिंदी](./contributing_hi.md)
| [Dutch](./contributing_nl.md)
| [فارسی](./contributing_fa.md)

## Cùng nhau làm Bruno tốt hơn!!

Chúng tôi rất vui khi bạn muốn cải thiện Bruno. Dưới đây là hướng dẫn để chạy Bruno trên máy tính của bạn.

### Công nghệ sử dụng

Bruno được xây dựng bằng React và Electron.

Các thư viện chúng tôi sử dụng

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
> Bạn cần dùng [Node v22.x hoặc phiên bản LTS mới nhất](https://nodejs.org/en/). Dự án sử dụng npm workspaces

## Phát triển

Bruno là một ứng dụng desktop. Dưới đây là hướng dẫn chạy Bruno.

> Lưu ý: Chúng tôi dùng React cho frontend và rsbuild cho build/dev server.

## Cài đặt dependencies

```bash
# use nodejs 22 version
nvm use

# install deps
npm i --legacy-peer-deps
```

### Phát triển cục bộ

#### Build packages

##### Tùy chọn 1

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

##### Tùy chọn 2

```bash
# install dependencies and setup
npm run setup
```

#### Chạy ứng dụng

##### Tùy chọn 1

```bash
# run react app (terminal 1)
npm run dev:web

# run electron app (terminal 2)
npm run dev:electron
```

##### Tùy chọn 2

```bash
# run electron and react app concurrently
npm run dev
```

#### Tùy chỉnh đường dẫn `userData` của Electron

Nếu biến môi trường `ELECTRON_USER_DATA_PATH` tồn tại và đang ở chế độ development, đường dẫn `userData` sẽ được thay đổi tương ứng.

ví dụ:

```sh
ELECTRON_USER_DATA_PATH=$(realpath ~/Desktop/bruno-test) npm run dev:electron
```

Lệnh này sẽ tạo thư mục `bruno-test` trên Desktop và dùng thư mục đó làm đường dẫn `userData`.

### Khắc phục sự cố

Bạn có thể gặp lỗi `Unsupported platform` khi chạy `npm install`. Để khắc phục, bạn cần xóa `node_modules` và `package-lock.json`, sau đó chạy lại `npm install`. Việc này sẽ cài đặt đầy đủ các package cần thiết để chạy ứng dụng.

```shell
# Delete node_modules in sub-directories
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
  rm -rf "$dir"
done

# Delete package-lock in sub-directories
find . -type f -name "package-lock.json" -delete
```

### Kiểm thử

```bash
# run bruno-schema tests
npm run test --workspace=packages/bruno-schema

# run bruno-query tests
npm run test --workspace=packages/bruno-query

# run bruno-common tests
npm run test --workspace=packages/bruno-common

# run bruno-converters tests
npm run test --workspace=packages/bruno-converters

# run bruno-app tests
npm run test --workspace=packages/bruno-app

# run bruno-electron tests
npm run test --workspace=packages/bruno-electron

# run bruno-lang tests
npm run test --workspace=packages/bruno-lang

# run bruno-toml tests
npm run test --workspace=packages/bruno-toml

# run tests over all workspaces
npm test --workspaces --if-present
```

### Tạo Pull Request

- Vui lòng giữ PR nhỏ và tập trung vào một việc
- Vui lòng tuân theo định dạng đặt tên branch
  - feature/[feature name]: Branch này chỉ nên chứa thay đổi cho một tính năng cụ thể
    - Ví dụ: feature/dark-mode
  - bugfix/[bug name]: Branch này chỉ nên chứa các bản sửa lỗi cho một lỗi cụ thể
    - Ví dụ: bugfix/bug-1

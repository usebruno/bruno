[English](../../contributing.md)

## Cùng nhau làm cho Bruno tốt hơn!

Chúng tôi rất vui vì bạn đang muốn cải thiện Bruno. Dưới đây là các hướng dẫn để chạy Bruno trên máy tính của bạn.

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
> Bạn cần [Node v22.x hoặc phiên bản LTS mới nhất](https://nodejs.org/en/). Chúng tôi sử dụng npm workspaces trong dự án này.

## Phát triển

Bruno là một ứng dụng desktop. Dưới đây là hướng dẫn để chạy Bruno.

> Lưu ý: Chúng tôi sử dụng React cho frontend và rsbuild cho build và dev server.

## Cài đặt các phụ thuộc

```bash
# sử dụng nodejs phiên bản 22
nvm use

# cài đặt các phụ thuộc
npm i --legacy-peer-deps
```

### Phát triển cục bộ

#### Build các package

##### Tùy chọn 1

```bash
# build các package
npm run build:graphql-docs
npm run build:bruno-query
npm run build:bruno-common
npm run build:bruno-converters
npm run build:bruno-requests
npm run build:schema-types
npm run build:bruno-filestore

# đóng gói các thư viện js sandbox
npm run sandbox:bundle-libraries --workspace=packages/bruno-js
```

##### Tùy chọn 2

```bash
# cài đặt các phụ thuộc và thiết lập
npm run setup
```

#### Chạy ứng dụng

##### Tùy chọn 1

```bash
# chạy ứng dụng react (terminal 1)
npm run dev:web

# chạy ứng dụng electron (terminal 2)
npm run dev:electron
```

##### Tùy chọn 2

```bash
# chạy đồng thời electron và ứng dụng react
npm run dev
```

#### Tùy chỉnh đường dẫn `userData` của Electron

Nếu biến môi trường `ELECTRON_USER_DATA_PATH` tồn tại và ở chế độ phát triển, thì đường dẫn `userData` sẽ được điều chỉnh tương ứng.

ví dụ.

```sh
ELECTRON_USER_DATA_PATH=$(realpath ~/Desktop/bruno-test) npm run dev:electron
```

Lệnh này sẽ tạo một thư mục `bruno-test` trên Desktop của bạn và sử dụng nó làm đường dẫn `userData`.

### Khắc phục sự cố

Bạn có thể gặp lỗi `Unsupported platform` khi chạy `npm install`. Để khắc phục, bạn sẽ cần xóa `node_modules` và `package-lock.json` rồi chạy lại `npm install`. Lệnh này sẽ cài đặt tất cả các package cần thiết để chạy ứng dụng.

```shell
# Xóa node_modules trong các thư mục con
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
  rm -rf "$dir"
done

# Xóa package-lock trong các thư mục con
find . -type f -name "package-lock.json" -delete
```

### Kiểm thử

```bash
# chạy các test của bruno-schema
npm run test --workspace=packages/bruno-schema

# chạy các test của bruno-query
npm run test --workspace=packages/bruno-query

# chạy các test của bruno-common
npm run test --workspace=packages/bruno-common

# chạy các test của bruno-converters
npm run test --workspace=packages/bruno-converters

# chạy các test của bruno-app
npm run test --workspace=packages/bruno-app

# chạy các test của bruno-electron
npm run test --workspace=packages/bruno-electron

# chạy các test của bruno-lang
npm run test --workspace=packages/bruno-lang

# chạy các test của bruno-toml
npm run test --workspace=packages/bruno-toml

# chạy các test trên tất cả các workspace
npm test --workspaces --if-present
```

### Tạo Pull Request

- Vui lòng giữ cho PR nhỏ gọn và tập trung vào một việc
- Vui lòng tuân theo quy ước đặt tên nhánh
  - feature/[tên tính năng]: Nhánh này nên chứa các thay đổi cho một tính năng cụ thể
    - Ví dụ: feature/dark-mode
  - bugfix/[tên lỗi]: Nhánh này chỉ nên chứa các bản sửa lỗi cho một lỗi cụ thể
    - Ví dụ: bugfix/bug-1

[English](../../contributing.md) | [Українська](docs/contributing/contributing_ua.md) | [Русский](docs/contributing/contributing_ru.md) | [Türkçe](docs/contributing/contributing_tr.md) | [Deutsch](docs/contributing/contributing_de.md) | [Français](docs/contributing/contributing_fr.md) | [Português (BR)](docs/contributing/contributing_pt_br.md) | [বাংলা](docs/contributing/contributing_bn.md) | [Español](docs/contributing/contributing_es.md) | [Română](docs/contributing/contributing_ro.md) | [Polski](docs/contributing/contributing_pl.md)
| [简体中文](docs/contributing/contributing_cn.md) | [正體中文](docs/contributing/contributing_zhtw.md) | **日本語**

## 一緒に Bruno をよりよいものにしていきましょう！！

Bruno を改善していただけるのは歓迎です。以下はあなたの環境で Bruno を起動するためのガイドラインです。

### 技術スタック

Bruno は Next.js と React で作られています。デスクトップアプリ(ローカルのコレクションに対応しています)には electron も使用しています。

使用ライブラリ

- CSS - Tailwind
- Code Editors - Codemirror
- State Management - Redux
- Icons - Tabler Icons
- Forms - formik
- Schema Validation - Yup
- Request Client - axios
- Filesystem Watcher - chokidar

### 依存関係

[Node v18.x もしくは最新の LTS バージョン](https://nodejs.org/en/)と npm 8.x が必要です。プロジェクトに npm ワークスペースを使用しています。

## 開発

Bruno はデスクトップアプリとして開発されています。一つのターミナルで Next.js アプリを立ち上げ、もう一つのターミナルで electron アプリを立ち上げてアプリを読み込む必要があります。

### ローカル環境での開発

```bash
# use nodejs 18 version
nvm use

# install deps
npm i --legacy-peer-deps

# build packages
npm run build:graphql-docs
npm run build:bruno-query
npm run build:bruno-common

# run next app (terminal 1)
npm run dev:web

# run electron app (terminal 2)
npm run dev:electron
```

### トラブルシューティング

`npm install`を実行すると、`Unsupported platform`エラーに遭遇することがあります。これを直すためには、`node_modules`と`package-lock.json`を削除し、`npm install`を実行しなおす必要があります。これにより、アプリを動かすのに必要なパッケージがすべてインストールされます。

```shell
# Delete node_modules in sub-directories
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
  rm -rf "$dir"
done

# Delete package-lock in sub-directories
find . -type f -name "package-lock.json" -delete
```

### テストを動かすには

```bash
# bruno-schema
npm test --workspace=packages/bruno-schema

# bruno-lang
npm test --workspace=packages/bruno-lang
```

### プルリクエストの手順

- プルリクエストは小規模で、一つのことにフォーカスしたものにしてください。
- 以下のフォーマットに従ってブランチを作ってください。
  - feature/[feature name]: このブランチには特定の機能に対する変更を含んでください。
    - 例: feature/dark-mode
  - bugfix/[bug name]: このブランチには特定のバグに対する修正のみを含むようにしてください。
    - 例: bugfix/bug-1

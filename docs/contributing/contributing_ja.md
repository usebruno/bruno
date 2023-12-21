[English](/contributing.md) | [Українська](docs/contributing/contributing_ua.md) | [Русский](docs/contributing/contributing_ru.md) | [Türkçe](docs/contributing/contributing_tr.md) | [Deutsch](docs/contributing/contributing_de.md) | [Français](docs/contributing/contributing_fr.md) | [Português (BR)](docs/contributing/contributing_pt_br.md) | [বাংলা](docs/contributing/contributing_bn.md) | [Español](docs/contributing/contributing_es.md) | [Română](docs/contributing/contributing_ro.md) | [Polski](docs/contributing/contributing_pl.md) | **日本語** 

## 一緒にbrunoをより良くしましょう！！

Brunoの改善をお考えいただき、うれしく思います。以下は、あなたのコンピュータでBrunoを起動するためのガイドラインです。

### 技術スタック

Brunoは、Next.jsとReactを使用して構築されています。また、ローカルコレクションをサポートするデスクトップバージョンを提供するためにElectronも使用しています。

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

[Node v18.xまたは最新のLTSバージョン](https://nodejs.org/en/)とnpm 8.xが必要です。このプロジェクトではnpm workspaceを使用しています。

## 開発

Brunoはデスクトップアプリとして開発されています。1つのターミナルでNext.jsアプリを実行し、別のターミナルでElectronアプリを実行することで、アプリをロードする必要があります。

### 依存関係

- NodeJS v18

### ローカル開発

```bash
# use nodejs 18 version
nvm use

# install deps
npm i --legacy-peer-deps

# build graphql docs
npm run build:graphql-docs

# build bruno query
npm run build:bruno-query

# run next app (terminal 1)
npm run dev:web

# run electron app (terminal 2)
npm run dev:electron
```

### トラブルシューティング

`npm install`を実行する際に`Unsupported platform`エラーに遭遇することがあります。これを解決するには、`node_modules`と`package-lock.json`を削除してから`npm install`を再実行する必要があります。これにより、アプリを実行するために必要なすべてのパッケージがインストールされるはずです。

```shell
# Delete node_modules in sub-directories
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
  rm -rf "$dir"
done

# Delete package-lock in sub-directories
find . -type f -name "package-lock.json" -delete
```

### テスト

```bash
# bruno-schema
npm test --workspace=packages/bruno-schema

# bruno-lang
npm test --workspace=packages/bruno-lang
```

### プルリクエストの提出

- プルリクエストは小さく、一つのことに集中したものにしてください
- ブランチの命名形式に従ってください
  - feature/[機能名]：このブランチには特定の機能に関する変更が含まれるべきです
    - 例：feature/dark-mode
  - bugfix/[バグ名]：このブランチには特定のバグに対するバグ修正のみを含むべきです
    - 例：bugfix/bug-1


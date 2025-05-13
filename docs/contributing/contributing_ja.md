[English](../../contributing.md)

## Bruno の改善にご興味をお持ちいただき、大変嬉しく思います。以下は、お使いのコンピューターで Bruno を実行するためのガイドラインです。

### テクノロジースタック

Bruno は React を使用して構築されており、デスクトップ版（ローカルコレクションをサポート）は Electron を使用しています。

使用しているライブラリ

- CSS - Tailwind
- コードエディター - Codemirror
- 状態管理 - Redux
- アイコン - Tabler Icons
- フォーム - formik
- スキーマ検証 - Yup
- リクエストクライアント - axios
- ファイルシステムウォッチャー - chokidar
- i18n - i18next

> [!重要]
> [Node v22.x または最新の LTS バージョン](https://nodejs.org/en/) が必要です。このプロジェクトでは npm ワークスペースを使用しています。

## 開発

Bruno はデスクトップアプリです。フロントエンドと Electron アプリを別々に実行してアプリをロードする必要があります。

> 注: フロントエンドには React を使用し、ビルドと開発サーバーには rsbuild を使用しています。

## 依存関係のインストール

```bash
# Node.js 22 バージョンを使用
nvm use

# 依存関係のインストール
npm i --legacy-peer-deps
```

### ローカル開発 (オプション 1)

```bash
# パッケージのビルド
npm run build:graphql-docs
npm run build:bruno-query
npm run build:bruno-common
npm run build:bruno-converters
npm run build:bruno-requests

# JS サンドボックスライブラリのバンドル
npm run sandbox:bundle-libraries --workspace=packages/bruno-js

# React アプリの実行 (ターミナル 1)
npm run dev:web

# Electron アプリの実行 (ターミナル 2)
npm run dev:electron
```

### ローカル開発 (オプション 2)

```bash
# 依存関係のインストールとセットアップ
npm run setup

# Electron と React アプリを同時に実行
npm run dev
```

### トラブルシューティング

`npm install` を実行すると、`Unsupported platform` エラーが発生する場合があります。このエラーを修正するには、`node_modules` と `package-lock.json` を削除し、`npm install` を実行する必要があります。これにより、アプリの実行に必要なすべてのパッケージがインストールされます。

```shell
# サブディレクトリ内の node_modules を削除
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
rm -rf "$dir"
done

# サブディレクトリ内の package-lock を削除
find . -type f -name "package-lock.json" -delete
```

### テスト

```bash
# bruno-schema テストを実行
npm test --workspace=packages/bruno-schema

# すべてのワークスペースでテストを実行
npm test --workspaces --if-present
```

### プルリクエストの提出

- PR は小規模で、1 つの点に絞ってください。
- ブランチ作成の形式に従ってください。
- feature/[機能名]: このブランチには、特定の機能の変更のみを含めてください。
- 例: feature/dark-mode
- bugfix/[バグ名]: このブランチには、特定のバグに対するバグ修正のみを含めてください。
- 例: bugfix/bug-1
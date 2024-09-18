[English](../../contributing.md)

## 讓我們一起來讓 Bruno 變得更好！

我們很高興您希望一同改善 Bruno。以下是在您的電腦上開始運行 Bruno 的規則及指南。

### 技術細節

Bruno 使用 Next.js 和 React 構建。我們使用 Electron 來封裝及發佈桌面版本。

我們使用的函式庫：

- CSS - Tailwind
- 程式碼編輯器 - Codemirror
- 狀態管理 - Redux
- Icons - Tabler Icons
- 表單 - formik
- 結構驗證- Yup
- 請求用戶端 - axios
- 檔案系統監測 - chokidar

### 依賴關係

您需要使用 [Node v20.x 或最新的 LTS 版本](https://nodejs.org/en/) 和 npm 8.x。我們在這個專案中使用 npm 工作區（_npm workspaces_）。

## 開發

Bruno 正以桌面應用程式的形式開發。您需要在一個終端機中執行 Next.js 來載入應用程式，然後在另一個終端機中執行 electron 應用程式。

### 開發依賴

- NodeJS v18

### 本地開發

```bash
# 使用 nodejs 第 18 版
nvm use

# 安裝相依套件（使用--legacy-peer-deps 解決套件相依性問題）
npm i --legacy-peer-deps

# 建立 graphql 文件
npm run build:graphql-docs

# 建立 bruno 查詢
npm run build:bruno-query

# 執行 next 應用程式（終端機 1）
npm run dev:web

# 執行 electron 應用程式（終端機 2）
npm run dev:electron
```

### 故障排除

在執行 `npm install` 時，您可能會遇到 `Unsupported platform` 的錯誤訊息。爲了解決這個問題，您需要刪除 `node_modules` 資料夾和 `package-lock.json` 檔案，然後再執行一次 `npm install`。這應該能重新安裝應用程式所需的套件。

```shell
# 刪除子資料夾中的 node_modules 資料夾
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
  rm -rf "$dir"
done

# 刪除子資料夾中的 package-lock.json 檔案
find . -type f -name "package-lock.json" -delete
```

### 測試

```bash
# bruno-schema
npm test --workspace=packages/bruno-schema

# bruno-lang
npm test --workspace=packages/bruno-lang
```

### 發送 Pull Request

- 請保持 PR 精簡並專注於一個目標
- 請遵循建立分支的格式：
  - feature/[feature name]：該分支應包含特定功能的更改
    - 範例：feature/dark-mode
  - bugfix/[bug name]：該分支應僅包含特定 bug 的修復
    - 範例：bugfix/bug-1

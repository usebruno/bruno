[English](../../contributing.md)

## 讓我們一起讓布魯諾變得更好！ ！

我們很高興您正在尋求提高布魯諾。以下是在您的電腦上運行 Bruno 的指南。

### 技術堆疊

Bruno 使用 React 構建，並使用 Electron 發布桌面版本（支援本地集合）。

我們使用的圖書館

- CSS - 順風
- 程式碼編輯器 - Codemirror
- 狀態管理 - Redux
- 圖標 - Tabler 圖標
- 表格 - formik
- 模式驗證 - 是的
- 請求客戶端 - axios
- 檔案系統觀察器 - chokidar
- 國際化 - i18next

> [!重要]
> 您需要 [Node v22.x 或最新的 LTS 版本](https://nodejs.org/en/)。我們在專案中使用 npm 工作區

＃＃ 發展

Bruno 是一款桌面應用程式。您需要透過分別運行前端和 Electron 應用程式來載入該應用程式。

> 注意：我們使用 React 作為前端，使用 rsbuild 作為建置和開發伺服器。


## 安裝依賴項

```bash
# 使用 nodejs 22 版本
nvm 使用

# 安裝依賴項
npm i --legacy-peer-deps
```

### 本機開發（選項 1）

```bash
# 建置包
npm 運行 build:graphql-docs
npm 運行 build:bruno-query
npm 運行 build:bruno-common
npm 運行 build:bruno-converters
npm 運行 build:bruno-requests

# bundle js 沙盒庫
npm 運行沙箱：bundle-libraries --workspace=packages/bruno-js

# 運行 React 應用程式（終端 1）
npm 運行 dev:web

# 運行 Electron 應用程式（終端機 2）
npm 運行 dev:electron
```

### 本機開發（選項 2）

```bash
# 安裝依賴項並設定
npm 運行設定

# 同時運行 electron 和 react 應用
npm 運行 dev
```

### 故障排除

執行"npm install"時，您可能會遇到"不支援的平台"錯誤。要解決此問題，您需要刪除"node_modules"和"package-lock.json"並執行"npm install"。這應該安裝運行應用程式所需的所有必要軟體包。

```殼
# 刪除子目錄中的 node_modules
尋找./-type d-name"node_modules"-print0|而讀-d $'\0'目錄；做
rm -rf"$dir"
完畢

# 刪除子目錄中的 package-lock
尋找 。 -type f -name"package-lock.json"-刪除
```

### 測試

```bash
# 執行 bruno-schema 測試
npm test --workspace=packages/bruno-schema

# 在所有工作區上執行測試
npm test --workspaces --if-present
```

### 發起 Pull 請求

- 請保持 PR 規模小，並專注於一件事
- 請遵循建立分支的格式
- feature/[feature name]：此分支應包含特定功能的更改
- 例如：feature/dark-mode
- bugfix/[bug name]：此分支應僅包含針對特定 bug 的修復
- 範例 bugfix/bug-1
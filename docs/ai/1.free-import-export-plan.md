# Bruno 免费导入导出实现方案

## 一、背景分析

### 1.1 核心发现

经过对 `packages/bruno-app` 和 `packages/bruno-electron` 的全面代码审查：

**当前开源代码中不存在任何导入导出的会员付费限制。**

| 检查项 | 结果 |
|--------|------|
| 许可证验证代码 | **不存在** |
| 功能门控（`isPro`/`isPremium`/`canImport`/`canExport`） | **不存在** |
| IPC 许可证校验 Handler | **不存在** |
| 导入/导出 UI 的 paywall 拦截 | **不存在** |
| `GoldenEdition` 付费弹窗组件 | 存在但**从未被引用**（死代码） |

**结论**：官方收费版本的会员校验代码是闭源的，不在公开仓库中。直接从这份开源源码构建即可获得**完全免费的导入导出功能**，无需任何代码修改。

---

## 二、导入导出功能代码全景

### 2.1 导入（Import）功能链路

```
用户点击 "Import Collection"
    │
    ▼
UI 入口（3 个入口点）
├── CollectionsSection/index.js      — 侧边栏 "+" 菜单 → "Import collection"
├── WorkspaceOverview/index.js       — 工作区概览页 "Import Collection" 按钮
└── WelcomeModal/index.js            — 首次启动引导弹窗的导入入口
    │
    ▼
ImportCollection/index.js            — 导入弹窗（3 个 Tab）
├── FileTab.js                        — 拖放/浏览文件（JSON/YAML/WSDL/ZIP）
├── GitHubTab.js                      — Git 仓库导入
└── UrlTab.js                         — URL 导入
    │
    ▼
ImportCollectionLocation/index.js    — 选择存放位置 + 格式转换
    │ convertCollection() 支持 7 种格式：
    │   openapi → convertOpenapiToBruno()
    │   postman → postmanToBruno()
    │   insomnia → convertInsomniaToBruno()
    │   bruno → processBrunoCollection()
    │   opencollection → processOpenCollection()
    │   wsdl → wsdlToBruno()
    │   bruno-zip → 直接传递（无需转换）
    │
    ▼
Redux Action: importCollection()      — collections/actions.js
    │
    ▼
IPC: renderer:import-collection       — bruno-electron/src/ipc/collection.js
    │ 在文件系统创建 .bru/.yml 文件和目录结构
    │
    ▼
BulkImportCollectionLocation/index.js — 批量导入界面（多文件选择时）
```

### 2.2 导出（Export）功能链路

```
用户右键 Collection → "Share"
    │
    ▼
Collection/index.js                   — 右键菜单 "Share" 选项
    │
    ▼
ShareCollection/index.js              — 导出弹窗（3 种格式）
├── Bruno Collection (ZIP)            — IPC: renderer:export-collection-zip
├── Single File (YAML)                — exportOpenCollection()
└── Postman                           — exportPostmanCollection()
    │
    ▼
导出工具函数
├── utils/collections/export.js       — Bruno 原生格式导出预处理
├── utils/exporters/opencollection.js — OpenCollection YAML 导出
└── utils/exporters/postman-collection.js — Postman 格式导出

Workspace 导出（额外入口）
└── CollectionHeader/index.js         — 工作区导出按钮 → exportWorkspaceAction()
```

### 2.3 快捷键

| 功能 | Mac | Windows |
|------|-----|---------|
| 导入 Collection | `Cmd+O` | `Ctrl+O` |

---

## 三、方案：从开源代码构建

### 3.1 原理

开源代码中所有导入导出链路——从 UI 入口 → 格式转换器 → Redux Action → IPC Handler → 文件系统——**全程无任何许可证校验**。构建产物的导入导出功能天然免费可用。

### 3.2 环境准备

| 依赖 | 版本要求 | 说明 |
|------|----------|------|
| Node.js | **v22.12.0**（严格匹配） | 见 `.nvmrc`，推荐使用 nvm 管理版本 |
| npm | 随 Node.js 附带 | 用 `npm` 不用 `yarn`/`pnpm` |
| Git | 任意版本 | 拉取代码和 GitHub 导入功能需要 |

**Windows 额外要求**（构建 Electron 安装包时需要）：

- Python 3.x（node-gyp 需要）
- Visual Studio Build Tools（含 C++ 桌面开发工作负载）
- 如仅开发运行（不打包安装包），则不需要以上两个

**Node.js 版本管理（推荐）：**

```powershell
nvm install 22.12.0
nvm use 22.12.0
```

### 3.3 构建步骤详解

#### 步骤 1：安装依赖并构建子包

```powershell
npm run setup
```

**这个命令会执行以下操作**（由 `scripts/setup.js` 控制）：

1. **清理**：删除所有 `node_modules` 目录（确保干净环境）
2. **安装依赖**：`npm i --legacy-peer-deps` 安装所有 15 个子包的依赖
3. **安装平台原生依赖**：按当前操作系统安装对应的 `node-pty` 原生模块
4. **构建 8 个子包**（按依赖顺序）：

   | 构建顺序 | 子包 | 说明 |
   |----------|------|------|
   | 1 | `bruno-graphql-docs` | GraphQL 文档生成 |
   | 2 | `bruno-query` | 查询工具 |
   | 3 | `bruno-common` | 通用工具库 |
   | 4 | `bruno-converters` | 格式转换器 |
   | 5 | `bruno-requests` | 请求引擎 |
   | 6 | `bruno-schema-types` | TypeScript 类型定义 |
   | 7 | `bruno-filestore` | 文件存储层 |
   | 8 | `bruno-js` (sandbox bundle) | JS 沙箱运行时 |

#### 步骤 2：启动开发环境

```powershell
npm run dev
```

**这个命令会执行以下操作**（由 `scripts/dev.js` 控制）：

```
┌─────────────────────────────────────────────────┐
│  1. 启动 Web Dev Server (rsbuild)               │
│     packages/bruno-app → http://localhost:3000   │
│                                                  │
│  2. 检测到端口 3000 可用后                       │
│     ↓                                           │
│  3. 启动 Electron 主进程                        │
│     packages/bruno-electron → electron .        │
│     设置环境变量 BRUNO_DEV_PORT=3000             │
│     ↓                                           │
│  4. Electron 窗口自动打开，加载 localhost:3000    │
└─────────────────────────────────────────────────┘
```

Electron 主进程在开发模式下会加载 `http://localhost:3000`（Web Dev Server），支持热更新。

**如果只需要单独运行 Web 或 Electron：**

```powershell
# 仅启动 Web Dev Server（前端预览，无法使用文件系统导入导出）
npm run dev:web

# 仅启动 Electron（需要先启动 web 并设置 BRUNO_DEV_PORT）
npm run dev:electron
```

### 3.4 构建安装包（发布版本）

如果需要打包成 `.exe`/`.dmg`/`.AppImage` 安装包：

```powershell
# 1. 先构建前端
npm run build:web

# 2. 构建 Electron 安装包（自动检测当前操作系统）
npm run build:electron
```

`scripts/build-electron.js` 的执行流程：

```
npm run build:web                           ← rsbuild 生成 packages/bruno-app/dist
       ↓
npm run build:electron                      ← scripts/build-electron.js
       ↓
  1. 删除 packages/bruno-electron/out          (清理旧产物)
  2. 删除 packages/bruno-electron/web          (清理旧 web)
  3. 复制 packages/bruno-app/dist → electron/web
  4. 修正 HTML 中的 /static 路径 → ./static
  5. 修正 CSS 中的字体路径
  6. 删除 sourcemap 文件
  7. 调用 electron-builder 打包
     ├── Windows → packages/bruno-electron/out/bruno_2.0.0_x64_win.exe
     ├── macOS   → bruno_2.0.0_arm64_mac.dmg
     └── Linux   → bruno_2.0.0_x64_linux.AppImage
```

**按平台构建：**

```powershell
npm run build:electron:win    # 仅 Windows
npm run build:electron:mac    # 仅 macOS
npm run build:electron:linux  # 仅 Linux
```

### 3.5 构建系统组件关系图

```
                        npm run setup
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
  npm install        子包 Rollup 构建        sandbox 打包
  (15 packages)      (7 TypeScript 包)      (QuickJS runtime)
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                    npm run dev / build
                             │
              ┌──────────────┴──────────────┐
              ▼                              ▼
       rsbuild (Web)                electron-builder
     packages/bruno-app             packages/bruno-electron
          │                              │
          ▼                              ▼
   React 19 前端 SPA             Electron 桌面壳
   (localhost:3000)              (native 主进程)
          │                              │
          └──────────┬───────────────────┘
                     │
              ┌──────┴──────┐
              │    Bruno     │
              │  桌面应用     │
              └─────────────┘
```

### 3.6 验证导入导出功能

开发模式启动后，按以下流程验证：

**验证导入：**

1. 点击侧边栏 `+` → `Import collection`
2. 选择 `File` Tab，拖入或浏览一个 Postman/OpenAPI/Insomnia JSON 文件
3. 验证弹出"Import Collection"位置选择弹窗
4. 选择存放目录，点击 `Import`
5. 确认集合成功导入并显示在侧边栏

**验证导出：**

1. 右键点击侧边栏中的任意 Collection
2. 选择 `Share`
3. 选择导出格式（ZIP / YAML / Postman），点击 `Proceed`
4. 确认导出文件保存成功

**验证快捷键：**

- 按 `Ctrl+O`（Windows）/ `Cmd+O`（Mac）应直接打开导入弹窗

---

## 四、补充说明

### 4.1 关于 GoldenEdition 组件

`packages/bruno-app/src/components/Sidebar/GoldenEdition/index.js` 是一个纯营销组件，展示定价信息（个人版 $19，组织版 $49/用户）。当前开源代码中**没有任何文件引用它**，它是死代码，对功能无任何影响。

### 4.2 关于 Beta Features

`packages/bruno-app/src/utils/beta-features.js` 是免费的选择性加入功能，不是付费功能：
- `OPENAPI_SYNC`：控制 OpenAPI 规范的自动同步
- `NODE_VM`：控制 Node VM 沙箱模式

### 4.3 关于遥测

`packages/bruno-app/src/providers/App/useTelemetry.js` 仅发送匿名日活计数（OS + 版本号），不涉及功能门控。在开发环境 (`import.meta.env.MODE === 'development'`) 下自动禁用。

### 4.4 关于 license-check 依赖

在 `packages/bruno-electron/package.json` 中存在 `@usebruno/node-machine-id` 依赖，用于获取机器唯一 ID。该依赖用于 telemetry 匿名追踪，**不用于许可证校验**。

---

## 五、文件索引

### 导入相关

- `packages/bruno-app/src/components/Sidebar/ImportCollection/index.js` - 导入弹窗主组件
- `packages/bruno-app/src/components/Sidebar/ImportCollection/FileTab.js` - 文件导入 Tab
- `packages/bruno-app/src/components/Sidebar/ImportCollection/GitHubTab.js` - Git 导入 Tab
- `packages/bruno-app/src/components/Sidebar/ImportCollection/UrlTab.js` - URL 导入 Tab
- `packages/bruno-app/src/components/Sidebar/ImportCollectionLocation/index.js` - 导入位置/格式选择
- `packages/bruno-app/src/components/BulkImportCollectionLocation/index.js` - 批量导入
- `packages/bruno-app/src/utils/importers/postman-collection.js` - Postman 格式转换
- `packages/bruno-app/src/utils/importers/insomnia-collection.js` - Insomnia 格式转换
- `packages/bruno-app/src/utils/importers/openapi-collection.js` - OpenAPI 格式转换
- `packages/bruno-app/src/utils/importers/bruno-collection.js` - Bruno 格式转换
- `packages/bruno-app/src/utils/importers/opencollection.js` - OpenCollection 格式转换
- `packages/bruno-electron/src/ipc/collection.js` - Electron 导入 IPC Handler
- `packages/bruno-electron/src/utils/collection-import.js` - 导入文件创建逻辑

### 导出相关

- `packages/bruno-app/src/components/ShareCollection/index.js` - 导出弹窗主组件
- `packages/bruno-app/src/utils/collections/export.js` - 导出预处理
- `packages/bruno-app/src/utils/exporters/opencollection.js` - OpenCollection 导出
- `packages/bruno-app/src/utils/exporters/postman-collection.js` - Postman 导出

### UI 入口点

- `packages/bruno-app/src/components/Sidebar/Sections/CollectionsSection/index.js` - 侧边栏导入入口
- `packages/bruno-app/src/components/WorkspaceHome/WorkspaceOverview/index.js` - 工作区导入入口
- `packages/bruno-app/src/components/WelcomeModal/index.js` - 引导弹窗导入入口
- `packages/bruno-app/src/components/Sidebar/Collections/Collection/index.js` - 右键菜单导出入口
- `packages/bruno-app/src/components/RequestTabs/CollectionHeader/index.js` - 工作区导出入口

### Redux Actions

- `packages/bruno-app/src/providers/ReduxStore/slices/collections/actions.js` - importCollection / importCollectionFromZip
- `packages/bruno-app/src/providers/ReduxStore/slices/workspaces/actions.js` - exportWorkspaceAction

### 构建脚本

- `scripts/setup.js` - 安装依赖 + 构建子包
- `scripts/dev.js` - 启动 Web Dev Server + Electron
- `scripts/build-electron.js` - 构建 Web + 打包 Electron 安装包
- `packages/bruno-app/rsbuild.config.mjs` - 前端 Rsbuild 配置
- `packages/bruno-electron/electron-builder-config.js` - Electron 打包配置

[English](../../contributing.md)

我们很高兴您希望改进 Bruno。以下是在计算机上运行 Bruno 的指南。

### 技术栈

Bruno 使用 React 构建，并使用 Electron 提供桌面版本（支持本地集合）。

我们使用的库

- CSS - Tailwind
- 代码编辑器 - Codemirror
- 状态管理 - Redux
- 图标 - Tabler Icons
- 表单 - formik
- Schema 验证 - Yup
- 请求客户端 - axios
- 文件系统监控器 - chokidar
- 国际化 - i18n

> [!IMPORTANT]
> 您需要 [Node v22.x 或最新的 LTS 版本](https://nodejs.org/en/)。我们在项目中使用 npm 工作区。

## 开发

Bruno 是一个桌面应用。您需要分别运行前端和 Electron 应用来加载该应用。

> 注意：我们使用 React 作为前端，并使用 rsbuild 作为构建和开发服务器。

## 安装依赖项

```bash
# 使用 nodejs 22 版本
nvm 使用

# 安装依赖项
npm i --legacy-peer-deps
```

### 本地开发（选项 1）

```bash
# 构建软件包
npm run build:graphql-docs
npm run build:bruno-query
npm run build:bruno-common
npm run build:bruno-converters
npm run build:bruno-requests

# 捆绑 js 沙盒库
npm run sandbox:bundle-libraries --workspace=packages/bruno-js

# 运行 React 应用（终端 1）
npm run dev:web

# 运行 Electron 应用（终端 2）
npm run dev:electron
```

### 本地开发（选项 2）

```bash
# 安装依赖项并进行设置
npm run setup

# 运行 Electron 和 React应用程序并发
npm run dev
```

### 故障排除

运行 `npm install` 时，您可能会遇到"不支持的平台"错误。要解决此问题，您需要删除 `node_modules` 和 `package-lock.json`，然后运行 `npm install`。这将安装运行应用程序所需的所有软件包。

```shell
# 删除子目录中的 node_modules
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
rm -rf "$dir"
done

# 删除子目录中的 package-lock
find . -type f -name "package-lock.json" -delete
```

### 测试

```bash
# 运行 bruno-schema 测试

npm test --workspace=packages/bruno-schema

# 在所有工作区运行测试
npm test --workspaces --if-present
```

### 提交拉取请求

- 请保持拉取请求简短并专注于一件事
- 请遵循创建分支的格式
- feature/[功能名称]：此分支应包含针对特定功能的变更
- 例如：feature/dark-mode
- bugfix/[错误名称]：此分支应仅包含针对特定错误的修复
- 例如：bugfix/bug-1
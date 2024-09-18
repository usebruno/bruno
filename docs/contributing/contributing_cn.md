[English](../../contributing.md)

## 让我们一起改进 Bruno！

很高兴看到您考虑改进 Bruno。以下是获取 Bruno 并在您的电脑上运行它的规则和指南。

### 使用的技术

Bruno 基于 NextJs 和 React 构建。我们使用 Electron 来封装桌面版本。

我们使用的库包括：

- CSS - Tailwind
- 代码编辑器 - Codemirror
- 状态管理 - Redux
- 图标 - Tabler Icons
- 表单 - formik
- 模式验证 - Yup
- 请求客户端 - axios
- 文件系统监视器 - chokidar

### 依赖项

您需要 [Node v20.x 或最新的 LTS 版本](https://nodejs.org/en/) 和 npm 8.x。我们在这个项目中也使用 npm 工作区（_npm workspaces_）。

## 开发

Bruno 是作为一个 _client lourd（重客户端）_ 应用程序开发的。您需要在一个终端中启动 nextjs 来加载应用程序，然后在另一个终端中启动 Electron 应用程序。

### 依赖项

- NodeJS v18

### 本地开发

```bash
# 使用 node 版本 18
nvm use

# 安装依赖项
npm i --legacy-peer-deps

# 构建 graphql 文档
npm run build:graphql-docs

# 构建 bruno 查询
npm run build:bruno-query

# 启动 next（终端 1）
npm run dev:web

# 启动重客户端（终端 2）
npm run dev:electron
```

### 故障排除

在运行 npm install 时，您可能会遇到 Unsupported platform 错误。为了解决这个问题，请删除 node_modules 目录和 package-lock.json 文件，然后再次运行 npm install。这应该会安装运行应用程序所需的所有包。

```shell
# 删除子目录中的 node_modules 目录
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
  rm -rf "$dir"
done

# 删除子目录中的 package-lock.json 文件
find . -type f -name "package-lock.json" -delete
```

### 测试

```bash
# bruno-schema
npm test --workspace=packages/bruno-schema

# bruno-lang
npm test --workspace=packages/bruno-lang
```

### 提交 Pull Request

- 请保持 PR 精简并专注于单一目标
- 请遵循分支命名格式：
  - feature/[feature name]：该分支应包含特定功能
    - 例如：feature/dark-mode
  - bugfix/[bug name]：该分支应仅包含特定 bug 的修复
    - 例如：bugfix/bug-1

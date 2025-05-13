[English](../../contributing.md)

## Vamos tornar o Bruno melhor, juntos!!

Estamos felizes que você queira ajudar a melhorar o Bruno. Abaixo estão as diretrizes para executar o Bruno no seu computador.

### Pilha de Tecnologia

O Bruno foi desenvolvido usando React e usa o Electron para disponibilizar uma versão para desktop (com suporte para coleções locais).

Bibliotecas que usamos

- CSS - Tailwind
- Editores de Código - Codemirror
- Gerenciamento de Estado - Redux
- Ícones - Ícones do Tabler
- Formulários - formik
- Validação de Schema - Yup
- Cliente de Requisição - axios
- Observador do Sistema de Arquivos - chokidar
- i18n - i18next

> [!IMPORTANTE]
> Você precisará do [Node v22.x ou da versão LTS mais recente](https://nodejs.org/en/). Usamos workspaces npm no projeto.

## Desenvolvimento

O Bruno é um aplicativo desktop. Você precisa carregar o aplicativo executando o frontend e o aplicativo Electron separadamente.

> Observação: usamos React para o frontend e rsbuild para o servidor de compilação e desenvolvimento.

## Instalar Dependências

```bash
# usar nodejs versão 22
nvm usar

# instalar dependências
npm i --legacy-peer-deps
```

### Desenvolvimento Local (Opção 1)

```bash
# construir pacotes
npm executar build:graphql-docs
npm executar build:bruno-query
npm executar build:bruno-common
npm executar build:bruno-converters
npm executar build:bruno-requests

# agrupar bibliotecas sandbox js
npm executar sandbox:bundle-libraries --workspace=packages/bruno-js

# executar aplicativo react (terminal 1)
npm executar dev:web

# executar aplicativo electron (terminal 2)
npm executar dev:electron
```

### Desenvolvimento Local (Opção 2)

```bash
# instalar dependências e configurar
npm executar configuração

# execute os aplicativos Electron e React simultaneamente
npm run dev
```

### Solução de problemas

Você pode encontrar o erro `Plataforma não suportada` ao executar `npm install`. Para corrigir isso, você precisará excluir `node_modules` e `package-lock.json` e executar `npm install`. Isso deve instalar todos os pacotes necessários para executar o aplicativo.

```shell
# Exclua node_modules em subdiretórios
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
rm -rf "$dir"
done

# Exclua package-lock em subdiretórios
find . -type f -name "pacote-lock.json" -delete
```

### Testes

```bash
# executar testes bruno-schema
npm test --workspace=pacotes/bruno-schema

# executar testes em todos os workspaces
npm test --workspaces --if-present
```

### Envio de Pull Request

- Mantenha os PRs pequenos e focados em um único objetivo
- Siga o formato de criação de branches
- feature/[nome do feature]: Esta branch deve conter alterações para um recurso específico
- Exemplo: feature/dark-mode
- bugfix/[nome do bug]: Esta branch deve conter apenas correções de bugs para um bug específico
- Exemplo bugfix/bug-1
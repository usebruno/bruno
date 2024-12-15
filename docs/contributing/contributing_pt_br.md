[English](../../contributing.md)

## Vamos tornar o Bruno melhor, juntos!!

Estamos felizes que você queira ajudar a melhorar o Bruno. Abaixo estão as diretrizes e orientações para começar a executar o Bruno no seu computador.

### Stack de Tecnologias

O Bruno é construído usando Next.js e React. Também usamos o Electron para disponibilizar uma versão para desktop (que suporta coleções locais).

Bibliotecas que utilizamos:

- CSS - Tailwind
- Editor de Código - Codemirror
- Gerenciador de Estado - Redux
- Ícones - Tabler Icons
- Formulários - formik
- Validador de Schema - Yup
- Cliente de Requisições - axios
- Monitor de Arquivos - chokidar

### Dependências

Você precisará do [Node v20.x (ou da versão LTS mais recente)](https://nodejs.org/en/) e do npm na versão 8.x. Nós utilizamos npm workspaces no projeto.

## Desenvolvimento

Bruno está sendo desenvolvido como um aplicativo de desktop. Você precisa carregar o programa executando o aplicativo Next.js em um terminal e, em seguida, executar o aplicativo Electron em outro terminal.

### Dependências

- NodeJS v18

### Desenvolvimento Local

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

### Troubleshooting

Você pode se deparar com o erro `Unsupported platform` ao executar o comando `npm install`. Para corrigir isso, você precisará excluir a pasta `node_modules` e o arquivo `package-lock.json` e, em seguida, executar o comando `npm install` novamente. Isso deve instalar todos os pacotes necessários para executar o aplicativo.

```shell
# delete node_modules in sub-directories
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
  rm -rf "$dir"
done

# delete package-lock in sub-directories
find . -type f -name "package-lock.json" -delete
```

### Testando

```bash
# bruno-schema
npm test --workspace=packages/bruno-schema

# bruno-lang
npm test --workspace=packages/bruno-lang
```

### Envio de Pull Request

- Por favor, mantenha os PRs pequenos e focados em uma única coisa.
- Siga o formato de criação de branches.
  - feature/[nome da funcionalidade]: Esta branch deve conter alterações para uma funcionalidade específica.
    - Exemplo: feature/dark-mode
  - bugfix/[nome do bug]: Esta branch deve conter apenas correções para um bug específico.
    - Exemplo: bugfix/bug-1

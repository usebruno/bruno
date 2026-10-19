# Spec: Painel de Git (Fase 1 — MVP)

- **Status:** proposta
- **Data:** 2026-10-19
- **Autor:** Matheus

## 1. Objetivo

Permitir que o usuário veja o status Git de uma collection e faça **stage, unstage, commit, push e pull** sem sair do Gruno.

O backend dessas operações já existe em `packages/bruno-electron/src/utils/git.js` (via `simple-git`). Esta spec cobre o que falta: canais de IPC, estado no Redux e a interface.

### Fora de escopo (fases seguintes)

| Fase | Itens |
| --- | --- |
| 2 | Criar e trocar branch, diff visual por arquivo (`VisualDiffViewer`), discard, `canPush` corrigido |
| 3 | Stash, histórico, resolução de conflitos |

## 2. Estado atual

| Área | Hoje | Lacuna |
| --- | --- | --- |
| Backend | `utils/git.js` implementa stage, commit, push, pull, status, ahead/behind, branches, stash e diffs | Sem testes, exceto `parseRemoteBranches` |
| IPC | `ipc/git.js` expõe só `clone-git-repository`, `get-collection-git-remote-url` e `list-remote-branches-for-url` | Nenhum canal de status, commit, push ou pull |
| Redux | Slice `app` tem `gitOperationProgress` e `gitVersion` | Ninguém escuta `main:update-git-operation-progress` |
| UI | `GitNotFoundModal`, `CloneGitRespository`, `VisualDiffViewer` | Sem painel de Git |

## 3. Problemas a corrigir no backend

Estes itens são pré-requisito da UI e entram no mesmo trabalho.

1. **Escopo do status.** `getChangedFilesInCollectionGit(gitRootPath, collectionPath)` ignora `collectionPath` e lista o repositório inteiro. Deve passar o caminho da collection como pathspec (`git status --porcelain -- <collectionPath>`) e retornar caminhos relativos à raiz do repositório.
2. **Credenciais e travamento.** Push, pull e fetch rodam sem `GIT_TERMINAL_PROMPT=0` e sem timeout. Definir a variável no ambiente do `simple-git` e aplicar timeout (`timeout: { block: 60000 }` do `simple-git`).
3. **Instância compartilhada.** `getSimpleGitInstanceForPath` guarda uma instância por caminho, e o `outputHandler` do push fica preso nela. Criar uma instância por operação para as que usam `outputHandler`, e serializar operações de escrita por repositório (fila simples por `gitRootPath`).
4. **Erros legíveis.** Mapear os erros comuns para mensagens claras (ver seção 6).

## 4. IPC

Arquivo: `packages/bruno-electron/src/ipc/git.js`. Todos os canais seguem `renderer:git-*` e usam `ipcMain.handle`.

### Regra de segurança

O renderer **nunca** envia `gitRootPath`. Todo handler recebe `collectionPath`, valida que é uma collection aberta e resolve a raiz no main com `getCollectionGitRootPath(collectionPath)`. Se não houver repositório, o handler rejeita com `NOT_A_REPOSITORY`.

Arquivos recebidos em `files` devem ser caminhos relativos, sem `..` e sem começar com `-`, e devem estar dentro da collection.

### Canais

| Canal | Entrada | Saída |
| --- | --- | --- |
| `renderer:git-status` | `{ collectionPath }` | `{ isRepo, branch, ahead, behind, staged[], unstaged[], conflicted[], tooManyFiles }` |
| `renderer:git-init` | `{ collectionPath }` | `{ ok: true }` |
| `renderer:git-stage` | `{ collectionPath, files[] }` | `{ ok: true }` |
| `renderer:git-unstage` | `{ collectionPath, files[] }` | `{ ok: true }` |
| `renderer:git-commit` | `{ collectionPath, message }` | `{ hash, summary }` |
| `renderer:git-push` | `{ collectionPath, processUid }` | `{ ok: true }` |
| `renderer:git-pull` | `{ collectionPath, processUid, strategy }` | `{ ok: true }` |

Detalhes:

- `git-status` combina `getCurrentGitBranch`, `getAheadBehindCount` e `getChangedFilesInCollectionGit`. Quando não há repositório, retorna `{ isRepo: false }` em vez de erro.
- `git-commit` rejeita mensagem vazia ou só com espaços.
- `git-push` e `git-pull` usam só `origin` e a branch atual (decisão da seção 11).
- `git-pull` aceita só `--no-rebase` ou `--ff-only` (já validado em `pullGitChanges`). Padrão: `--ff-only`.
- Push e pull enviam progresso por `main:update-git-operation-progress` com o `processUid` recebido.

## 5. Redux

### Estado

Novo slice `git` em `packages/bruno-app/src/providers/ReduxStore/slices/git/`:

```js
{
  byCollection: {
    [collectionUid]: {
      isRepo: boolean,
      branch: string | null,
      ahead: number,
      behind: number,
      staged: FileChange[],
      unstaged: FileChange[],
      conflicted: FileChange[],
      tooManyFiles: boolean,
      loading: boolean,
      operation: null | 'commit' | 'push' | 'pull' | 'stage' | 'unstage' | 'init',
      error: string | null,
      lastRefreshedAt: number | null
    }
  }
}
// FileChange = { path, type, fileIndex, working_dir }
```

O estado deve ser serializável (regra do projeto). `lastRefreshedAt` é preenchido no thunk, não no reducer.

### Thunks (`slices/git/actions.js`)

`refreshGitStatus(collectionUid)`, `initRepository`, `stageFiles`, `unstageFiles`, `commit`, `push` e `pull`. Toda operação de escrita chama `refreshGitStatus` ao terminar, com sucesso ou erro.

### Progresso

Registrar em `providers/App/useIpcEvents.js` o listener de `main:update-git-operation-progress`, despachando `updateGitOperationProgress` do slice `app` (já existe).

### Quando atualizar o status

O watcher da collection ignora `.git`, então commits, pulls e trocas de branch feitos fora do Gruno não disparam evento. O status é recarregado:

1. Ao abrir o painel
2. Depois de qualquer operação de escrita
3. Quando a janela ganha foco (novo evento `main:window-focused`, enviado a partir do `browser-window-focus` existente em `index.js`), com debounce de 1 s
4. Em `main:collection-tree-updated`, com debounce de 1 s

## 6. Mensagens de erro

| Situação | Detecção | Mensagem |
| --- | --- | --- |
| Git não instalado | `gitVersion` nulo | Abrir o `GitNotFoundModal` existente |
| Sem repositório | `isRepo: false` | Mostrar estado vazio com botão "Inicializar repositório" |
| Sem remote | push sem `origin` | "Nenhum remote configurado. Conecte um repositório remoto." |
| Autenticação | stderr com `Authentication failed`, `could not read Username`, `Permission denied (publickey)` | "Falha de autenticação. Configure suas credenciais do Git (credential helper ou chave SSH)." |
| Identidade ausente | stderr com `Please tell me who you are` | "Configure `user.name` e `user.email` no Git." |
| Push rejeitado | stderr com `rejected` ou `non-fast-forward` | "O remoto tem commits novos. Faça pull antes do push." |
| Pull não fast-forward | stderr com `Not possible to fast-forward` | "Não foi possível fazer fast-forward. Resolva pelo terminal (conflitos ficam para a Fase 3)." |
| Timeout | timeout do `simple-git` | "A operação demorou demais. Verifique a conexão e as credenciais." |

## 7. Interface

### Entrada pelo `StatusBar`

Em `components/StatusBar/index.js`, adicionar `GitStatusButton` com ícone de branch, nome da branch atual e contadores `↑ahead ↓behind`. Aparece só quando a aba ativa pertence a uma collection. Clique abre o painel.

### Componentes

Cada componente em sua pasta (`<Nome>/index.js` + `StyledWrapper.js`), cores via `theme` do styled-components e layout com Tailwind.

```
components/GitPanel/
  index.js                 # barra lateral à direita, montada em pages/Bruno ao lado do AiChatSidebar
  StyledWrapper.js
  GitChangesList/          # lista staged e unstaged, checkbox por arquivo, "stage all"
  GitCommitBox/            # textarea + botão Commit (desabilitado sem staged ou sem mensagem)
  GitSyncActions/          # botões Pull e Push, com estado de carregamento
  GitEmptyState/           # "Inicializar repositório"
  GitOperationLog/         # saída de progresso de push e pull
components/StatusBar/GitStatusButton/
```

### Comportamento

- Commit desabilitado sem arquivos em stage ou com mensagem vazia. `Ctrl/Cmd + Enter` faz commit.
- Push desabilitado com `ahead === 0`. Pull sempre habilitado quando há remote.
- Durante uma operação, todos os botões de escrita ficam desabilitados.
- Com `tooManyFiles`, mostrar aviso e esconder a lista.
- Arquivos `conflicted` aparecem em seção própria, só leitura, com aviso para resolver pelo terminal.

### `data-testid`

`git-status-button`, `git-panel`, `git-file-<path>`, `git-stage-all`, `git-commit-message`, `git-commit-button`, `git-push-button`, `git-pull-button`, `git-init-button`, `git-error`.

## 8. Testes

### Unitários (Jest)

- `packages/bruno-electron/src/utils/git.spec.js`: criar repositórios temporários com `git init` em `os.tmpdir()` e cobrir status filtrado por collection, stage, unstage, commit e ahead/behind contra um remote bare local. Incluir caso de repositório sem commits.
- `packages/bruno-electron/src/ipc/git.spec.js`: validação de entrada (caminho fora da collection, `..`, `-`, mensagem vazia) e resolução da raiz no main.
- Reducers e thunks do slice `git`, com `ipcRenderer` mockado.

### E2E (Playwright)

Em `tests/git/`, usando a skill `write-e2e-test`:

1. Abrir collection sem repositório, inicializar, editar um request, ver o arquivo em unstaged
2. Fazer stage, commit e ver a lista vazia
3. Push para um remote bare local e ver `ahead` voltar a 0

## 9. Critérios de aceite

- [ ] Status mostra só arquivos da collection, mesmo em monorepo
- [ ] Stage, unstage e commit funcionam pela interface
- [ ] Push e pull funcionam com credenciais já configuradas na máquina e mostram progresso
- [ ] Push sem credenciais falha em até 60 s com mensagem clara, sem travar a interface
- [ ] Commit feito pelo terminal aparece no painel ao voltar o foco para a janela
- [ ] Nenhum handler aceita `gitRootPath` vindo do renderer
- [ ] Testes unitários e E2E da seção 8 passando
- [ ] `npm run lint:fix` sem erros

## 10. Ordem de implementação

1. Testes de `utils/git.js` e correções da seção 3
2. Handlers de IPC com validação
3. Slice `git`, listener de progresso e eventos de atualização
4. `GitStatusButton` e `GitPanel`
5. Testes E2E

## 11. Decisões

| Questão | Decisão |
| --- | --- |
| Remote | Só `origin` na Fase 1. Sem `origin`, push e pull mostram "Nenhum remote configurado." |
| Escopo do commit | Só arquivos da collection. Stage e unstage rejeitam caminhos fora dela, mesmo dentro de um repositório maior |
| Formato do painel | Barra lateral à direita, no padrão do `AiChatSidebar`, para ficar aberta enquanto o usuário edita requests |

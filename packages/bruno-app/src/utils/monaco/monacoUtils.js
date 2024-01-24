const buildSuggestions = (monaco) => [
  {
    label: 'bru',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'bru.'
  },
  {
    label: 'bru.getProcessEnv()',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'bru.getProcessEnv()'
  },
  {
    label: 'bru.getEnvVar()',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'bru.getEnvVar()'
  },
  {
    label: 'bru.setEnvVar()',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'bru.setEnvVar()'
  },
  {
    label: 'bru.getVar()',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'bru.getVar()'
  },
  {
    label: 'bru.setVar()',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'bru.setVar()'
  }
];

export const initMonaco = (monaco) => {
  monaco.languages.registerCompletionItemProvider('typescript', {
    provideCompletionItems: () => {
      return {
        suggestions: buildSuggestions(monaco)
      };
    }
  });
};

const createEditorAction = (id, keybindings, label, run) => {
  return {
    id: id,
    keybindings: keybindings,
    label: label,
    run: run
  };
};

export const addMonacoCommands = ({ monaco, editor, onEdit, onSave, onRun }) => {
  const editorActions = [
    createEditorAction('save', [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS], 'Save', () => {
      onEdit(editor.getValue());
      onSave();
    }),
    createEditorAction('run', [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter], 'Run', () => {
      onRun();
    }),
    createEditorAction('foldAll', [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyY], 'FoldAll', () => {
      editor.trigger('fold', 'editor.foldAll');
    }),
    createEditorAction('unfoldAll', [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI], 'UnfoldAll', () => {
      editor.trigger('fold', 'editor.unfoldAll');
    })
  ];
  editorActions.map((action) => {
    editor.addAction(action);
  });
};

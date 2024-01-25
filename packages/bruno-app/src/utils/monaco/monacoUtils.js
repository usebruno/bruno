const buildSuggestions = (monaco) => [
  {
    label: 'res',
    kind: monaco.languages.CompletionItemKind.Variable,
    insertText: 'res.',
    documentation: 'The response object.'
  },
  {
    label: 'res.status',
    kind: monaco.languages.CompletionItemKind.Variable,
    insertText: 'res.status',
    documentation: 'The response status code.'
  },
  {
    label: 'res.statusText',
    kind: monaco.languages.CompletionItemKind.Variable,
    insertText: 'res.statusText',
    documentation: 'The response status text.'
  },
  {
    label: 'res.headers',
    kind: monaco.languages.CompletionItemKind.Variable,
    insertText: 'res.headers',
    documentation: 'The response headers.'
  },
  {
    label: 'res.body',
    kind: monaco.languages.CompletionItemKind.Variable,
    insertText: 'res.body',
    documentation: 'The response body.'
  },
  {
    label: 'res.responseTime',
    kind: monaco.languages.CompletionItemKind.Variable,
    insertText: 'res.responseTime',
    documentation: 'The response time.'
  },
  {
    label: 'res.getStatus()',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'res.getStatus()',
    documentation: 'Returns the response status code.'
  },
  {
    label: 'res.getStatusText()',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'res.getStatusText()',
    documentation: 'Returns the response status text.'
  },
  {
    label: 'res.getHeader(name)',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'res.getHeader()',
    documentation: 'Returns the response header with the given name.'
  },
  {
    label: 'res.getHeaders()',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'res.getHeaders()',
    documentation: 'Returns the response headers.'
  },
  {
    label: 'res.getBody()',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'res.getBody()',
    documentation: 'Returns the response body.'
  },
  {
    label: 'res.getResponseTime()',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'res.getResponseTime()',
    documentation: 'Returns the response time.'
  },
  {
    label: 'req',
    kind: monaco.languages.CompletionItemKind.Variable,
    insertText: 'req.',
    documentation: 'The request object.'
  },
  {
    label: 'req.url',
    kind: monaco.languages.CompletionItemKind.Variable,
    insertText: 'req.url',
    documentation: 'The request URL.'
  },
  {
    label: 'req.method',
    kind: monaco.languages.CompletionItemKind.Variable,
    insertText: 'req.method',
    documentation: 'The request method.'
  },
  {
    label: 'req.headers',
    kind: monaco.languages.CompletionItemKind.Variable,
    insertText: 'req.headers',
    documentation: 'The request headers.'
  },
  {
    label: 'req.body',
    kind: monaco.languages.CompletionItemKind.Variable,
    insertText: 'req.body',
    documentation: 'The request body.'
  },
  {
    label: 'req.timeout',
    kind: monaco.languages.CompletionItemKind.Variable,
    insertText: 'req.timeout',
    documentation: 'The request timeout.'
  },
  {
    label: 'req.getUrl()',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'req.getUrl()',
    documentation: 'Returns the request URL.'
  },
  {
    label: 'req.setUrl(url)',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'req.setUrl()',
    documentation: 'Sets the request URL.'
  },
  {
    label: 'req.getMethod()',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'req.getMethod()',
    documentation: 'Returns the request method.'
  },
  {
    label: 'req.setMethod(method)',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'req.setMethod()',
    documentation: 'Sets the request method.'
  },
  {
    label: 'req.getHeader(name)',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'req.getHeader()',
    documentation: 'Returns the request header with the given name.'
  },
  {
    label: 'req.getHeaders()',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'req.getHeaders()',
    documentation: 'Returns the request headers.'
  },
  {
    label: 'req.setHeader(name, value)',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'req.setHeader()',
    documentation: 'Sets the request header with the given name and value.'
  },
  {
    label: 'req.setHeaders(data)',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'req.setHeaders()',
    documentation: 'Sets the request headers.'
  },
  {
    label: 'req.getBody()',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'req.getBody()',
    documentation: 'Returns the request body.'
  },
  {
    label: 'req.setBody(data)',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'req.setBody()',
    documentation: 'Sets the request body.'
  },
  {
    label: 'req.setMaxRedirects(maxRedirects)',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'req.setMaxRedirects()',
    documentation: 'Sets the maximum number of redirects.'
  },
  {
    label: 'req.getTimeout()',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'req.getTimeout()',
    documentation: 'Returns the request timeout.'
  },
  {
    label: 'req.setTimeout(timeout)',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'req.setTimeout()',
    documentation: 'Sets the request timeout.'
  },
  {
    label: 'bru.getProcessEnv()',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'bru.getProcessEnv()',
    documentation: 'Returns the current process environment variables.'
  },
  {
    label: 'bru.getEnvVar()',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'bru.getEnvVar()',
    documentation: 'Returns the value of the environment variable with the given key.'
  },
  {
    label: 'bru.setEnvVar()',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'bru.setEnvVar()',
    documentation: 'Sets the value of the environment variable with the given key.'
  },
  {
    label: 'bru.getVar()',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'bru.getVar()',
    documentation: 'Returns the value of the variable with the given key.'
  },
  {
    label: 'bru.setVar()',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'bru.setVar()',
    documentation: 'Sets the value of the variable with the given key.'
  },
  {
    label: 'bru.cwd()',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: 'bru.cwd()',
    documentation: 'Returns the current working directory.'
  }
];

export const initMonaco = (monaco) => {
  monaco.languages.typescript.typescriptDefaults.addExtraLib(`
  declare const res: {
    status: number;
    statusText: string;
    headers: any;
    body: any;
    responseTime: number;
    getStatus(): number;
    getStatusText(): string;
    getHeader(name: string): string;
    getHeaders(): any;
    getBody(): any;
    getResponseTime(): number;
  };
  declare const req: {
    url: string;
    method: string;
    headers: any;
    body: any;
    timeout: number;
    getUrl(): string;
    setUrl(url: string): void;
    getMethod(): string;
    setMethod(method: string): void;
    getHeader(name: string): string;
    getHeaders(): any;
    setHeader(name: string, value: string): void;
    setHeaders(data: any): void;
    getBody(): any;
    setBody(data: any): void;
    setMaxRedirects(maxRedirects: number): void;
    getTimeout(): number;
    setTimeout(timeout: number): void;
  };
  declare const bru: {
    getEnvVar(key: string) : any;
    setEnvVar(key: string, value: any) : void;
    getVar(key: string) : any;
    setVar(key: string, value: any): void;
    getProcessEnv(): any;
    cwd(): string;
  };
`);
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

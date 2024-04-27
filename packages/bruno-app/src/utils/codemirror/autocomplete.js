let CodeMirror;
const SERVER_RENDERED = typeof navigator === 'undefined' || global['PREVENT_CODEMIRROR_RENDER'] === true;

if (!SERVER_RENDERED) {
  const formatHints = (hints = {}) => {
    const render = (element, self, data) => {
      let text = data.text;
      if (typeof hints[text] !== 'object' && hints[text]) {
        text = text + `: <i>${hints[text]}</i>`;
      }
      element.innerHTML = text;
      return element;
    };
    try {
      const keys = Object.keys(hints);

      return keys.map((key) => ({
        text: key,
        render
      }));
    } catch {
      return [];
    }
  };

  const variableCompletion = (editor) => {
    if (!editor.state.brunoVarInfo) return null;
    const cursor = editor.getCursor();
    const cursorLine = editor.getLine(cursor.line);
    const position = cursor.ch;

    const char = cursorLine.charAt(position - 1);
    const prevChar = cursorLine.charAt(position - 2);

    if ((char === '{' && prevChar === '{') || (prevChar === '{' && cursorLine.charAt(position - 3) === '{')) {
      const completions = {
        list: formatHints(editor.state.brunoVarInfo.options.variables),
        from: CodeMirror.Pos(cursor.line, position)
      };
      CodeMirror.on(completions, 'pick', (completion) => {
        const endOfCompletion = cursorLine.charAt(position);
        if (endOfCompletion !== '}') {
          editor.replaceRange('}}', CodeMirror.Pos(cursor.line, position + completion.text.length));
        }
      });
      return completions;
    }
    return null;
  };

  const wordCompletion = (editor, options) => {
    const word = /[\w$-]+/;
    const wordlist = (options && options.autocomplete) || [];
    let cur = editor.getCursor(),
      curLine = editor.getLine(cur.line);
    let end = cur.ch,
      start = end;
    while (start && word.test(curLine.charAt(start - 1))) --start;
    let curWord = start != end && curLine.slice(start, end);

    // Check if curWord is a valid string before proceeding
    if (typeof curWord !== 'string' || curWord.length < 3) {
      return null; // Abort the hint
    }

    const list = (options && options.list) || [];
    const re = new RegExp(word.source, 'g');
    for (let dir = -1; dir <= 1; dir += 2) {
      let line = cur.line,
        endLine = Math.min(Math.max(line + dir * 500, editor.firstLine()), editor.lastLine()) + dir;
      for (; line != endLine; line += dir) {
        let text = editor.getLine(line),
          m;
        while ((m = re.exec(text))) {
          if (line == cur.line && curWord.length < 3) continue;
          list.push(...wordlist.filter((el) => el.toLowerCase().startsWith(curWord.toLowerCase())));
        }
      }
    }
    return { list: [...new Set(list)], from: CodeMirror.Pos(cur.line, start), to: CodeMirror.Pos(cur.line, end) };
  };

  CodeMirror = require('codemirror');
  CodeMirror.registerHelper('hint', 'anyword', (editor, options) => {
    const variables = variableCompletion(editor);
    if (variables) return variables;
    return wordCompletion(editor, options);
  });
  CodeMirror.commands.autocomplete = (cm, hint, options) => {
    cm.showHint({ hint, ...options });
  };
}

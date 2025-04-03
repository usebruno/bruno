let CodeMirror;
const SERVER_RENDERED = typeof window === 'undefined' || global['PREVENT_CODEMIRROR_RENDER'] === true;

if (!SERVER_RENDERED) {
  CodeMirror = require('codemirror');
  CodeMirror.registerHelper('hint', 'anyword', (editor, options) => {
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
  });
  CodeMirror.commands.autocomplete = (cm, hint, options) => {
    cm.showHint({ hint, ...options });
  };
}

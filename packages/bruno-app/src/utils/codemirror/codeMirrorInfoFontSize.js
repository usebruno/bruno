import get from 'lodash/get';
import store from 'providers/ReduxStore';

const DEFAULT_CODE_FONT_SIZE = 13;

const styleTag = document.createElement('style');
document.head.appendChild(styleTag);

let lastFontSize;

const updateCodeMirrorInfoFontSize = () => {
  const fontSize = Number(get(store.getState(), 'app.preferences.font.codeFontSize', DEFAULT_CODE_FONT_SIZE));
  if (fontSize === lastFontSize) return;
  lastFontSize = fontSize;

  const headerFontSize = fontSize + 1;
  const descriptionFontSize = Math.max(fontSize - 3, 1);
  styleTag.innerHTML = `
    .CodeMirror-info { font-size: ${fontSize}px !important; }
    .CodeMirror-info .CodeMirror-info-header > .type-name,
    .CodeMirror-info .CodeMirror-info-header > .field-name,
    .CodeMirror-info .CodeMirror-info-header > .arg-name,
    .CodeMirror-info .CodeMirror-info-header > .directive-name,
    .CodeMirror-info .CodeMirror-info-header > .enum-value {
      font-size: ${headerFontSize}px !important;
    }
    .CodeMirror-info .info-description {
      font-size: ${descriptionFontSize}px !important;
    }
  `;
};

updateCodeMirrorInfoFontSize();
store.subscribe(updateCodeMirrorInfoFontSize);

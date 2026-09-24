import Table from '@tiptap/extension-table';
import { serializeTable } from '../../utils/editorMarkdownSerialize';

const EditorTable = Table.extend({
  parseHTML() {
    return [{ tag: 'div.tableWrapper > table' }, { tag: 'table' }];
  },
  addStorage() {
    return {
      markdown: {
        serialize: serializeTable,
        parse: {
          updateDOM(element) {
            element.querySelectorAll('div.tableWrapper').forEach((wrapper) => {
              const table = wrapper.querySelector(':scope > table');
              if (table) {
                wrapper.replaceWith(table);
              }
            });
          }
        }
      }
    };
  }
});

export default EditorTable;

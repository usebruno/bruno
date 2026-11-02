import { updateColumns } from '@tiptap/extension-table';

/**
 * Table node view without the extra tableWrapper div.
 * TipTap's default TableView wraps the table in a div, which looks like a nested
 * table in the editor and can end up in pasted/saved HTML.
 */
class EditorTableView {
  constructor(node, cellMinWidth) {
    this.node = node;
    this.cellMinWidth = cellMinWidth;
    this.table = document.createElement('table');
    this.table.className = 'editor-table';
    this.dom = this.table;
    this.colgroup = this.table.appendChild(document.createElement('colgroup'));
    updateColumns(node, this.colgroup, this.table, cellMinWidth);
    this.contentDOM = this.table.appendChild(document.createElement('tbody'));
  }

  update(node) {
    if (node.type !== this.node.type) {
      return false;
    }

    this.node = node;
    updateColumns(node, this.colgroup, this.table, this.cellMinWidth);
    return true;
  }

  ignoreMutation(mutation) {
    return (
      mutation.type === 'attributes'
      && (mutation.target === this.table || this.colgroup.contains(mutation.target))
    );
  }
}

export default EditorTableView;

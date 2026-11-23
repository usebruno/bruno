import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

// `Markdown` is configured with `transformCopiedText` so that copying out of the editable editor
// yields Markdown. In the read-only docs preview the user sees rendered text, so copying should give
// back the selected text without list markers, heading hashes, emphasis delimiters or code fences.
// ProseMirror asks plugins for a clipboard text serializer in order and uses the first answer, so this
// extension runs before the Markdown one and answers only while the editor is not editable.
const EditorPlainTextCopy = Extension.create({
  name: 'plainTextCopy',
  priority: 1000,

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('plainTextCopy'),
        props: {
          clipboardTextSerializer: (slice) => {
            if (this.editor.isEditable) {
              return null;
            }
            return slice.content.textBetween(0, slice.content.size, '\n\n');
          }
        }
      })
    ];
  }
});

export default EditorPlainTextCopy;

import BulletList from '@tiptap/extension-bullet-list';
import ListItem from '@tiptap/extension-list-item';
import OrderedList from '@tiptap/extension-ordered-list';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import {
  setupTaskListParser,
  updateTaskListDOM
} from './EditorMarkdownParse';
import {
  serializeBulletList,
  serializeListItemContent,
  serializeOrderedList,
  serializeTaskList
} from './EditorMarkdownSerialize';

const isTaskListElement = (node) =>
  node.getAttribute('data-type') === 'taskList'
  || node.classList.contains('contains-task-list');

const isTaskItemElement = (node) =>
  node.getAttribute('data-type') === 'taskItem'
  || node.classList.contains('task-list-item');

const EditorBulletList = BulletList.extend({
  parseHTML() {
    return [
      {
        tag: 'ul',
        getAttrs: (node) => (isTaskListElement(node) ? false : null)
      }
    ];
  },
  addStorage() {
    return {
      markdown: {
        serialize: serializeBulletList
      }
    };
  }
});

const EditorOrderedList = OrderedList.extend({
  addStorage() {
    return {
      markdown: {
        serialize: serializeOrderedList
      }
    };
  }
});

const EditorListItem = ListItem.extend({
  parseHTML() {
    return [
      {
        tag: 'li',
        getAttrs: (node) => (isTaskItemElement(node) ? false : null)
      }
    ];
  },
  addStorage() {
    return {
      markdown: {
        serialize(state, node) {
          serializeListItemContent(state, node);
        }
      }
    };
  }
});

const EditorTaskList = TaskList.extend({
  parseHTML() {
    return [
      {
        tag: `ul[data-type="${this.name}"]`,
        priority: 60
      },
      {
        tag: 'ul.contains-task-list',
        priority: 60
      }
    ];
  },
  addStorage() {
    return {
      markdown: {
        serialize: serializeTaskList,
        parse: {
          setup(markdownit) {
            setupTaskListParser(markdownit);
          },
          updateDOM(element) {
            updateTaskListDOM(element);
          }
        }
      }
    };
  }
});

const EditorTaskItem = TaskItem.extend({
  parseHTML() {
    return [
      {
        tag: `li[data-type="${this.name}"]`,
        priority: 60
      },
      {
        tag: 'li.task-list-item',
        priority: 60
      }
    ];
  },
  addStorage() {
    return {
      markdown: {
        serialize(state, node) {
          serializeListItemContent(state, node);
        },
        parse: {
          updateDOM(element) {
            updateTaskListDOM(element);
          }
        }
      }
    };
  },
  addAttributes() {
    return {
      ...this.parent?.(),
      checked: {
        default: false,
        keepOnSplit: false,
        parseHTML: (element) => {
          const dataChecked = element.getAttribute('data-checked');
          if (dataChecked !== null) {
            return dataChecked === '' || dataChecked === 'true';
          }

          const input = element.querySelector('input[type="checkbox"]');
          return input ? input.hasAttribute('checked') : false;
        },
        renderHTML: (attributes) => ({
          'data-checked': attributes.checked
        })
      }
    };
  },
  addNodeView() {
    return ({
      node, HTMLAttributes, getPos, editor
    }) => {
      const listItem = document.createElement('li');
      const checkboxWrapper = document.createElement('label');
      const checkboxStyler = document.createElement('span');
      const checkbox = document.createElement('input');
      const content = document.createElement('div');

      const updateA11Y = () => {
        checkbox.ariaLabel = this.options?.a11y?.checkboxLabel?.(node, checkbox.checked)
          || `Task item checkbox for ${node.textContent || 'empty task item'}`;
      };

      updateA11Y();

      checkboxWrapper.contentEditable = 'false';
      checkbox.type = 'checkbox';
      checkbox.addEventListener('mousedown', (event) => event.preventDefault());

      const toggleCheckbox = (checked) => {
        const position = getPos();
        if (typeof position !== 'number') return;

        let tr = editor.state.tr;
        const currentNode = tr.doc.nodeAt(position);
        if (!currentNode) return;

        tr = tr.setNodeMarkup(position, undefined, {
          ...currentNode.attrs,
          checked
        });

        const start = position + 1;
        const end = position + currentNode.nodeSize - 1;

        if (checked) {
          tr = tr.addMark(start, end, editor.schema.marks.strike.create());
        } else {
          tr = tr.removeMark(start, end, editor.schema.marks.strike);
        }

        editor.view.dispatch(tr);
      };

      checkbox.addEventListener('change', (event) => {
        toggleCheckbox(event.target.checked);
      });

      content.addEventListener('click', (event) => {
        if (!editor.isEditable) {
          if (event.target.tagName.toLowerCase() === 'a') {
            return; // Allow clicking links
          }
          event.preventDefault();
          checkbox.checked = !checkbox.checked;
          toggleCheckbox(checkbox.checked);
        }
      });

      Object.entries(this.options?.HTMLAttributes || {}).forEach(([key, value]) => {
        listItem.setAttribute(key, value);
      });

      listItem.dataset.checked = node.attrs.checked;
      checkbox.checked = node.attrs.checked;

      checkboxWrapper.append(checkbox, checkboxStyler);
      listItem.append(checkboxWrapper, content);

      Object.entries(HTMLAttributes).forEach(([key, value]) => {
        listItem.setAttribute(key, value);
      });

      return {
        dom: listItem,
        contentDOM: content,
        update: (updatedNode) => {
          if (updatedNode.type !== this.type) {
            return false;
          }

          listItem.dataset.checked = updatedNode.attrs.checked;
          checkbox.checked = updatedNode.attrs.checked;
          updateA11Y();

          return true;
        }
      };
    };
  }
});

export {
  EditorBulletList,
  EditorListItem,
  EditorOrderedList,
  EditorTaskItem,
  EditorTaskList
};

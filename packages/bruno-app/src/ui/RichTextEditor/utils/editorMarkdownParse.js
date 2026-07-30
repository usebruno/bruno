import taskListPlugin from 'markdown-it-task-lists';
import { patchLinkifyToExtendUrls } from 'utils/linkify';
import runMarkdownitSetupOnce from './markdownitSetupOnce';

const TASK_LIST_LINE_PATTERN = /^(\s*[-*+]\s+)\[([\sxX]*?)\]\s*(.*)$/;

const normalizeTaskListMarkdown = (content) => {
  if (!content) {
    return content;
  }

  return content
    // `.` doesn't match `\r` in JS regex, so a line ending in a stray `\r`
    // (CRLF split only on `\n`) would fail TASK_LIST_LINE_PATTERN's `(.*)$`
    // entirely and silently skip normalization — normalize line endings first.
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => {
      const match = line.match(TASK_LIST_LINE_PATTERN);

      if (!match) {
        return line;
      }

      const [, prefix, marker, rest] = match;
      const markerChar = marker.trim().toLowerCase() === 'x' ? 'x' : ' ';

      return `${prefix}[${markerChar}] ${rest}`;
    })
    .join('\n');
};

const setupTaskListParser = (markdownit) => {
  runMarkdownitSetupOnce(markdownit, '__docsTaskListsNormalized', (md) => {
    const originalRender = md.render.bind(md);
    const originalParse = md.parse.bind(md);

    md.render = (src, env) => originalRender(
      typeof src === 'string' ? normalizeTaskListMarkdown(src) : src,
      env
    );

    md.parse = (src, env) => originalParse(
      typeof src === 'string' ? normalizeTaskListMarkdown(src) : src,
      env
    );
  });

  runMarkdownitSetupOnce(markdownit, '__docsTaskListsApplied', (md) => {
    md.use(taskListPlugin, {
      enabled: true,
      label: false,
      labelAfter: false
    });
  });
};

const setupLinkifyExtendedUrls = (markdownit) => {
  runMarkdownitSetupOnce(markdownit, '__docsLinkifyExtended', patchLinkifyToExtendUrls);
};

// markdown-it-task-lists renders one <ul> per source list even when task and
// non-task items are interleaved, but it marks the *whole* <ul> as a task
// list as soon as any item in it has a checkbox — so a mixed list would parse
// into a single taskList node containing plain listItems. The ProseMirror
// schema has no such mixed node, so each run of same-kind items is split into
// its own <ul>, and each item's checkbox <label>/text siblings are unwrapped
// into a <div> to match the taskItem node's expected content shape.
const updateTaskListDOM = (element) => {
  element.querySelectorAll('ul.contains-task-list, ul[data-type="taskList"]').forEach((ul) => {
    let currentList = null;
    let isCurrentTask = null;
    const newLists = [];

    Array.from(ul.children).forEach((li) => {
      const isTask = li.classList.contains('task-list-item') || li.getAttribute('data-type') === 'taskItem';

      if (isCurrentTask !== isTask || !currentList) {
        currentList = ul.cloneNode(false);
        if (isTask) {
          currentList.classList.add('contains-task-list');
          currentList.setAttribute('data-type', 'taskList');
        } else {
          currentList.classList.remove('contains-task-list');
          currentList.removeAttribute('data-type');
          if (currentList.getAttribute('class') === '') {
            currentList.removeAttribute('class');
          }
        }
        newLists.push(currentList);
        isCurrentTask = isTask;
      }
      currentList.appendChild(li);
    });

    if (newLists.length > 0) {
      newLists.forEach((nl) => ul.parentNode.insertBefore(nl, ul));
      ul.remove();
    }
  });

  element.querySelectorAll('.task-list-item, ul[data-type="taskList"] > li').forEach((item) => {
    const input = item.querySelector('input[type="checkbox"]');
    item.setAttribute('data-type', 'taskItem');

    if (input) {
      item.setAttribute('data-checked', input.checked ? 'true' : 'false');
      input.remove();
    }

    const label = item.querySelector('label');
    if (label && !item.querySelector('div')) {
      const content = document.createElement('div');
      while (label.nextSibling) {
        content.appendChild(label.nextSibling);
      }
      label.replaceWith(content);
    }
  });
};

export {
  normalizeTaskListMarkdown,
  setupLinkifyExtendedUrls,
  setupTaskListParser,
  updateTaskListDOM
};

import taskListPlugin from 'markdown-it-task-lists';

const TASK_LIST_LINE_PATTERN = /^(\s*[-*+]\s+)\[([\sxX]*?)\]\s*(.*)$/;

const normalizeTaskListMarkdown = (content) => {
  if (!content) {
    return content;
  }

  return content
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
  if (!markdownit.__docsTaskListsNormalized) {
    const originalRender = markdownit.render.bind(markdownit);
    const originalParse = markdownit.parse.bind(markdownit);

    markdownit.render = (src, env) => originalRender(
      typeof src === 'string' ? normalizeTaskListMarkdown(src) : src,
      env
    );

    markdownit.parse = (src, env) => originalParse(
      typeof src === 'string' ? normalizeTaskListMarkdown(src) : src,
      env
    );

    markdownit.__docsTaskListsNormalized = true;
  }

  if (markdownit.__docsTaskListsApplied) {
    return;
  }

  markdownit.use(taskListPlugin, {
    enabled: true,
    label: false,
    labelAfter: false
  });

  markdownit.__docsTaskListsApplied = true;
};

const updateTaskListDOM = (element) => {
  element.querySelectorAll('.contains-task-list, ul[data-type="taskList"]').forEach((list) => {
    list.setAttribute('data-type', 'taskList');
  });

  element.querySelectorAll('.task-list-item, ul.contains-task-list > li, ul[data-type="taskList"] > li').forEach((item) => {
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

export { normalizeTaskListMarkdown, setupTaskListParser, updateTaskListDOM };

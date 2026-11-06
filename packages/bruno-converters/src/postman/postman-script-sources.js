/**
 * The single definition of where script text lives on each side of a Postman
 * import — the Postman collection going in, the Bruno collection coming out.
 *
 * Both sides are walked by more than one consumer (the package scan, the
 * `pm.require` rewrite, the translation report). Each walk that knows the shape
 * for itself is a walk that can quietly disagree with the others about what
 * counts as a script, so the shape is described once, here.
 */

/**
 * Every slot a Bruno request keeps script text in. `tests` sits on the request
 * rather than under `script`, which is exactly the sort of detail a second copy
 * of this walk gets wrong.
 */
const scriptSlots = (request) => [
  [request.script, 'req'],
  [request.script, 'res'],
  [request, 'tests']
];

/**
 * Visits every script in a Bruno collection: the collection root, each folder
 * root, and each request. Empty and non-string slots are skipped.
 *
 * Returning a string from `visit` writes it back to that slot; returning
 * nothing leaves it untouched — so one walk serves readers and rewriters alike.
 */
export const forEachBrunoScript = (brunoCollection, visit) => {
  const visitRequest = (request) => {
    if (!request) return;

    for (const [holder, key] of scriptSlots(request)) {
      if (!holder || typeof holder[key] !== 'string' || !holder[key]) continue;

      const next = visit(holder[key]);
      if (typeof next === 'string' && next !== holder[key]) holder[key] = next;
    }
  };

  const visitItems = (items) => {
    if (!Array.isArray(items)) return;

    items.forEach((item) => {
      if (item?.type === 'folder') {
        visitRequest(item?.root?.request);
        visitItems(item.items);
      } else {
        visitRequest(item?.request);
      }
    });
  };

  visitRequest(brunoCollection?.root?.request);
  visitItems(brunoCollection?.items);
};

/**
 * Visits every event script in a Postman collection — collection, folder and
 * request level alike — passing the joined source and the event's `listen`, so
 * a caller can narrow to the events it cares about.
 */
export const forEachPostmanScript = (postmanCollection, visit) => {
  const visitEvents = (events) => {
    if (!Array.isArray(events)) return;

    events.forEach((event) => {
      const exec = event?.script?.exec;
      if (!exec?.length) return;

      visit(Array.isArray(exec) ? exec.join('\n') : exec, event.listen);
    });
  };

  const visitItems = (items) => {
    if (!Array.isArray(items)) return;

    items.forEach((item) => {
      visitEvents(item?.event);
      visitItems(item?.item);
    });
  };

  visitEvents(postmanCollection?.event);
  visitItems(postmanCollection?.item);
};

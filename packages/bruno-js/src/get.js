/**
 * Gets property values for all items in source array
 */
const arrayGet = (source, prop) => {
  if (!Array.isArray(source)) return [];

  const results = [];

  source.forEach(item => {
    const value = item[prop];
    if (value != null) {
      results.push(...Array.isArray(value) ? value : [value]);
    }
  });

  return results;
};

/**
 * Recursively collects property values into results
 */
const deepGet = (source, prop, results) => {
  if (source == null || typeof source !== 'object') return;

  if (Array.isArray(source)) {
    source.forEach(item => deepGet(item, prop, results));
  } else {
    for (const key in source) {
      if (key === prop) {
        const value = source[prop];
        results.push(...Array.isArray(value) ? value : [value]);
      } else {
        deepGet(source[key], prop, results);
      }
    }
  }
};

/**
 * Gets property value(s) from source 
 */
const baseGet = (source, prop, deep = false) => {
  if (source == null || typeof source !== 'object') return;

  if (!deep) {
    return Array.isArray(source) ? arrayGet(source, prop) : source[prop];
  } else {
    const results = [];
    deepGet(source, prop, results);
    return results.filter(value => value != null);
  }
};

/**
 * Apply filter on source array or object
 */
const applyFilter = (source, predicate, single = false) => {
  const list = Array.isArray(source) ? source : [source];
  const result = list.filter(predicate);
  return single ? result[0] : result;
};

/**
 * Supercharged getter with deep navigation and filter support
 * 
 * 1. Easy array navigation
 *    ```js
 *    get(data, 'customer.orders.items.amount')
 *    ```
 * 2. Deep navigation .. double dots
 *    ```js
 *    get(data, '..items.amount')
 *    ```
 * 3. Array indexing
 *    ```js
 *    get(data, '..items[0].amount')
 *    ```
 * 4. Array filtering [?] with corresponding js filter
 *    ```js
 *    get(data, '..items[?].amount', i => i.amount > 20) 
 *    ```
 */
function get(source, path, ...filters) {
  const paths = path
    .replace(/\s+/g, '')
    .split(/(\.{1,2}|\[\?\]|\[\d+\])/g) // ["..", "items", "[?]", ".", "amount", "[0]" ]
    .filter(s => s.length > 0)
    .map(str => {
      str = str.replace(/\[|\]/g, '');
      const index = parseInt(str);
      return isNaN(index) ? str : index;
    });

  let index = 0, lookbehind = '', filterIndex = 0;

  while (source != null && index < paths.length) {
    const token = paths[index++];

    switch (true) {
      case token === "..":
      case token === ".":
        break;
      case token === "?":
        const filter = filters[filterIndex++];
        if (filter == null)
          throw new Error(`missing filter for ${lookbehind}`);
        const single = !Array.isArray(source);
        source = applyFilter(source, filter, single);
        break;
      case typeof token === 'number':
        source = source[token];
        break;
      default:
        source = baseGet(source, token, lookbehind === "..");
        if (Array.isArray(source) && !source.length) {
          source = undefined;
        }
    }

    lookbehind = token;
  }

  return source;
}

module.exports = {
  get
};

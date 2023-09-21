/**
 * If value is an array returns the deeply flattened array, otherwise value
 */
function normalize(value: any) {
  if (!Array.isArray(value)) return value;

  const values = [] as any[];

  value.forEach((item) => {
    const value = normalize(item);
    if (value != null) {
      values.push(...(Array.isArray(value) ? value : [value]));
    }
  });

  return values.length ? values : undefined;
}

/**
 * Gets value of a prop from source.
 *
 * If source is an array get value from each item.
 *
 * If deep is true then recursively gets values for prop in nested objects.
 *
 * Once a value is found will not recurse further into that value.
 */
function getValue(source: any, prop: string, deep = false): any {
  if (typeof source !== 'object') return;

  let value;

  if (Array.isArray(source)) {
    value = source.map((item) => getValue(item, prop, deep));
  } else {
    value = source[prop];
    if (deep) {
      value = [value];
      for (const [key, item] of Object.entries(source)) {
        if (key !== prop && typeof item === 'object') {
          value.push(getValue(source[key], prop, deep));
        }
      }
    }
  }

  return normalize(value);
}

type PredicateOrMapper = ((obj: any) => any) | Record<string, any>;

/**
 * Make a predicate function that checks scalar properties for equality
 */
function objectPredicate(obj: Record<string, any>) {
  return (item: any) => {
    for (const [key, value] of Object.entries(obj)) {
      if (item[key] !== value) return false;
    }
    return true;
  };
}

/**
 * Apply filter on source array or object
 *
 * If the filter returns a non boolean non null value it is treated as a mapped value
 */
function filterOrMap(source: any, funOrObj: PredicateOrMapper) {
  const fun = typeof funOrObj === 'object' ? objectPredicate(funOrObj) : funOrObj;
  const isArray = Array.isArray(source);
  const list = isArray ? source : [source];
  const result = [] as any[];
  for (const item of list) {
    if (item == null) continue;
    const value = fun(item);
    if (value === true) {
      result.push(item); // predicate
    } else if (value != null && value !== false) {
      result.push(value); // mapper
    }
  }
  return normalize(isArray ? result : result[0]);
}

/**
 * Getter with deep navigation, filter and map support
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
 * 4. Array filtering [?] with corresponding filter function
 *    ```js
 *    get(data, '..items[?].amount', i => i.amount > 20)
 *    ```
 * 5. Array filtering [?] with simple object predicate, same as (i => i.id === 2 && i.amount === 20)
 *    ```js
 *    get(data, '..items[?]', { id: 2, amount: 20 })
 *    ```
 * 6. Array mapping [?] with corresponding mapper function
 *    ```js
 *    get(data, '..items[?].amount', i => i.amount + 10)
 *    ```
 */
export function get(source: any, path: string, ...fns: PredicateOrMapper[]) {
  const paths = path
    .replace(/\s+/g, '')
    .split(/(\.{1,2}|\[\?\]|\[\d+\])/g) // ["..", "items", "[?]", ".", "amount", "[0]" ]
    .filter((s) => s.length > 0)
    .map((str) => {
      str = str.replace(/\[|\]/g, '');
      const index = parseInt(str);
      return isNaN(index) ? str : index;
    });

  let index = 0,
    lookbehind = '' as string | number,
    funIndex = 0;

  while (source != null && index < paths.length) {
    const token = paths[index++];

    switch (true) {
      case token === '..':
      case token === '.':
        break;
      case token === '?':
        const fun = fns[funIndex++];
        if (fun == null) throw new Error(`missing function for ${lookbehind}`);
        source = filterOrMap(source, fun);
        break;
      case typeof token === 'number':
        source = normalize(source[token]);
        break;
      default:
        source = getValue(source, token as string, lookbehind === '..');
    }

    lookbehind = token;
  }

  return source;
}

const GrpcMessageList = require('../src/grpc-message-list');

describe('GrpcMessageList', () => {
  const defaultMessages = [{ id: 1 }, { id: 2 }, { id: 3 }];

  function createList({ messages = [...defaultMessages], writable = true } = {}) {
    return { list: new GrpcMessageList(() => messages, { writable }), messages };
  }

  describe('read methods', () => {
    test('get() defaults to the first message — unary calls only have one', () => {
      const { list } = createList();
      expect(list.get()).toEqual({ id: 1 });
      expect(list.get(2)).toEqual({ id: 3 });
      expect(list.get(99)).toBeUndefined();
    });

    test('reads re-run against the backing array on every call', () => {
      const { list, messages } = createList();
      expect(list.count()).toBe(3);

      messages.push({ id: 4 });

      expect(list.count()).toBe(4);
      expect(list.all()).toHaveLength(4);
    });

    test('toJSON() returns the messages, so JSON.stringify yields them', () => {
      const { list } = createList();
      expect(list.toJSON()).toEqual(defaultMessages);
      expect(JSON.parse(JSON.stringify(list))).toEqual(defaultMessages);
    });

    test('reduce() works with and without an accumulator', () => {
      const { list } = createList();
      expect(list.reduce((acc, message) => acc + message.id, 0)).toBe(6);
      expect(list.reduce((acc, message) => ({ id: acc.id + message.id }))).toEqual({ id: 6 });
    });

    test('iteration methods bind the optional context argument', () => {
      const { list } = createList();

      const matches = list.filter(function (message) {
        return message.id > this.floor;
      }, { floor: 1 });

      expect(matches).toEqual([{ id: 2 }, { id: 3 }]);
    });
  });

  describe('write methods', () => {
    test('set() replaces the message at an index', () => {
      const { list, messages } = createList();
      list.set(1, { id: 20 });
      expect(messages).toEqual([{ id: 1 }, { id: 20 }, { id: 3 }]);
    });

    test('set() and delete() ignore an index that is not a valid position', () => {
      const { list, messages } = createList();

      for (const index of [-1, 1.5, 3, '0', undefined]) {
        list.set(index, { id: 99 });
        list.delete(index);
      }

      expect(messages).toEqual(defaultMessages);
    });

    test('add() appends and prepend() puts the message first', () => {
      const { list, messages } = createList();
      list.add({ id: 4 });
      list.prepend({ id: 0 });
      expect(messages).toEqual([{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);
    });

    test('delete() removes the message at an index; deleteAll() empties the array in place', () => {
      const { list, messages } = createList();

      list.delete(1);
      expect(messages).toEqual([{ id: 1 }, { id: 3 }]);

      list.deleteAll();
      expect(messages).toEqual([]);
    });

    test('toEntry receives the message, the entry being replaced, and the target index', () => {
      const calls = [];
      const messages = [{ name: 'first', content: 'a' }];
      const list = new GrpcMessageList(() => messages, {
        writable: true,
        toEntry: (message, existing, index) => {
          calls.push({ message, existing, index });
          return { name: existing?.name || `message ${index + 1}`, content: message };
        }
      });

      list.set(0, 'b');
      list.add('c');
      list.prepend('d');

      expect(calls).toEqual([
        { message: 'b', existing: { name: 'first', content: 'a' }, index: 0 },
        { message: 'c', existing: undefined, index: 1 },
        { message: 'd', existing: undefined, index: 0 }
      ]);
      expect(messages).toEqual([
        { name: 'message 1', content: 'd' },
        { name: 'first', content: 'b' },
        { name: 'message 2', content: 'c' }
      ]);
    });
  });

  test('every write method throws on a read-only list', () => {
    const { list, messages } = createList({ writable: false });

    for (const method of ['set', 'add', 'prepend', 'delete', 'deleteAll']) {
      expect(() => list[method](0, { id: 99 })).toThrow(
        `messages.${method}() is not available once the call has been sent`
      );
    }

    expect(messages).toEqual(defaultMessages);
  });
});

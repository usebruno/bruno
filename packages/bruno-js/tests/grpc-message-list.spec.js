const GrpcMessageList = require('../src/grpc/grpc-message-list');

describe('GrpcMessageList', () => {
  const defaultMessages = [{ id: 1 }, { id: 2 }, { id: 3 }];

  function createList({ messages = [...defaultMessages] } = {}) {
    return { list: new GrpcMessageList(() => messages), messages };
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

    test('all() hands back a copy, so the backing array cannot be edited through it', () => {
      const { list, messages } = createList();

      list.all().push({ id: 99 });

      expect(messages).toEqual(defaultMessages);
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

  test('exposes no write methods, since gRPC messages are read-only in scripts', () => {
    const { list } = createList();

    for (const method of ['set', 'add', 'prepend', 'delete', 'deleteAll']) {
      expect(list[method]).toBeUndefined();
    }
  });
});

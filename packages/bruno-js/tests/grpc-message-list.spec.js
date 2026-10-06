const GrpcMessageList = require('../src/grpc/grpc-message-list');

describe('GrpcMessageList', () => {
  const defaultMessages = [{ id: 1 }, { id: 2 }, { id: 3 }];

  function createList({ messages = [...defaultMessages] } = {}) {
    return { list: new GrpcMessageList(messages), messages };
  }

  describe('read methods', () => {
    test('get() defaults to the first message — unary calls only have one', () => {
      const { list } = createList();
      expect(list.get()).toEqual({ id: 1 });
      expect(list.get(2)).toEqual({ id: 3 });
      expect(list.get(99)).toBeUndefined();
    });

    test('snapshots the messages it is constructed with, so later pushes are not picked up', () => {
      const { list, messages } = createList();
      expect(list.count()).toBe(3);

      messages.push({ id: 4 });

      expect(list.count()).toBe(3);
      expect(list.all()).toHaveLength(3);
    });

    test('all() hands back a copy, so the snapshot cannot be edited through it', () => {
      const { list } = createList();

      list.all().push({ id: 99 });

      expect(list.count()).toBe(3);
    });

    test('the snapshot is a deep clone, so editing a message cannot reach the backing array', () => {
      const { list, messages } = createList({ messages: [{ id: 1, data: { greeting: 'hi' } }] });

      list.get().data.greeting = 'tampered';

      expect(messages[0].data.greeting).toBe('hi');
    });

    test('an absent backing array reads as an empty list', () => {
      expect(new GrpcMessageList().count()).toBe(0);
      expect(new GrpcMessageList(undefined).all()).toEqual([]);
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

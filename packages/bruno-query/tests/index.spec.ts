import { describe, expect, it } from '@jest/globals';

import { get } from '../src/index';

const data = {
  customer: {
    address: {
      city: 'bangalore'
    },
    orders: [
      {
        id: 'order-1',
        items: [
          { id: 1, amount: 10 },
          { id: 2, amount: 20 }
        ]
      },
      {
        id: 'order-2',
        items: [
          { id: 3, amount: 30 },
          { id: 4, amount: 40 }
        ]
      }
    ]
  }
};

describe('get', () => {
  it.each([
    ['customer.address.city', 'bangalore'],
    ['customer.orders.items.amount', [10, 20, 30, 40]],
    ['customer.orders.items.amount[0]', 10],
    ['..items.amount', [10, 20, 30, 40]],
    ['..amount', [10, 20, 30, 40]],
    ['..items.amount[0]', 10],
    ['..items[0].amount', 10],
    ['..items[5].amount', undefined], // invalid index
    ['..id', ['order-1', 1, 2, 'order-2', 3, 4]], // all ids
    ['customer.orders.foo', undefined],
    ['..customer.foo', undefined],
    ['..address', [{ city: 'bangalore' }]], // .. will return array
    ['..address[0]', { city: 'bangalore' }]
  ])('%s should be %j', (expr, result) => {
    expect(get(data, expr)).toEqual(result);
  });

  // filter and map
  it.each([
    ['..items[?].amount', [40], (i: any) => i.amount > 30], // [?] filter
    ['..items[?].amount', [40], { id: 4, amount: 40 }], // object filter
    ['..items[?].amount', undefined, { id: 5, amount: 40 }],
    ['..items..amount[?][0]', 40, (amt: number) => amt > 30],
    ['..items..amount[0][?]', undefined, (amt: number) => amt > 30], // filter on single value
    ['..items..amount[?]', [11, 21, 31, 41], (amt: number) => amt + 1], // [?] mapper
    ['..items..amount[0][?]', 11, (amt: number) => amt + 1] // [?] map on single value
  ])('%s should be %j for %s', (expr, result, filter) => {
    expect(get(data, expr, filter)).toEqual(result);
  });
});

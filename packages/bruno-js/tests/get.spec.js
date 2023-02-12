const { filter } = require("lodash");
const { get } = require("../src/get");

const data = {
  customer: {
    address: {
      city: "bangalore"
    },
    orders: [
      {
        id: "order-1",
        items: [
          { id: 1, amount: 10 },
          { id: 2, amount: 20 },
        ]
      },
      {
        id: "order-2",
        items: [
          { id: 3, amount: 30, },
          { id: 4, amount: 40 }
        ]
      }
    ]
  },
};

describe("get", () => {
  it.each([
    ["customer.address.city", "bangalore"],
    ["customer.orders.items.amount", [10, 20, 30, 40]],
    ["customer.orders.items.amount[0]", 10],
    ["..items.amount", [10, 20, 30, 40]],
    ["..amount", [10, 20, 30, 40]],
    ["..items.amount[0]", 10],
    ["..items[0].amount", 10],
    ["..items[?].amount", [40], (i) => i.amount > 30],     // [?] filter
    ["..id", ["order-1", 1, 2, "order-2", 3, 4]],          // all ids
    ["customer.orders.foo", undefined],
    ["..customer.foo", undefined],
    ["..address", [{ city: "bangalore" }]],                // .. will return array
    ["..address[0]", { city: "bangalore" }]
  ])("%s should be %j %s", (expr, result, filter = undefined) => {
    expect(get(data, expr, filter)).toEqual(result);
  });
});

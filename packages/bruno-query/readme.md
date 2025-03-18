# bruno-query

Bruno query with deep navigation, filter and map support

Easy array navigation
```js
get(data, 'customer.orders.items.amount')
```
Deep navigation .. double dots
```js
get(data, '..items.amount')
```
Array indexing
```js
get(data, '..items[0].amount')
```
Array filtering [?] with corresponding filter function
```js
get(data, '..items[?].amount', i => i.amount > 20) 
```
Array filtering [?] with simple object predicate, same as (i => i.id === 2 && i.amount === 20)
```js
get(data, '..items[?]', { id: 2, amount: 20 }) 
```
Array mapping [?] with corresponding mapper function
```js
get(data, '..items..amount[?]', amt => amt + 10) 
```

### Publish to Npm Registry
```bash
npm publish --access=public
```

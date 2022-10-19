## development

```bash
# install deps
npm i

# run next app
npm run dev --workspace=packages/bruno-app

# run electron app
npm run dev --workspace=packages/bruno-electron

# build next app
npm run build --workspace=packages/bruno-app
```

## fix

You might encounter a `Unsupported platform` error when you run `npm install`. To fix this, you will need to delete `node_modules` and `package-lock.json` and run `npm install`. This should install all the necessary packages needed to run the app.

# testing

```bash
# bruno-schema
npm test --workspace=packages/bruno-schema

```

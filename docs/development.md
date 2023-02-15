## development

Bruno is deing developed as a desktop app. You need to load the app by running the nextjs app in one terminal and then run the electron app in another terminal.

### Dependencies
* NodeJS v18

###

```bash
# use nodejs 18 version
nvm use

# install deps
npm i --legacy-peer-deps

# build graphql docs
npm run build:graphql-docs

# run next app
npm run dev --workspace=packages/bruno-app

# run electron app
npm run dev --workspace=packages/bruno-electron

# build next app
npm run build --workspace=packages/bruno-app
```

### fix

You might encounter a `Unsupported platform` error when you run `npm install`. To fix this, you will need to delete `node_modules` and `package-lock.json` and run `npm install`. This should install all the necessary packages needed to run the app.

### testing

```bash
# bruno-schema
npm test --workspace=packages/bruno-schema

# bruno-lang
npm test --workspace=packages/bruno-schema

```

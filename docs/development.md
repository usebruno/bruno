## Development

Bruno is being developed as a desktop app. You need to load the app by running the nextjs app in one terminal and then run the electron app in another terminal.

### Dependencies

- NodeJS v18

### Local Development

```bash
# use nodejs 18 version
nvm use

# install deps
npm i --legacy-peer-deps

# build graphql docs
npm run build:graphql-docs

# build bruno query
npm run build:bruno-query

# run next app (terminal 1)
npm run dev:web

# run electron app (terminal 2)
npm run dev:electron
```

### Troubleshooting

You might encounter a `Unsupported platform` error when you run `npm install`. To fix this, you will need to delete `node_modules` and `package-lock.json` and run `npm install`. This should install all the necessary packages needed to run the app.

```shell
# Delete node_modules in sub-directories
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
  rm -rf "$dir"
done

# Delete package-lock in sub-directories
find . -type f -name "package-lock.json" -delete
```

### Testing

```bash
# bruno-schema
npm test --workspace=packages/bruno-schema

# bruno-lang
npm test --workspace=packages/bruno-lang
```

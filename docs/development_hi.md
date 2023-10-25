[English](/docs/development.md) | [Українська](/docs/development_ua.md) | [Русский](/docs/development_ru.md) | [Deutsch](/docs/development_de.md) | [Français](/docs/development_fr.md) | **हिंदी**

## विकास

Bruno को एक वेब ऐप के रूप में विकसित किया जा रहा है। आपको एक टर्मिनल में Next.js ऐप चलाकर ऐप को लोड करना होगा और फिर दूसरे टर्मिनल में इलेक्ट्रॉन ऐप चलाना होगा।

### विकास

- NodeJS v18

### स्थानीय विकास

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

### समस्या निवारण

जब आप `Unsupported platform` चलाते हैं तो आपको `npm install` त्रुटि का सामना करना पड़ सकता है। इसे ठीक करने के लिए, आपको `node_modules` और `package-lock.json` को हटाना होगा और `npm install` चलाना होगा। इसमें ऐप चलाने के लिए आवश्यक सभी आवश्यक पैकेज इंस्टॉल होने चाहिए।

```shell
# Delete node_modules in sub-directories
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
  rm -rf "$dir"
done

# Delete package-lock in sub-directories
find . -type f -name "package-lock.json" -delete
```

### परिक्षण

```bash
# bruno-schema
npm test --workspace=packages/bruno-schema

# bruno-lang
npm test --workspace=packages/bruno-lang
```

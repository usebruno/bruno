[English](../../contributing.md)

## आइए मिलकर Bruno को बेहतर बनाएं !!

हमें खुशी है कि आप Bruno को बेहतर बनाना चाहते हैं। Bruno को अपने कंप्यूटर पर लाना शुरू करने के लिए दिशानिर्देश नीचे दिए गए हैं।

### टेक्नोलॉजी स्टैक

Bruno को Next.js और React का उपयोग करके बनाया गया है। हम डेस्कटॉप संस्करण को शिप करने के लिए इलेक्ट्रॉन का भी उपयोग करते हैं (जो स्थानीय संग्रह का समर्थन करता है)

Libraries जिनका हम उपयोग करते हैं

- CSS - Tailwind
- कोड संपादक - Codemirror
- State Management - Redux
- Icons - Tabler Icons
- Forms - formik
- Schema Validation - Yup
- Request Client - axios
- Filesystem Watcher - chokidar

### निर्भरताएँ

आपको [Node v20.x या नवीनतम LTS संस्करण](https://nodejs.org/en/) और npm 8.x की आवश्यकता होगी। हम प्रोजेक्ट में npm वर्कस्पेस का उपयोग करते हैं

## डेवलपमेंट

Bruno को एक डेस्कटॉप ऐप के रूप में बनाया किया जा रहा है। आपको Next.js ऐप को एक टर्मिनल में चलाकर ऐप को लोड करना होगा और फिर इलेक्ट्रॉन ऐप को दूसरे टर्मिनल में चलाना होगा।

### लोकल डेवलपमेंट

```bash
# nodejs 18 संस्करण का उपयोग करें
nvm use

# डिपेंडेंसी इनस्टॉल करे
npm i --legacy-peer-deps

# पैकेज बिल्ड करें
npm run build:graphql-docs
npm run build:bruno-query
npm run build:bruno-common

# Next.js ऐप चलाएँ (टर्मिनल 1 पर)
npm run dev:web

# इलेक्ट्रॉन ऐप चलाएँ (टर्मिनल 2 पर)
npm run dev:electron
```

### समस्या निवारण

जब आप `npm इंस्टॉल` चलाते हैं तो आपको `असमर्थित प्लेटफ़ॉर्म` त्रुटि का सामना करना पड़ सकता है। इसे ठीक करने के लिए, आपको `node_modules` और `package-lock.json` को हटाना होगा और `npm install` चलाना होगा। इसमें ऐप चलाने के लिए आवश्यक सभी आवश्यक पैकेज इंस्टॉल होने चाहिए।

```shell
# सब-डायरेक्टरी में node_modules डिलीट करे
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
  rm -rf "$dir"
done

# सब-डायरेक्टरी में package-lock डिलीट करे
find . -type f -name "package-lock.json" -delete
```

### परिक्षण

```bash
# bruno-schema
npm test --workspace=packages/bruno-schema

# bruno-lang
npm test --workspace=packages/bruno-lang
```

### पुल अनुरोध प्रक्रिया

- कृपया PR को छोटा रखें और एक चीज़ पर केंद्रित रखें
- कृपया शाखाएँ बनाने के प्रारूप का पालन करें
  - feature/[feature name]: इस शाखा में किसी विशिष्ट सुविधा के लिए परिवर्तन होने चाहिए
    - उदाहरण: feature/dark-mode
  - bugfix/[bug name]: इस शाखा में केवल विशिष्ट बग के लिए बग फिक्स शामिल होने चाहिए
    - उदाहरण bugfix/bug-1

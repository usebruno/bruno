[English](/docs/development.md) | [Українська](/docs/development_ua.md) | [Русский](/docs/development_ru.md) | [Deutsch](/docs/development_de.md) | [Français](/docs/development_fr.md) | **हिंदी**

## आइए मिलकर bruno को बेहतर बनाएं !!

मुझे ख़ुशी है कि आप Bruno में सुधार करना चाह रहे हैं। आपके कंप्यूटर पर Bruno लाना शुरू करने के लिए दिशानिर्देश नीचे दिए गए हैं।

### प्रौद्योगिकी ढेर

ब्रूनो को NextJs और React का उपयोग करके बनाया गया है। हम डेस्कटॉप संस्करण को शिप करने के लिए इलेक्ट्रॉन का भी उपयोग करते हैं (जो स्थानीय संग्रह का समर्थन करता है)

पुस्तकालय जिनका हम उपयोग करते हैं

- CSS - Tailwind
- Code Editors - Codemirror
- State Management - Redux
- Icons - Tabler Icons
- प्रपत्र - formik
- Schema मान्यकरण - Yup
- Request Client - axios
- Filesystem Watcher - chokidar

### निर्भरताएँ

आपको [Node v18.x या नवीनतम LTS संस्करण](https://nodejs.org/en/) और npm 8.x. हम प्रोजेक्ट में npm वर्कस्पेस का उपयोग करते हैं

### आइए कोडिंग शुरू करें

कृपया स्थानीय विकास परिवेश को चलाने के निर्देशों के लिए [development.md](docs/development.hi) का संदर्भ लें।

### Pull Request बढ़ाना

- कृपया PR's को छोटा रखें और एक चीज़ पर ध्यान केंद्रित करें
- कृपया शाखाएँ बनाने के प्रारूप का पालन करें
  - feature/[feature name]: इस शाखा में किसी विशिष्ट सुविधा के लिए परिवर्तन होने चाहिए
    - उदाहरण: feature/dark-mode
  - bugfix/[bug name]: इस शाखा में केवल विशिष्ट बग के लिए बग फिक्स शामिल होने चाहिए
    - उदाहरण bugfix/bug-1

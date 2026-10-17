<br />
<img src="../../assets/images/logo-transparent.png" width="80"/>

### ब्रूनो - API इंटरफेस (API) का अन्वेषण और परीक्षण करने के लिए एक ओपन-सोर्स विकास वातावरण।

[![GitHub संस्करण](https://badge.fury.io/gh/usebruno%2Fbruno.svg)](https://badge.fury.io/gh/usebruno%2Fbruno)
[![CI](https://github.com/usebruno/bruno/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/usebruno/bruno/actions/workflows/tests.yml)
[![कमिट गतिविधि](https://img.shields.io/github/commit-activity/m/usebruno/bruno)](https://github.com/usebruno/bruno/pulse)
[![X](https://img.shields.io/twitter/follow/use_bruno?style=social&logo=x)](https://twitter.com/use_bruno)
[![वेबसाइट](https://img.shields.io/badge/Website-Visit-blue)](https://www.usebruno.com)
[![डाउनलोड](https://img.shields.io/badge/Download-Latest-brightgreen)](https://www.usebruno.com/downloads)

[English](../../readme.md)
| [Українська](./readme_ua.md)
| [Русский](./readme_ru.md)
| [Türkçe](./readme_tr.md)
| [Deutsch](./readme_de.md)
| [Français](./readme_fr.md)
| [Português (BR)](./readme_pt_br.md)
| [한국어](./readme_kr.md)
| [বাংলা](./readme_bn.md)
| [Español](./readme_es.md)
| [Italiano](./readme_it.md)
| [Română](./readme_ro.md)
| [Polski](./readme_pl.md)
| [简体中文](./readme_cn.md)
| [正體中文](./readme_zhtw.md)
| [العربية](./readme_ar.md)
| [日本語](./readme_ja.md)
| [ქართული](./readme_ka.md)
| **हिन्दी**

ब्रूनो एक नया और अभिनव API क्लाइंट है, जिसका उद्देश्य Postman और अन्य समान उपकरणों द्वारा प्रस्तुत स्थिति को बदलना है।

ब्रूनो आपकी कलेक्शनों को सीधे आपकी फाइल सिस्टम के एक फ़ोल्डर में संग्रहीत करता है। हम API अनुरोधों के बारे में जानकारी सहेजने के लिए एक सामान्य टेक्स्ट मार्कअप भाषा, Bru, का उपयोग करते हैं।

आप अपनी API कलेक्शनों पर सहयोग करने के लिए Git या अपनी पसंद के किसी भी संस्करण नियंत्रण प्रणाली का उपयोग कर सकते हैं।

ब्रूनो केवल ऑफ़लाइन उपयोग के लिए है। ब्रूनो में कभी भी क्लाउड-सिंक जोड़ने की कोई योजना नहीं है। हम आपके डेटा की गोपनीयता को महत्व देते हैं और मानते हैं कि इसे आपके डिवाइस पर ही रहना चाहिए। हमारी दीर्घकालिक दृष्टि [यहाँ](https://github.com/usebruno/bruno/discussions/269) पढ़ें।

📢 हमारे हालिया India FOSS 3.0 सम्मेलन में हमारे वार्तालाप को [यहाँ](https://www.youtube.com/watch?v=7bSMFpbcPiY) देखें।

![bruno](/assets/images/landing-2.png) <br /><br />

### गोल्डन संस्करण ✨

हमारी अधिकांश सुविधाएँ मुफ्त और ओपन-सोर्स हैं।
हम [पारदर्शिता और स्थिरता के सिद्धांतों](https://github.com/usebruno/bruno/discussions/269) के बीच एक सामंजस्यपूर्ण संतुलन प्राप्त करने का प्रयास करते हैं।

[गोल्डन संस्करण](https://www.usebruno.com/pricing) के लिए खरीदारी जल्द ही $9 की कीमत पर उपलब्ध होगी! <br/>
[यहाँ सदस्यता लें](https://usebruno.ck.page/4c65576bd4) ताकि आपको लॉन्च पर सूचनाएं मिलें।

### स्थापना

ब्रूनो Mac, Windows और Linux के लिए हमारे [वेबसाइट](https://www.usebruno.com/downloads) पर एक बाइनरी डाउनलोड के रूप में उपलब्ध है।

आप ब्रूनो को Homebrew, Chocolatey, Scoop, Snap, Flatpak और Apt जैसे पैकेज प्रबंधकों के माध्यम से भी स्थापित कर सकते हैं।

```sh
# Mac पर Homebrew के माध्यम से
brew install --cask bruno

# Windows पर Chocolatey के माध्यम से
choco install bruno

# Windows पर Scoop के माध्यम से
scoop bucket add extras
scoop install bruno

# Linux पर Snap के माध्यम से
snap install bruno

# Linux पर Flatpak के माध्यम से
flatpak install com.usebruno.Bruno

# Linux पर Apt के माध्यम से
sudo mkdir -p /etc/apt/keyrings
sudo apt update && sudo apt install gpg curl
curl -fsSL "https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x9FA6017ECABE0266" \
  | gpg --dearmor \
  | sudo tee /etc/apt/keyrings/bruno.gpg > /dev/null
sudo chmod 644 /etc/apt/keyrings/bruno.gpg
echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/bruno.gpg] http://debian.usebruno.com/ bruno stable" \
  | sudo tee /etc/apt/sources.list.d/bruno.list
sudo apt update && sudo apt install bruno

कई प्लेटफार्मों पर चलाएं 🖥️
<br /><br />

Git के माध्यम से सहयोग करें 👩‍💻🧑‍💻
या अपनी पसंद के किसी भी संस्करण नियंत्रण प्रणाली का उपयोग करें

<br /><br />

महत्वपूर्ण लिंक 📌
हमारी दीर्घकालिक दृष्टि

रोडमैप

प्रलेखन

Stack Overflow

वेबसाइट

मूल्य निर्धारण

डाउनलोड

GitHub प्रायोजक

प्रस्तुतियाँ 🎥
प्रशंसापत्र

ज्ञान केंद्र

Scriptmania

समर्थन ❤️
यदि आप ब्रूनो को पसंद करते हैं और हमारे ओपन-सोर्स कार्य का समर्थन करना चाहते हैं, तो कृपया GitHub प्रायोजक के माध्यम से हमें प्रायोजित करने पर विचार करें।

प्रशंसापत्र साझा करें 📣
यदि ब्रूनो ने आपके और आपकी टीमों के लिए काम में मदद की है, तो कृपया हमारे GitHub चर्चा में अपने प्रशंसापत्र साझा करना न भूलें

नए पैकेज प्रबंधकों में प्रकाशित करना
अधिक जानकारी के लिए कृपया यहाँ देखें।

हमसे संपर्क करें 🌐
𝕏 (ट्विटर) <br />
वेबसाइट <br />
डिस्कॉर्ड <br />
लिंक्डइन

ट्रेडमार्क
नाम

ब्रूनो एक ट्रेडमार्क है जो अनूप एम डी के स्वामित्व में है।

लोगो

लोगो OpenMoji से लिया गया है। लाइसेंस: CC BY-SA 4.0

योगदान 👩‍💻🧑‍💻
हमें खुशी है कि आप ब्रूनो को बेहतर बनाने में रुचि रखते हैं। कृपया योगदान गाइड देखें।

यदि आप सीधे कोड के माध्यम से योगदान नहीं कर सकते, तो भी कृपया बग्स की रिपोर्ट करने और उन सुविधाओं का अनुरोध करने में संकोच न करें जिन्हें आपकी स्थिति को हल करने के लिए लागू किया जाना चाहिए।

लेखक
<div align="center"> <a href="https://github.com/usebruno/bruno/graphs/contributors"> <img src="https://contrib.rocks/image?repo=usebruno/bruno" /> </a> </div>

लाइसेंस 📄
MIT

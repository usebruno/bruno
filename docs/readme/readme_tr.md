<br />
<img src="../../assets/images/logo-transparent.png" width="80"/>

### Bruno - API'leri keşfetmek ve test etmek için açık kaynaklı IDE.

[![GitHub sürümü](https://badge.fury.io/gh/usebruno%2Fbruno.svg)](https://badge.fury.io/gh/usebruno%2Fbruno)
[![CI](https://github.com/usebruno/bruno/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/usebruno/bruno/actions/workflows/tests.yml)
[![Commit Activity](https://img.shields.io/github/commit-activity/m/usebruno/bruno)](https://github.com/usebruno/bruno/pulse)
[![X](https://img.shields.io/twitter/follow/use_bruno?style=social&logo=x)](https://twitter.com/use_bruno)
[![Web Sitesi](https://img.shields.io/badge/Website-Visit-blue)](https://www.usebruno.com)
[![İndir](https://img.shields.io/badge/Download-Latest-brightgreen)](https://www.usebruno.com/downloads)

[English](../../readme.md)
| [Українська](./readme_ua.md)
| [Русский](./readme_ru.md)
| **Türkçe**
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

Bruno, Postman ve benzeri araçlar tarafından temsil edilen statükoda devrim yaratmayı amaçlayan yeni ve yenilikçi bir API istemcisidir.

Bruno koleksiyonlarınızı doğrudan dosya sisteminizdeki bir klasörde saklar. API istekleri hakkındaki bilgileri kaydetmek için düz bir metin biçimlendirme dili olan Bru kullanıyoruz.

API koleksiyonlarınız üzerinde işbirliği yapmak için Git veya seçtiğiniz herhangi bir sürüm kontrolünü kullanabilirsiniz.

Bruno yalnızca çevrimdışıdır. Bruno'ya bulut senkronizasyonu eklemek gibi bir planımız yok. Veri gizliliğinize değer veriyoruz ve cihazınızda kalması gerektiğine inanıyoruz. Uzun vadeli vizyonumuzu okuyun [burada](https://github.com/usebruno/bruno/discussions/269)

📢 Hindistan FOSS 3.0 Konferansındaki son konuşmamızı izleyin [burada](https://www.youtube.com/watch?v=7bSMFpbcPiY)

![bruno](/assets/images/landing-2.png) <br /><br />

### Kurulum

Bruno Mac, Windows ve Linux için ikili indirme olarak [web sitemizde](https://www.usebruno.com/downloads) mevcuttur.

Bruno'yu Homebrew, Chocolatey, Scoop, Snap ve Apt gibi paket yöneticileri aracılığıyla da yükleyebilirsiniz.

```sh
# Homebrew aracılığıyla Mac'te
brew install --cask bruno

# Chocolatey aracılığıyla Windows'ta
choco install bruno

# Scoop aracılığıyla Windows'ta
scoop bucket add extras
scoop install bruno

# Snap aracılığıyla Linux'ta
snap install bruno

# Apt aracılığıyla Linux'ta
sudo mkdir -p /etc/apt/keyrings
sudo apt update && sudo apt install gpg curl
curl -fsSL "https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x9FA6017ECABE0266" \
  | gpg --dearmor \
  | sudo tee /etc/apt/keyrings/bruno.gpg > /dev/null
sudo chmod 644 /etc/apt/keyrings/bruno.gpg
echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/bruno.gpg] http://debian.usebruno.com/ bruno stable" \
  | sudo tee /etc/apt/sources.list.d/bruno.list
sudo apt update && sudo apt install bruno
```

### Birden fazla platformda çalıştırın 🖥️

![bruno](/assets/images/run-anywhere.png) <br /><br />

### Git üzerinden katkıda bulunun 👩‍💻🧑‍💻

Veya seçtiğiniz herhangi bir sürüm kontrol sistemi

![bruno](/assets/images/version-control.png) <br /><br />

### Önemli Bağlantılar 📌

- [Uzun Vadeli Vizyonumuz](https://github.com/usebruno/bruno/discussions/269)
- [Yol Haritası](https://github.com/usebruno/bruno/discussions/384)
- [Dokümantasyon](https://docs.usebruno.com)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/bruno)
- [Web sitesi](https://www.usebruno.com)
- [Fiyatlandırma](https://www.usebruno.com/pricing)
- [İndir](https://www.usebruno.com/downloads)
- [GitHub Sponsorları](https://github.com/sponsors/helloanoop).

### Vitrin 🎥

- [Görüşler](https://github.com/usebruno/bruno/discussions/343)
- [Bilgi Merkezi](https://github.com/usebruno/bruno/discussions/386)
- [Scriptmania](https://github.com/usebruno/bruno/discussions/385)

### Destek ❤️

Bruno'yu seviyorsanız ve açık kaynak çalışmalarımızı desteklemek istiyorsanız, [GitHub Sponsorları](https://github.com/sponsors/helloanoop) aracılığıyla bize sponsor olmayı düşünün.

### Referansları Paylaşın 📣

Bruno işinizde ve ekiplerinizde size yardımcı olduysa, lütfen [github tartışmamızdaki referanslarınızı](https://github.com/usebruno/bruno/discussions/343) paylaşmayı unutmayın.

### Yeni Paket Yöneticilerine Yayınlama

Daha fazla bilgi için lütfen [buraya](../publishing/publishing_tr.md) bakın.

### Katkıda Bulunun 👩‍💻🧑‍💻

Bruno'yu geliştirmek istemenize sevindim. Lütfen [katkıda bulunma kılavuzuna](../contributing/contributing_tr.md) göz atın

Kod yoluyla katkıda bulunamasanız bile, lütfen kullanım durumunuzu çözmek için uygulanması gereken hataları ve özellik isteklerini bildirmekten çekinmeyin.

### Katkıda Bulunanlar

<div align="center">
    <a href="https://github.com/usebruno/bruno/graphs/contributors">
        <img src="https://contrib.rocks/image?repo=usebruno/bruno" />
    </a>
</div>

### İletişimde Kalın 🌐

[𝕏 (Twitter)](https://twitter.com/use_bruno) <br />
[Website](https://www.usebruno.com) <br />
[Discord](https://discord.com/invite/KgcZUncpjq) <br />
[LinkedIn](https://www.linkedin.com/company/usebruno)

### Ticari Marka

**İsim**

`Bruno` [Anoop M D](https://www.helloanoop.com/) tarafından sahip olunan bir ticari markadır.

**Logo**

Logo [OpenMoji](https://openmoji.org/library/emoji-1F436/) adresinden alınmıştır. Lisans: CC [BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

### Lisans 📄

[MIT](../../license.md)

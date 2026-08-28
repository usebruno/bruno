<br />
<img src="../../assets/images/logo-transparent.png" width="80"/>

### Bruno - 探索和測試 API 的開源 IDE 工具

[![GitHub version](https://badge.fury.io/gh/usebruno%2Fbruno.svg)](https://badge.fury.io/gh/usebruno%2Fbruno)
[![CI](https://github.com/usebruno/bruno/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/usebruno/bruno/actions/workflows/tests.yml)
[![Commit Activity](https://img.shields.io/github/commit-activity/m/usebruno/bruno)](https://github.com/usebruno/bruno/pulse)
[![X](https://img.shields.io/twitter/follow/use_bruno?style=social&logo=x)](https://twitter.com/use_bruno)
[![网站](https://img.shields.io/badge/Website-Visit-blue)](https://www.usebruno.com)
[![下载](https://img.shields.io/badge/Download-Latest-brightgreen)](https://www.usebruno.com/downloads)

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
| **正體中文**
| [العربية](./readme_ar.md)
| [日本語](./readme_ja.md)
| [ქართული](./readme_ka.md)

Bruno 是一個全新且有創新性的 API 用戶端，目的在徹底改變以 Postman 和其他類似工具的現況。

Bruno 將您的 API 集合直接儲存在檔案系統上的資料夾中。我們以純文本標記語言- Bru，來儲存和 API 有關的資訊。

您可以使用 Git 或您選擇的任何版本管理軟體，來管理及協作 API 集合。

Bruno 僅能夠離線使用，永遠不會計劃為 Bruno 增加雲端同步的功能。我們重視您的資料隱私，並相信它應該保留在您的裝置上。瞭解我們的長期願景 [連結](https://github.com/usebruno/bruno/discussions/269)

📢 觀看我們最近在 India FOSS 3.0 研討會上的演講 [連結](https://www.youtube.com/watch?v=7bSMFpbcPiY)

![bruno](../../assets/images/landing-2.png) <br /><br />

### 安装

可以在我們的 [網站上下載](https://www.usebruno.com/downloads) 跨平臺（Mac、Windows 和 Linux）的 Bruno 程式檔。

您也可以透過套件管理程式來安裝 Bruno，如：Homebrew、Chocolatey、Scoop、Snap 和 Apt。

```shell
# 在 Mac 上使用 Homebrew 安裝
brew install --cask bruno

# 在 Windows 上使用 Chocolatey 安裝
choco install bruno

# 在 Windows 上使用 Scoop 安裝
scoop bucket add extras
scoop install bruno

# 在 Linux 上使用 Snap 安裝
snap install bruno

# 在 Linux 上使用 Apt 安裝
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

### 跨多個平台運行 🖥️

![bruno](../../assets/images/run-anywhere.png) <br /><br />

### 透過 Git 進行協作 👩‍💻🧑‍💻

您選擇的任何版本管理軟體

![bruno](../../assets/images/version-control.png) <br /><br />

### 重要連結 📌

- [我們的長期願景](https://github.com/usebruno/bruno/discussions/269)
- [藍圖](https://github.com/usebruno/bruno/discussions/384)
- [說明文件](https://docs.usebruno.com)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/bruno)
- [網站](https://www.usebruno.com)
- [定價](https://www.usebruno.com/pricing)
- [下載](https://www.usebruno.com/downloads)
- [GitHub 贊助](https://github.com/sponsors/helloanoop).

### 展示 🎥

- [Testimonials](https://github.com/usebruno/bruno/discussions/343)
- [Knowledge Hub](https://github.com/usebruno/bruno/discussions/386)
- [Scriptmania](https://github.com/usebruno/bruno/discussions/385)

### 贊助支持 ❤️

如果您喜歡 Bruno 和希望支持我們在開源上的工作，請考慮使用 [GitHub Sponsors](https://github.com/sponsors/helloanoop) 來贊助我們。

### 分享感想 📣

如果 Bruno 在工作和您的團隊中為您提供了幫助，請不要忘記在我們的 [GitHub 討論區](https://github.com/usebruno/bruno/discussions/343) 中分享您的感想。

### 發佈到新的套件管理器

更多資訊，請參考這個 [連結](../publishing/publishing_zhtw.md) 。

### 持續關注 🌐

[𝕏 (Twitter)](https://twitter.com/use_bruno) <br />
[Website](https://www.usebruno.com) <br />
[Discord](https://discord.com/invite/KgcZUncpjq) <br />
[LinkedIn](https://www.linkedin.com/company/usebruno)

### 商標

**名稱**

`Bruno` 是 [Anoop M D](https://www.helloanoop.com/) 持有的商標。

**Logo**

Logo 源自於 [OpenMoji](https://openmoji.org/library/emoji-1F436/)。授權: CC [BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

### 提供貢獻 👩‍💻🧑‍💻

我很高興您希望一同改善 Bruno。請參考 [貢獻指南](../contributing/contributing_zhtw.md)。

即使您無法透過程式碼做出貢獻，我們仍然歡迎您提出 Bug 及新的實作需求。

### 作者們

<div align="center">
    <a href="https://github.com/usebruno/bruno/graphs/contributors">
        <img src="https://contrib.rocks/image?repo=usebruno/bruno" />
    </a>
</div>

### 授權許可 📄

[MIT](../../license.md)

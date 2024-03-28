<br />
<img src="assets/images/logo-transparent.png" width="80"/>

### Bruno - Opensource IDE for exploring and testing APIs.

[![GitHub version](https://badge.fury.io/gh/usebruno%2Fbruno.svg)](https://badge.fury.io/gh/usebruno%bruno)
[![CI](https://github.com/usebruno/bruno/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/usebruno/bruno/workflows/unit-tests.yml)
[![Commit Activity](https://img.shields.io/github/commit-activity/m/usebruno/bruno)](https://github.com/usebruno/bruno/pulse)
[![X](https://img.shields.io/twitter/follow/use_bruno?style=social&logo=x)](https://twitter.com/use_bruno)
[![Website](https://img.shields.io/badge/Website-Visit-blue)](https://www.usebruno.com)
[![Download](https://img.shields.io/badge/Download-Latest-brightgreen)](https://www.usebruno.com/downloads)

**English** | [Українська](docs/readme/readme_ua.md) | [Русский](docs/readme/readme_ru.md) | [Türkçe](docs/readme/readme_tr.md) | [Deutsch](docs/readme/readme_de.md) | [Français](docs/readme/readme_fr.md) | [Português (BR)](docs/readme/readme_pt_br.md) | [한국어](docs/readme/readme_kr.md) | [বাংলা](docs/readme/readme_bn.md) | [Español](docs/readme/readme_es.md) | [Italiano](docs/readme/readme_it.md) | [Română](docs/readme/readme_ro.md) | [Polski](docs/readme/readme_pl.md) | [简体中文](docs/readme/readme_cn.md) | [正體中文](docs/readme/readme_zhtw.md)

Bruno is a new and innovative API client, aimed at revolutionizing the status quo represented by Postman and similar tools out there.

Bruno stores your collections directly in a folder on your filesystem. We use a plain text markup language, Bru, to save information about API requests.

You can use Git or any version control of your choice to collaborate over your API collections.

Bruno is offline-only. There are no plans to add cloud-sync to Bruno, ever. We value your data privacy and believe it should stay on your device. Read our long-term vision [here](https://github.com/usebruno/bruno/discussions/269)

[Download Bruno](https://www.usebruno.com/downloads)

📢 Watch our recent talk at India FOSS 3.0 Conference [here](https://www.youtube.com/watch?v=7bSMFpbcPiY)

![bruno](assets/images/landing-2.png) <br /><br />

### Golden Edition ✨

Majority of our features are free and open source.
We strive to strike a harmonious balance between [open-source principles and sustainability](https://github.com/usebruno/bruno/discussions/269)

You can buy the [Golden Edition](https://www.usebruno.com/pricing) for a one-time payment of **$19** ! <br/>

### Installation

Bruno is available as binary download [on our website](https://www.usebruno.com/downloads) for Mac, Windows and Linux.

You can also install Bruno via package managers like Homebrew, Chocolatey, Scoop, Snap, Flatpak and Apt.

```sh
# On Mac via Homebrew
brew install bruno

# On Windows via Chocolatey
choco install bruno

# On Windows via Scoop
scoop bucket add extras
scoop install bruno

# On Windows via winget
winget install Bruno.Bruno

# On Linux via Snap
snap install bruno

# On Linux via Flatpak
flatpak install com.usebruno.Bruno

# On Linux via Apt
sudo mkdir -p /etc/apt/keyrings
sudo apt-get update && sudo apt-get install gpg
sudo gpg --list-keys
sudo gpg --no-default-keyring --keyring /etc/apt/keyrings/bruno.gpg --keyserver keyserver.ubuntu.com --recv-keys 9FA6017ECABE0266
echo "deb [signed-by=/etc/apt/keyrings/bruno.gpg] http://debian.usebruno.com/ bruno stable" | sudo tee /etc/apt/sources.list.d/bruno.list
sudo apt-get update && sudo apt-get install bruno
```

### Run across multiple platforms 🖥️

![bruno](assets/images/run-anywhere.png) <br /><br />

### Collaborate via Git 👩‍💻🧑‍💻

Or any version control system of your choice

![bruno](assets/images/version-control.png) <br /><br />

### Sponsors

#### Gold Sponsors

<img src="assets/images/sponsors/samagata.png" width="150"/>

#### Silver Sponsors

<img src="assets/images/sponsors/commit-company.png" width="70"/>

#### Bronze Sponsors

<a href="https://zuplo.link/bruno">
    <img src="assets/images/sponsors/zuplo.png" width="120"/>
</a>

### Important Links 📌

- [Our Long Term Vision](https://github.com/usebruno/bruno/discussions/269)
- [Roadmap](https://github.com/usebruno/bruno/discussions/384)
- [Documentation](https://docs.usebruno.com)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/bruno)
- [Website](https://www.usebruno.com)
- [Pricing](https://www.usebruno.com/pricing)
- [Download](https://www.usebruno.com/downloads)
- [Github Sponsors](https://github.com/sponsors/helloanoop).

### Showcase 🎥

- [Testimonials](https://github.com/usebruno/bruno/discussions/343)
- [Knowledge Hub](https://github.com/usebruno/bruno/discussions/386)
- [Scriptmania](https://github.com/usebruno/bruno/discussions/385)

### Support ❤️

If you like Bruno and want to support our opensource work, consider sponsoring us via [Github Sponsors](https://github.com/sponsors/helloanoop).

### Share Testimonials 📣

If Bruno has helped you at work and your teams, please don't forget to share your [testimonials on our GitHub discussion](https://github.com/usebruno/bruno/discussions/343)

### Publishing to New Package Managers

Please see [here](publishing.md) for more information.

### Stay in touch 🌐

[𝕏 (Twitter)](https://twitter.com/use_bruno) <br />
[Website](https://www.usebruno.com) <br />
[Discord](https://discord.com/invite/KgcZUncpjq) <br />
[LinkedIn](https://www.linkedin.com/company/usebruno)

### Trademark

**Name**

`Bruno` is a trademark held by [Anoop M D](https://www.helloanoop.com/)

**Logo**

The logo is sourced from [OpenMoji](https://openmoji.org/library/emoji-1F436/). License: CC [BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

### Contribute 👩‍💻🧑‍💻

I am happy that you are looking to improve bruno. Please check out the [contributing guide](contributing.md)

Even if you are not able to make contributions via code, please don't hesitate to file bugs and feature requests that needs to be implemented to solve your use case.

### Authors

<div align="center">
    <a href="https://github.com/usebruno/bruno/graphs/contributors">
        <img src="https://contrib.rocks/image?repo=usebruno/bruno" />
    </a>
</div>

### License 📄

[MIT](license.md)

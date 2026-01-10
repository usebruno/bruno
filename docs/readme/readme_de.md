<br />
<img src="/assets/images/logo-transparent.png" width="80"/>

### Bruno - Opensource IDE zum Erkunden und Testen von APIs.

[![GitHub version](https://badge.fury.io/gh/usebruno%2Fbruno.svg)](https://badge.fury.io/gh/usebruno%2Fbruno)
[![CI](https://github.com/usebruno/bruno/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/usebruno/bruno/actions/workflows/tests.yml)
[![Commit Activity](https://img.shields.io/github/commit-activity/m/usebruno/bruno)](https://github.com/usebruno/bruno/pulse)
[![X](https://img.shields.io/twitter/follow/use_bruno?style=social&logo=x)](https://twitter.com/use_bruno)
[![Website](https://img.shields.io/badge/Website-Visit-blue)](https://www.usebruno.com)
[![Download](https://img.shields.io/badge/Download-Latest-brightgreen)](https://www.usebruno.com/downloads)

[English](../../readme.md)
| [Українська](./readme_ua.md)
| [Русский](./readme_ru.md)
| [Türkçe](./readme_tr.md)
| **Deutsch**
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

Bruno ist ein neuer und innovativer API-Client, der den Status Quo von Postman und ähnlichen Tools revolutionieren soll.

Bruno speichert deine Sammlungen direkt in einem Ordner in deinem Dateisystem. Wir verwenden eine einfache Textauszeichnungssprache - Bru - um Informationen über API-Anfragen zu speichern.

Du kannst Git oder eine andere Versionskontrolle deiner Wahl verwenden, um gemeinsam mit anderen an deinen API-Sammlungen zu arbeiten.

Bruno ist ein reines Offline-Tool. Es gibt keine Pläne, Bruno um eine Cloud-Synchronisation zu erweitern. Wir schätzen den Schutz deiner Daten und glauben, dass sie auf deinem Gerät bleiben sollten. Lies unsere Langzeit-Vision [hier](https://github.com/usebruno/bruno/discussions/269).

[Download Bruno](https://www.usebruno.com/downloads)

📢 Sieh Dir unseren Vortrag auf der India FOSS 3.0 Conference [hier](https://www.youtube.com/watch?v=7bSMFpbcPiY) an.

![bruno](/assets/images/landing-2.png) <br /><br />

### Installation

Bruno ist als Download [auf unserer Website](https://www.usebruno.com/downloads) für Mac, Windows und Linux verfügbar.

Du kannst Bruno auch über Paketmanager wie Homebrew, Chocolatey, Scoop, Snap, Flatpak und Apt installieren.

```sh
# Auf Mac via Homebrew
brew install bruno

# Auf Windows via Chocolatey
choco install bruno

# Auf Windows via Scoop
scoop bucket add extras
scoop install bruno

# Auf Windows via winget
winget install Bruno.Bruno

# Auf Linux via Snap
snap install bruno

# Auf Linux via Flatpak
flatpak install com.usebruno.Bruno

# Auf Linux via Apt
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

### Einsatz auf verschiedensten Plattformen 🖥️

![bruno](/assets/images/run-anywhere.png) <br /><br />

### Zusammenarbeit mit Git 👩‍💻🧑‍💻

Oder einer Versionskontrolle deiner Wahl

![bruno](/assets/images/version-control.png) <br /><br />

### Sponsoren

#### Gold Sponsoren

<img src="/assets/images/sponsors/samagata.png" width="150"/>

#### Silber Sponsoren

<img src="/assets/images/sponsors/commit-company.png" width="70"/>

### Wichtige Links 📌

- [Unsere Langzeit-Vision](https://github.com/usebruno/bruno/discussions/269)
- [Roadmap](https://github.com/usebruno/bruno/discussions/384)
- [Dokumentation](https://docs.usebruno.com)
- [Webseite](https://www.usebruno.com)
- [Preise](https://www.usebruno.com/pricing)
- [Download](https://www.usebruno.com/downloads)

### Showcase 🎥

- [Erfahrungsberichte](https://github.com/usebruno/bruno/discussions/343)
- [Wissenswertes](https://github.com/usebruno/bruno/discussions/386)
- [Scriptmania](https://github.com/usebruno/bruno/discussions/385)

### Unterstützung ❤️

Wuff! Wenn du dieses Projekt magst, klick auf den ⭐ Button !!

### Teile Erfahrungsberichte 📣

Wenn Bruno dir und in deinem Team bei der Arbeit geholfen hat, vergiss bitte nicht, deine [Erfahrungsberichte in unserer GitHub-Diskussion](https://github.com/usebruno/bruno/discussions/343) zu teilen.

### Bereitstellung in neuen Paket-Managern

Mehr Informationen findest du [hier](../publishing/publishing_de.md).

### Mitmachen 👩‍💻🧑‍💻

Ich freue mich, dass du Bruno verbessern willst. Bitte schau dir den [Leitfaden zum Mitmachen](../contributing/contributing_de.md) an.

Auch wenn du nicht in der Lage bist, einen Beitrag in Form von Code zu leisten, zögere bitte nicht, uns Fehler und Funktionswünsche mitzuteilen, die implementiert werden müssen, um deinen Anwendungsfall zu unterstützen.

### Autoren

<div align="center">
    <a href="https://github.com/usebruno/bruno/graphs/contributors">
        <img src="https://contrib.rocks/image?repo=usebruno/bruno" />
    </a>
</div>

### In Verbindung bleiben 🌐

[Twitter](https://twitter.com/use_bruno) <br />
[Webseite](https://www.usebruno.com) <br />
[Discord](https://discord.com/invite/KgcZUncpjq) <br />
[LinkedIn](https://www.linkedin.com/company/usebruno)

### Markenzeichen

**Name**

`Bruno` ist ein Markenzeichen von [Anoop M D](https://www.helloanoop.com/)

**Logo**

Das Logo stammt von [OpenMoji](https://openmoji.org/library/emoji-1F436/). Lizenz: CC [BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

### Lizenz 📄

[MIT](../../license.md)

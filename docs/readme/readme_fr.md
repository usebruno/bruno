<br />
<img src="../../assets/images/logo-transparent.png" width="80"/>

### Bruno - IDE Opensource pour explorer et tester des APIs.

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
| [Deutsch](./readme_de.md)
| **Français**
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

Bruno est un nouveau client API, innovant, qui a pour but de révolutionner le _statu quo_ que représentent Postman et les autres outils.

Bruno sauvegarde vos collections directement sur votre système de fichiers. Nous utilisons un langage de balise de type texte pour décrire les requêtes API.

Vous pouvez utiliser git ou tout autre gestionnaire de version pour travailler de manière collaborative sur vos collections d'APIs.

Bruno ne fonctionne qu'en mode déconnecté. Il n'y a pas d'abonnement ou de synchronisation avec le cloud Bruno, il n'y en aura jamais. Nous sommes conscients de la confidentialité de vos données et nous sommes convaincus qu'elles doivent rester sur vos appareils. Vous pouvez lire notre vision à long terme [ici (en anglais)](https://github.com/usebruno/bruno/discussions/269).

📢 Regardez notre présentation récente lors de la conférence India FOSS 3.0 (en anglais) [ici](https://www.youtube.com/watch?v=7bSMFpbcPiY)

![bruno](/assets/images/landing-2.png) <br /><br />

### Installation

Bruno est disponible au téléchargement [sur notre site web](https://www.usebruno.com/downloads), pour Mac, Windows et Linux.

Vous pouvez aussi installer Bruno via un gestionnaire de paquets, comme Homebrew, Chocolatey, Scoop, Snap et Apt.

```sh
# Mac via Homebrew
brew install bruno

# Windows via Chocolatey
choco install bruno

# Windows via Scoop
scoop bucket add extras
scoop install bruno

# Linux via Snap
snap install bruno

# Linux via Apt
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

### Fonctionne sur de multiples plateformes 🖥️

![bruno](/assets/images/run-anywhere.png) <br /><br />

### Collaborer via Git 👩‍💻🧑‍💻

Ou n'importe quel système de gestion de sources

![bruno](/assets/images/version-control.png) <br /><br />

### Liens importants 📌

- [Notre vision à long terme (en anglais)](https://github.com/usebruno/bruno/discussions/269)
- [Roadmap](https://github.com/usebruno/bruno/discussions/384)
- [Documentation](https://docs.usebruno.com)
- [Site web](https://www.usebruno.com)
- [Prix](https://www.usebruno.com/pricing)
- [Téléchargement](https://www.usebruno.com/downloads)
- [Sponsors GitHub](https://github.com/sponsors/helloanoop)

### Showcase 🎥

- [Témoignages](https://github.com/usebruno/bruno/discussions/343)
- [Centre de connaissance](https://github.com/usebruno/bruno/discussions/386)
- [Scriptmania](https://github.com/usebruno/bruno/discussions/385)

### Soutien ❤️

Si vous aimez Bruno et que vous souhaitez soutenir le travail _opensource_, pensez à devenir un sponsor via la page [Github Sponsors](https://github.com/sponsors/helloanoop).

### Partage de témoignages 📣

Si Bruno vous a aidé dans votre travail, au sein de votre équipe, merci de penser à partager votre témoignage sur la [page discussion GitHub dédiée](https://github.com/usebruno/bruno/discussions/343)

### Publier Bruno sur un nouveau gestionnaire de paquets

Veuillez regarder [ici](../publishing/publishing_fr.md) pour plus d'information.

### Contribuer 👩‍💻🧑‍💻

Je suis heureux de voir que vous cherchez à améliorer Bruno. Merci de consulter le [guide de contribution](../contributing/contributing_fr.md)

Même si vous n'êtes pas en mesure de contribuer directement via du code, n'hésitez pas à consigner les bogues et les demandes de nouvelles fonctionnalités pour résoudre vos cas d'usage !

### Auteurs

<div align="center">
    <a href="https://github.com/usebruno/bruno/graphs/contributors">
        <img src="https://contrib.rocks/image?repo=usebruno/bruno" />
    </a>
</div>

### Restons en contact 🌐

[Twitter](https://twitter.com/use_bruno) <br />
[Website](https://www.usebruno.com) <br />
[Discord](https://discord.com/invite/KgcZUncpjq) <br />
[LinkedIn](https://www.linkedin.com/company/usebruno)

### Marque

**Nom**

`Bruno` est une marque appartenant à [Anoop M D](https://www.helloanoop.com/)

**Logo**

Le logo est issu de [OpenMoji](https://openmoji.org/library/emoji-1F436/).
Licence : CC [BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

### Licence 📄

[MIT](../../license.md)

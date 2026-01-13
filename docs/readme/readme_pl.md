<br />
<img src="../../assets/images/logo-transparent.png" width="80"/>

### Bruno - Otwartoźródłowe IDE do eksploracji i testów APIs.

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
| [Français](./readme_fr.md)
| [Português (BR)](./readme_pt_br.md)
| [한국어](./readme_kr.md)
| [বাংলা](./readme_bn.md)
| [Español](./readme_es.md)
| [Italiano](./readme_it.md)
| [Română](./readme_ro.md)
| **Polski**
| [简体中文](./readme_cn.md)
| [正體中文](./readme_zhtw.md)
| [العربية](./readme_ar.md)
| [日本語](./readme_ja.md)
| [ქართული](./readme_ka.md)

Bruno to nowy i innowacyjny klient API, którego celem jest zrewolucjonizowanie status quo reprezentowanego przez narzędzia takie jak Postman.

Bruno przechowuje twoje kolekcje bezpośrednio w folderze na twoim systemie plików. Używamy prostego języka znaczników, Bru, do zapisywania informacji o żądaniach API.

Możesz użyć Git lub dowolnego systemu kontroli wersji do współpracy nad swoimi kolekcjami API.

Bruno działa tylko w trybie offline. Nie planujemy nigdy dodawać synchronizacji w chmurze do Bruno. Cenimy prywatność Twoich danych i wierzymy, że powinny one pozostać na Twoim urządzeniu. Przeczytaj naszą długoterminową wizję [tutaj](https://github.com/usebruno/bruno/discussions/269)

📢 Obejrzyj naszą ostatnią rozmowę na konferencji India FOSS 3.0 [tutaj](https://www.youtube.com/watch?v=7bSMFpbcPiY)

![bruno](/assets/images/landing-2.png) <br /><br />

### Instalacja

Bruno jest dostępny jako plik binarny do pobrania [na naszej stronie internetowej](https://www.usebruno.com/downloads) dla Mac, Windows i Linux.

Możesz również zainstalować Bruno za pomocą menedżerów pakietów, takich jak Homebrew, Chocolatey, Scoop, Snap i Apt.

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
sudo apt update && sudo apt install gpg curl
curl -fsSL "https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x9FA6017ECABE0266" \
  | gpg --dearmor \
  | sudo tee /etc/apt/keyrings/bruno.gpg > /dev/null
sudo chmod 644 /etc/apt/keyrings/bruno.gpg
echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/bruno.gpg] http://debian.usebruno.com/ bruno stable" \
  | sudo tee /etc/apt/sources.list.d/bruno.list
sudo apt update && sudo apt install bruno
```

### Uruchom na wielu platformach 🖥️

![bruno](/assets/images/run-anywhere.png) <br /><br />

### Współpracuj przez Git 👩‍💻🧑‍💻

Lub dowolny inny system kontroli wersji, który wybierzesz

![bruno](/assets/images/version-control.png) <br /><br />

### Ważne Linki 📌

- [Nasza Długoterminowa Wizja](https://github.com/usebruno/bruno/discussions/269)
- [Mapa Drogi](https://github.com/usebruno/bruno/discussions/384)
- [Dokumentacja](https://docs.usebruno.com)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/bruno)
- [Strona Internetowa](https://www.usebruno.com)
- [Cennik](https://www.usebruno.com/pricing)
- [Pobieranie](https://www.usebruno.com/downloads)
- [Sponsorzy GitHub](https://github.com/sponsors/helloanoop).

### Zobacz 🎥

- [Opinie](https://github.com/usebruno/bruno/discussions/343)
- [Centrum Wiedzy](https://github.com/usebruno/bruno/discussions/386)
- [Scriptmania](https://github.com/usebruno/bruno/discussions/385)

### Wsparcie ❤️

Jeśli podoba Ci się Bruno i chcesz wspierać naszą pracę opensource, rozważ sponsorowanie nas przez [Sponsorzy GitHub](https://github.com/sponsors/helloanoop).

### Udostępnij Opinie 📣

Jeśli Bruno pomógł w pracy Tobie i Twoim zespołom, nie zapomnij podzielić się swoimi [opiniami na naszej dyskusji GitHub](https://github.com/usebruno/bruno/discussions/343)

### Publikowanie w Nowych Menedżerach Pakietów

Więcej informacji znajdziesz [tutaj](../publishing/publishing_pl.md).

### Współpraca 👩‍💻🧑‍💻

Cieszymy się, że chcesz udoskonalić bruno. Proszę sprawdź [przewodnik współpracy](../contributing/contributing_pl.md)

Nawet jeśli nie jesteś w stanie przyczynić się poprzez kod, nie wahaj się zgłaszać błędów i wniosków o funkcje, które muszą zostać zaimplementowane, aby rozwiązać Twój przypadek użycia.

### Autorzy

<div align="center">
    <a href="https://github.com/usebruno/bruno/graphs/contributors">
        <img src="https://contrib.rocks/image?repo=usebruno/bruno" />
    </a>
</div>

### Pozostań w kontakcie 🌐

[𝕏 (Twitter)](https://twitter.com/use_bruno) <br />
[Strona Internetowa](https://www.usebruno.com) <br />
[Discord](https://discord.com/invite/KgcZUncpjq) <br />
[LinkedIn](https://www.linkedin.com/company/usebruno)

### Znak Towarowy

**Nazwa**

`Bruno` jest znakiem towarowym należącym do [Anoop M D](https://www.helloanoop.com/)

**Logo**

Logo pochodzi z [OpenMoji](https://openmoji.org/library/emoji-1F436/). Licencja: CC [BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

### Licencja 📄

[MIT](../../license.md)

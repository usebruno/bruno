<br />
<img src="../../assets/images/logo-transparent.png" width="80"/>

### Bruno - API 탐색 및 테스트를 위한 오픈소스 IDE.

[![GitHub version](https://badge.fury.io/gh/usebruno%2Fbruno.svg)](https://badge.fury.io/gh/usebruno%bruno)
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
| **한국어**
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
| [Nederlands](./readme_nl.md)

Bruno는 새롭고 혁신적인 API 클라이언트로, Postman과 유사한 툴들을 혁신하는 것을 목표로 합니다.

Bruno는 사용자의 컬렉션을 파일 시스템의 폴더에 직접 저장합니다. 일반 텍스트 마크업 언어인 Bru를 사용해 API 요청에 대한 정보를 저장합니다.

Git 또는 원하는 버전 관리 도구를 사용하여 API 컬렉션을 연동할 수 있습니다.

브루노는 오프라인 전용입니다. 브루노에 클라우드 동기화 기능을 추가할 계획은 없습니다. 저희는 사용자의 데이터 프라이버시를 소중히 여기며, 데이터는 사용자의 기기에 남아 있어야 한다고 믿습니다. 장기 비전 읽기 [링크](https://github.com/usebruno/bruno/discussions/269)

[브루노 다운로드](https://www.usebruno.com/downloads)

📢 Watch our recent talk at India FOSS 3.0 Conference [here](https://www.youtube.com/watch?v=7bSMFpbcPiY)

![bruno](/assets/images/landing-2.png) <br /><br />

## Commercial Versions ✨

대부분의 기능은 무료이며 오픈소스로 제공됩니다.
저희는 [오픈소스 원칙과 지속가능성](https://github.com/usebruno/bruno/discussions/269) 사이의 조화로운 균형을 추구합니다.

추가 기능이 필요하시면 [유료 버전](https://www.usebruno.com/pricing)을 확인해보시면 유용한 기능이 있을 수 있습니다! <br/>

## Table of Contents
- [설치](#설치)
- [기능](#기능)
  - [여러 플랫폼에서 실행하세요 🖥️](#여러-플랫폼에서-실행하세요-)
  - [Git과 연동하세요 👩‍💻🧑‍💻](#Git과-연동하세요-)
- [중요 링크 📌](#중요-링크-)
- [쇼케이스 🎥](#쇼케이스-)
- [후기 공유 📣](#후기-공유-)
- [새 패키지 관리자에게 게시](#새-패키지-관리자에게-게시)
- [Stay in touch 🌐](#stay-in-touch-)
- [Trademark](#trademark)
- [컨트리뷰트 👩‍💻🧑‍💻](#컨트리뷰트-)
- [Authors](#authors)
- [License 📄](#license-)

## 설치

Bruno 는 여기에서 다운로드 받을 수 있습니다.[링크](https://www.usebruno.com/downloads) (맥, 윈도우, 리눅스)

Homebrew, Chocolatey, Snap, Apt 같은 패키지 관리자를 통해서도 Bruno를 설치할 수 있습니다.

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
sudo gpg --no-default-keyring --keyring /etc/apt/keyrings/bruno.gpg --keyserver keyserver.ubuntu.com --recv-keys 9FA6017ECABE0266

echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/bruno.gpg] http://debian.usebruno.com/ bruno stable" | sudo tee /etc/apt/sources.list.d/bruno.list

sudo apt update
sudo apt install bruno
```

## 기능

### 여러 플랫폼에서 실행하세요 🖥️

![bruno](/assets/images/run-anywhere.png) <br /><br />

### Git과 연동하세요 👩‍💻🧑‍💻

또는 원하는 버전 관리 시스템을 선택하세요.

![bruno](/assets/images/version-control.png) <br /><br />

## 중요 링크 📌

- [우리의 장기적 비전](https://github.com/usebruno/bruno/discussions/269)
- [로드맵](https://github.com/usebruno/bruno/discussions/384)
- [문서](https://docs.usebruno.com)
- [웹사이트](https://www.usebruno.com)
- [가격](https://www.usebruno.com/pricing)
- [다운로드](https://www.usebruno.com/downloads)

## 쇼케이스 🎥

- [Testimonials](https://github.com/usebruno/bruno/discussions/343)
- [Knowledge Hub](https://github.com/usebruno/bruno/discussions/386)
- [Scriptmania](https://github.com/usebruno/bruno/discussions/385)

## 후기 공유 📣

Bruno가 여러분과 여러분의 팀에 도움이 되었다면, 잊지 말고 공유해 주세요. [GitHub discussion 공유 링크](https://github.com/usebruno/bruno/discussions/343)

## 새 패키지 관리자에게 게시

더 많은 정보를 확인하시려면 링크를 클릭해 주세요. [배포 가이드](../../publishing.md)

## Stay in touch 🌐

[𝕏 (Twitter)](https://twitter.com/use_bruno) <br />
[Website](https://www.usebruno.com) <br />
[Discord](https://discord.com/invite/KgcZUncpjq) <br />
[LinkedIn](https://www.linkedin.com/company/usebruno)

## Trademark

**이름**

`Bruno`는 [Anoop M D](https://www.helloanoop.com/)가 소유한 상표입니다

**로고**

이 로고는 [OpenMoji](https://openmoji.org/library/emoji-1F436/)에서 가져온 것입니다. 라이선스: CC [BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

### 컨트리뷰트 👩‍💻🧑‍💻

컨트리뷰트에 관심이 있으시면 링크를 참고해 주세요. [컨트리뷰트 가이드](../contributing/contributing_kr.md)

코드를 통해 기여할 수 없더라도 사용 사례를 해결하기 위해 구현이 필요한 버그나 기능 요청을 주저하지 마시고 제출해 주세요.

### Authors

<div align="center">
    <a href="https://github.com/usebruno/bruno/graphs/contributors">
        <img src="https://contrib.rocks/image?repo=usebruno/bruno" />
    </a>
</div>

### License 📄

[MIT](../../license.md)

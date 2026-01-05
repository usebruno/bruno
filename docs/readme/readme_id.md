<br />
<img src="assets/images/logo-transparent.png" width="80"/>

### Bruno - Opensource IDE untuk menjelajah dan menguji API.

[![GitHub version](https://badge.fury.io/gh/usebruno%2Fbruno.svg)](https://badge.fury.io/gh/usebruno%bruno)
[![CI](https://github.com/usebruno/bruno/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/usebruno/bruno/actions/workflows/tests.yml)
[![Commit Activity](https://img.shields.io/github/commit-activity/m/usebruno/bruno)](https://github.com/usebruno/bruno/pulse)
[![X](https://img.shields.io/twitter/follow/use_bruno?style=social&logo=x)](https://twitter.com/use_bruno)
[![Website](https://img.shields.io/badge/Website-Visit-blue)](https://www.usebruno.com)
[![Unduh](https://img.shields.io/badge/Download-Latest-brightgreen)](https://www.usebruno.com/downloads)

[English](../../readme.md)
| [Українська](docs/readme/readme_ua.md)
| [Русский](docs/readme/readme_ru.md)
| [Türkçe](docs/readme/readme_tr.md)
| [Deutsch](docs/readme/readme_de.md)
| [Français](docs/readme/readme_fr.md)
| [Português (BR)](docs/readme/readme_pt_br.md)
| [한국어](docs/readme/readme_kr.md)
| [বাংলা](docs/readme/readme_bn.md)
| [Español](docs/readme/readme_es.md)
| [Bahasa Indonesia](docs/readme/readme_id.md)
| [Italiano](docs/readme/readme_it.md)
| [Română](docs/readme/readme_ro.md)
| [Polski](docs/readme/readme_pl.md)
| [简体中文](docs/readme/readme_cn.md)
| [正體中文](docs/readme/readme_zhtw.md)
| [العربية](docs/readme/readme_ar.md)
| [日本語](docs/readme/readme_ja.md)
| [ქართული](docs/readme/readme_ka.md)
| [Nederlands](docs/readme/readme_nl.md)
| [فارسی](docs/readme/readme_fa.md)

Bruno adalah klien API yang baru dan inovatif, yang bertujuan untuk merevolusi status quo yang diwakili oleh Postman dan alat serupa lainnya.

Bruno menyimpan koleksi Anda secara langsung dalam folder di sistem file Anda. Kami menggunakan bahasa markup teks sederhana, Bru, untuk menyimpan informasi tentang permintaan API.

Anda dapat menggunakan Git atau sistem kontrol versi pilihan Anda untuk berkolaborasi atas koleksi API Anda.

Bruno hanya berfungsi offline. Tidak ada rencana untuk menambahkan sinkronisasi cloud ke Bruno, selamanya. Kami menghargai privasi data Anda dan percaya bahwa data harus tetap berada di perangkat Anda. Baca visi jangka panjang kami [di sini](https://github.com/usebruno/bruno/discussions/269)

[Download Bruno](https://www.usebruno.com/downloads)

📢 Tonton presentasi kami baru-baru ini di Konferensi India FOSS 3.0 [di sini](https://www.youtube.com/watch?v=7bSMFpbcPiY)

![bruno](assets/images/landing-2.png) <br /><br />

## Versi Komersial ✨

Sebagian besar fitur kami gratis dan open source.
Kami berusaha untuk mencapai keseimbangan harmonis antara [prinsip open-source dan keberlanjutan](https://github.com/usebruno/bruno/discussions/269)

Anda dapat menjelajahi [versi berbayar](https://www.usebruno.com/pricing) kami untuk melihat apakah ada fitur tambahan yang mungkin berguna bagi Anda atau tim Anda! <br/>

## Daftar Isi

- [Instalasi](#Instalasi)
- [Fitur](#fitur)
  - [Berjalan di berbagai platform 🖥️](#run-across-multiple-platforms-%EF%B8%8F)
  - [Berkolaborasi via Git 👩‍💻🧑‍💻](#collaborate-via-git-%E2%80%8D%E2%80%8D)
- [Link Penting 📌](#important-links-)
- [Showcase 🎥](#showcase-)
- [Bagikan Testimoni 📣](#bagikan-testimoni-)
- [Mempublikasikan ke Package Manager Baru](#mempublikasikan-ke-package-manager-baru)
- [Tetap Terhubung 🌐](#stay-in-touch-)
- [Merek Dagang](#merek-dagang)
- [Kontribusi 👩‍💻🧑‍💻](#kontribusi-%E2%80%8D%E2%80%8D)
- [Penulis](#penulis)
- [Lisensi 📄](#lisensi)

## Instalasi

Bruno tersedia sebagai unduhan biner [di situs web kami](https://www.usebruno.com/downloads) untuk Mac, Windows dan Linux.

Anda juga dapat menginstal Bruno melalui package manager seperti Homebrew, Chocolatey, Scoop, Snap, Flatpak dan Apt.

```sh
# Di Mac via Homebrew
brew install bruno

# Di Windows via Chocolatey
choco install bruno

# Di Windows via Scoop
scoop bucket add extras
scoop install bruno

# Di Windows via winget
winget install Bruno.Bruno

# Di Linux via Snap
snap install bruno

# Di Linux via Flatpak
flatpak install com.usebruno.Bruno

# Di Arch Linux via AUR
yay -S bruno

# Di Linux via Apt
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

## Fitur

### Berjalan di berbagai platform 🖥️

![bruno](assets/images/run-anywhere.png) <br /><br />

### Berkolaborasi via Git 👩‍💻🧑‍💻

Atau sistem kontrol versi pilihan Anda

![bruno](assets/images/version-control.png) <br /><br />

## Important Links 📌

- [Visi Jangka Panjang Kami](https://github.com/usebruno/bruno/discussions/269)
- [Roadmap](https://www.usebruno.com/roadmap)
- [Dokumentasi](https://docs.usebruno.com)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/bruno)
- [Website](https://www.usebruno.com)
- [Harga](https://www.usebruno.com/pricing)
- [Unduh](https://www.usebruno.com/downloads)

## Showcase 🎥

- [Testimoni](https://github.com/usebruno/bruno/discussions/343)
- [Knowledge Hub](https://github.com/usebruno/bruno/discussions/386)
- [Scriptmania](https://github.com/usebruno/bruno/discussions/385)

## Bagikan Testimoni 📣

Jika Bruno telah membantu Anda di tempat kerja dan tim Anda, jangan lupa untuk membagikan [testimoni Anda di diskusi GitHub kami](https://github.com/usebruno/bruno/discussions/343)

## Publikasi ke Package Manager Baru

Silakan lihat [di sini](../publishing/publishing_id.md) untuk informasi lebih lanjut.

## Tetap Terhubung 🌐

[𝕏 (Twitter)](https://twitter.com/use_bruno) <br />
[Website](https://www.usebruno.com) <br />
[Discord](https://discord.com/invite/KgcZUncpjq) <br />
[LinkedIn](https://www.linkedin.com/company/usebruno)

## Merek Dagang

**Nama**

`Bruno`  adalah merek dagang yang dimiliki oleh [Anoop M D](https://www.helloanoop.com/)

**Logo**

Logo bersumber dari [OpenMoji](https://openmoji.org/library/emoji-1F436/). Lisensi: CC [BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

## Kontribusi 👩‍💻🧑‍💻

Saya senang Anda ingin meningkatkan Bruno. Silakan periksa [panduan kontribusi](../contributing/contributing_id.md)

Bahkan jika Anda tidak dapat memberikan kontribusi melalui kode, jangan ragu untuk melaporkan bug dan permintaan fitur yang perlu diimplementasikan untuk menyelesaikan kasus penggunaan Anda.

## Penulis

<div align="center">
    <a href="https://github.com/usebruno/bruno/graphs/contributors">
        <img src="https://contrib.rocks/image?repo=usebruno/bruno" />
    </a>
</div>

## Lisensi 📄

[MIT](../../license.md)

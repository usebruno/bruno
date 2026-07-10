<br />
<img src="../../assets/images/logo-transparent.png" width="80"/>

### Bruno - IDE sumber terbuka untuk menjelajahi dan menguji API.

[![GitHub version](https://badge.fury.io/gh/usebruno%2Fbruno.svg)](https://badge.fury.io/gh/usebruno%2Fbruno)
[![CI](https://github.com/usebruno/bruno/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/usebruno/bruno/actions/workflows/tests.yml)
[![Commit Activity](https://img.shields.io/github/commit-activity/m/usebruno/bruno)](https://github.com/usebruno/bruno/pulse)
[![X](https://img.shields.io/twitter/follow/use_bruno?style=social&logo=x)](https://twitter.com/use_bruno)
[![Website](https://img.shields.io/badge/Website-Visit-blue)](https://www.usebruno.com)
[![Download](https://img.shields.io/badge/Download-Latest-brightgreen)](https://www.usebruno.com/downloads)

| [English](../../readme.md)
| [Українська](readme_ua.md)
| [Русский](readme_ru.md)
| [Türkçe](readme_tr.md)
| [Deutsch](readme_de.md)
| [Français](readme_fr.md)
| [Português (BR)](readme_pt_br.md)
| [한국어](readme_kr.md)
| [বাংলা](readme_bn.md)
| [Español](readme_es.md)
| [Italiano](readme_it.md)
| [Română](readme_ro.md)
| [Polski](readme_pl.md)
| [简体中文](readme_cn.md)
| [正體中文](readme_zhtw.md)
| [العربية](readme_ar.md)
| [日本語](readme/readme_ja.md)
| [ქართული](readme/readme_ka.md)
| [Nederlands](readme/readme_nl.md)
| [فارسی](readme_fa.md)
| **Indonesia**

Bruno adalah klien API baru dan inovatif, yang bertujuan untuk merevolusi status quo yang diwakili oleh Postman dan alat serupa lainnya.

Bruno menyimpan koleksi Anda langsung di dalam folder pada sistem file Anda. Kami menggunakan bahasa markup teks biasa, Bru, untuk menyimpan informasi tentang permintaan API.

Anda dapat menggunakan Git atau sistem kontrol versi pilihan Anda untuk berkolaborasi dalam koleksi API Anda.

Bruno hanya dapat digunakan secara offline. Tidak ada rencana untuk menambahkan sinkronisasi cloud ke Bruno, selamanya. Kami menghargai privasi data Anda dan percaya bahwa data tersebut harus tetap berada di perangkat Anda. Baca visi jangka panjang kami [di sini](https://github.com/us)

[Unduh Bruno](https://www.usebruno.com/downloads)

📢 Saksikan presentasi terbaru kami di Konferensi FOSS 3.0 India [di sini](https://www.youtube.com/watch?v=7bSMFpbcPiY)

![bruno](assets/images/landing-2-dark.png#gh-light-mode-only)
![bruno](assets/images/landing-2-light.png#gh-dark-mode-only) <br /><br />

## Versi Komersial ✨

Sebagian besar fitur kami gratis dan bersifat open source.
Kami berusaha mencapai keseimbangan yang harmonis antara [prinsip sumber terbuka dan keberlanjutan](https://github.com/usebruno/bruno/discussions/269)

Anda dapat menjelajahi [versi berbayar kami](https://www.usebruno.com/pricing) untuk melihat apakah ada fitur tambahan yang mungkin berguna bagi Anda atau tim Anda! <br/>

## Daftar isi

- [Instalasi](#instalasi)
- [Bruno CLI](#bruno-cli)
- [Jalankan dengan Docker](#jalankan-dengan-docker)
- [Fitur](#fitur)
  - [Berjalan di berbagai platform 🖥️](#berjalan-di-berbagai-platform-%EF%B8%8F)
  - [Berkolaborasi melalui Git 👩‍💻🧑‍💻](#berkolaborasi-melalui-git-%E2%80%8D%E2%80%8D)
- [Tautan Penting 📌](#tautan-penting-)
- [Memamerkan 🎥](#memamerkan-)
- [Bagikan Testimoni 📣](#bagikan-testimoni-)
- [Menerbitkan ke Pengelola Paket Baru](#menerbitkan-ke-pengelola-paket-baru)
- [Tetaplah terhubung 🌐](#tetaplah-terhuhung-)
- [Merek dagang](#merek-dagang)
- [Menyumbang 👩‍💻🧑‍💻](#menyumbang-%E2%80%8D%E2%80%8D)
- [Penulis](#penulis)
- [Lisensi 📄](#lisensi-)

## Instalasi

Bruno tersedia sebagai unduhan biner [di situs web kami](https://www.usebruno.com/downloads) untuk Mac, Windows, dan Linux.

Anda juga dapat menginstal Bruno melalui pengelola paket seperti Homebrew, Chocolatey, Scoop, Snap, Flatpak, dan Apt.

```sh
# Di Mac melalui Homebrew
brew install bruno

# Di Windows melalui Chocolatey
choco install bruno

# Di Windows melalui Scoop
scoop bucket add extras
scoop install bruno

# Di Windows melalui Winget
winget install Bruno.Bruno

# Di Linux melalui Snap
snap install bruno

# Di Linux melalui Flatpak
flatpak install com.usebruno.Bruno

# Di Arch Linux melalui AUR
yay -S bruno

# Di Linux melalui Apt
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

## Bruno CLI

**Bruno CLI** memungkinkan Anda menjalankan koleksi API Anda dari baris perintah, yang ideal untuk pengujian otomatis dan pipeline CI/CD. Instal dari npm menggunakan pengelola paket pilihan Anda:

```sh
npm install -g @usebruno/cli
```

Masuk ke direktori yang berisi koleksi Anda dan jalankan:

```sh
# Jalankan setiap permintaan dalam koleksi
bru run

# Jalankan satu permintaan
bru run request.bru

# Jalankan folder terhadap lingkungan tertentu.
bru run folder --env Local
```

Untuk referensi perintah lengkap, lihat [dokumentasi Bruno CLI](https://docs.usebruno.com/bru-cli/overview).

## Jalankan dengan Docker

Image Docker resmi untuk **Bruno CLI** memungkinkan Anda menjalankan koleksi API dalam pipeline CI/CD dan secara lokal tanpa perlu menginstal Node.js atau npm di host. Image dipublikasikan ke [Docker Hub](https://hub.docker.com/r/usebruno/cli) dan [GitHub Container Registry](https://ghcr.io/usebruno/cli) pada setiap rilis CLI, dengan varian `alpine` dan `debian` untuk `linux/amd64` dan `linux/arm64`.

```sh
# Unduh dari Docker Hub
docker pull usebruno/cli:latest

# Atau ambil dari GitHub Container Registry.
docker pull ghcr.io/usebruno/cli:latest

# Jalankan koleksi dengan memasang direktori saat ini.
docker run -v $(pwd):/bruno usebruno/cli run
```

Untuk varian, matriks tag, file lingkungan, dan contoh CI (GitHub Actions, GitLab CI, Jenkins), lihat dokumentasi lengkap [Bruno CLI Docker](https://docs.usebruno.com/bru-cli/docker).

## Fitur

### Berjalan di berbagai platform 🖥️

![bruno](assets/images/run-anywhere.png) <br /><br />

### Berkolaborasi melalui Git 👩‍💻🧑‍💻

Atau sistem kontrol versi apa pun pilihan Anda.

![bruno](assets/images/version-control.png) <br /><br />

## Tautan Penting 📌

- [Visi Jangka Panjang Kami](https://github.com/usebruno/bruno/discussions/269)
- [Peta jalan](https://www.usebruno.com/roadmap)
- [Dokumentasi](https://docs.usebruno.com)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/bruno)
- [Situs web](https://www.usebruno.com)
- [Harga](https://www.usebruno.com/pricing)
- [Unduh](https://www.usebruno.com/downloads)

## Memamerkan 🎥

- [Testimoni](https://github.com/usebruno/bruno/discussions/343)
- [Pusat Pengetahuan](https://github.com/usebruno/bruno/discussions/386)
- [Scriptmania](https://github.com/usebruno/bruno/discussions/385)

## Bagikan Testimoni 📣

Jika Bruno telah membantu Anda di tempat kerja dan tim Anda, jangan lupa untuk membagikan [testimoni Anda di diskusi GitHub kami](https://github.com/usebruno/bruno/discussions/343)

## Menerbitkan ke Pengelola Paket Baru

Silakan lihat [di sini](publishing.md) untuk informasi selengkapnya.

## Tetaplah terhubung 🌐

[𝕏 (Twitter)](https://twitter.com/use_bruno) <br />
[Situs web](https://www.usebruno.com) <br />
[Discord](https://discord.com/invite/KgcZUncpjq) <br />
[LinkedIn](https://www.linkedin.com/company/usebruno)

## Merek dagang

**Nama**

`Bruno` adalah merek dagang yang dimiliki oleh [Anoop M D](https://www.helloanoop.com/)

**Logo**

Logo ini bersumber dari [OpenMoji](https://openmoji.org/library/emoji-1F436/). Lisensi: CC [BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)


## Menyumbang 👩‍💻🧑‍💻

Saya senang Anda ingin meningkatkan Bruno. Silakan lihat [panduan kontribusi](contributing.md).

Sekalipun Anda tidak dapat memberikan kontribusi melalui kode, jangan ragu untuk melaporkan bug dan mengajukan permintaan fitur yang perlu diimplementasikan untuk menyelesaikan masalah yang Anda butuhkan.

## Penulis

<div align="center">
    <a href="https://github.com/usebruno/bruno/graphs/contributors">
        <img src="https://contrib.rocks/image?repo=usebruno/bruno" />
    </a>
</div>

## Lisensi 📄

[MIT](license.md)

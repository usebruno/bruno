<br />
<img src="/assets/images/logo-transparent.png" width="80"/>

### Bruno - IDE mã nguồn mở để khám phá và kiểm thử API.

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
| [Polski](./readme_pl.md)
| [简体中文](./readme_cn.md)
| [正體中文](./readme_zhtw.md)
| [العربية](./readme_ar.md)
| [日本語](./readme_ja.md)
| [ქართული](./readme_ka.md)
| [Nederlands](./readme_nl.md)
| [فارسی](./readme_fa.md)
| **Tiếng Việt**

Bruno là một API client mới và sáng tạo, hướng tới việc cách mạng hóa hiện trạng được đại diện bởi Postman và các công cụ tương tự khác.

Bruno lưu trữ các collection của bạn trực tiếp trong một thư mục trên hệ thống tệp của bạn. Chúng tôi sử dụng một ngôn ngữ đánh dấu văn bản thuần túy là Bru để lưu thông tin về các API request.

Bạn có thể sử dụng Git hoặc bất kỳ hệ thống kiểm soát phiên bản nào bạn chọn để cộng tác trên các API collection của mình.

Bruno hoạt động hoàn toàn ngoại tuyến. Chúng tôi không có kế hoạch thêm tính năng đồng bộ qua đám mây vào Bruno, sẽ không bao giờ. Chúng tôi tôn trọng quyền riêng tư dữ liệu của bạn và tin rằng dữ liệu nên được lưu giữ trên thiết bị của bạn. Đọc tầm nhìn dài hạn của chúng tôi [tại đây](https://github.com/usebruno/bruno/discussions/269).

[Tải về Bruno](https://www.usebruno.com/downloads)

📢 Xem bài thuyết trình gần đây của chúng tôi tại Hội nghị India FOSS 3.0 [tại đây](https://www.youtube.com/watch?v=7bSMFpbcPiY)

![bruno](/assets/images/landing-2-dark.png#gh-light-mode-only)
![bruno](/assets/images/landing-2-light.png#gh-dark-mode-only) <br /><br />

## Phiên bản thương mại ✨

Phần lớn các tính năng của chúng tôi đều miễn phí và mã nguồn mở.
Chúng tôi nỗ lực tìm kiếm sự cân bằng hài hòa giữa [các nguyên tắc mã nguồn mở và tính bền vững](https://github.com/usebruno/bruno/discussions/269).

Bạn có thể khám phá các [phiên bản trả phí](https://www.usebruno.com/pricing) để xem có thêm tính năng nào mà bạn hoặc nhóm của bạn có thể thấy hữu ích! <br/>

## Mục lục

- [Cài đặt](#cài-đặt)
- [Tính năng](#tính-năng)
  - [Chạy trên nhiều nền tảng 🖥️](#chạy-trên-nhiều-nền-tảng-)
  - [Cộng tác qua Git 👩‍💻🧑‍💻](#cộng-tác-qua-git-)
- [Liên kết quan trọng 📌](#liên-kết-quan-trọng-)
- [Showcase 🎥](#showcase-)
- [Chia sẻ đánh giá 📣](#chia-sẻ-đánh-giá-)
- [Phát hành lên Package Manager mới](#phát-hành-lên-package-manager-mới)
- [Giữ liên lạc 🌐](#giữ-liên-lạc-)
- [Thương hiệu](#thương-hiệu)
- [Đóng góp 👩‍💻🧑‍💻](#đóng-góp-)
- [Tác giả](#tác-giả)
- [Giấy phép 📄](#giấy-phép-)

## Cài đặt

Bruno có sẵn dưới dạng tệp tải về [trên website của chúng tôi](https://www.usebruno.com/downloads) cho Mac, Windows và Linux.

Bạn cũng có thể cài đặt Bruno qua các package manager như Homebrew, Chocolatey, Scoop, Snap, Flatpak và Apt.

```sh
# Trên Mac qua Homebrew
brew install bruno

# Trên Windows qua Chocolatey
choco install bruno

# Trên Windows qua Scoop
scoop bucket add extras
scoop install bruno

# Trên Windows qua winget
winget install Bruno.Bruno

# Trên Linux qua Snap
snap install bruno

# Trên Linux qua Flatpak
flatpak install com.usebruno.Bruno

# Trên Arch Linux qua AUR
yay -S bruno

# Trên Linux qua Apt
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

## Tính năng

### Chạy trên nhiều nền tảng 🖥️

![bruno](/assets/images/run-anywhere.png) <br /><br />

### Cộng tác qua Git 👩‍💻🧑‍💻

Hoặc bất kỳ hệ thống kiểm soát phiên bản nào bạn chọn

![bruno](/assets/images/version-control.png) <br /><br />

## Liên kết quan trọng 📌

- [Tầm nhìn dài hạn của chúng tôi](https://github.com/usebruno/bruno/discussions/269)
- [Lộ trình phát triển](https://www.usebruno.com/roadmap)
- [Tài liệu](https://docs.usebruno.com)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/bruno)
- [Website](https://www.usebruno.com)
- [Bảng giá](https://www.usebruno.com/pricing)
- [Tải về](https://www.usebruno.com/downloads)

## Showcase 🎥

- [Đánh giá](https://github.com/usebruno/bruno/discussions/343)
- [Trung tâm kiến thức](https://github.com/usebruno/bruno/discussions/386)
- [Scriptmania](https://github.com/usebruno/bruno/discussions/385)

## Chia sẻ đánh giá 📣

Nếu Bruno đã giúp ích cho bạn trong công việc và cho nhóm của bạn, xin đừng quên chia sẻ [đánh giá của bạn trên GitHub discussion](https://github.com/usebruno/bruno/discussions/343) của chúng tôi.

## Phát hành lên Package Manager mới

Vui lòng xem [tại đây](../../publishing.md) để biết thêm thông tin.

## Giữ liên lạc 🌐

[𝕏 (Twitter)](https://twitter.com/use_bruno) <br />
[Website](https://www.usebruno.com) <br />
[Discord](https://discord.com/invite/KgcZUncpjq) <br />
[LinkedIn](https://www.linkedin.com/company/usebruno)

## Thương hiệu

**Tên**

`Bruno` là một thương hiệu thuộc sở hữu của [Anoop M D](https://www.helloanoop.com/)

**Logo**

Logo được lấy từ [OpenMoji](https://openmoji.org/library/emoji-1F436/). Giấy phép: CC [BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

## Đóng góp 👩‍💻🧑‍💻

Tôi rất vui vì bạn đang muốn cải thiện Bruno. Vui lòng xem [hướng dẫn đóng góp](../contributing/contributing_vi.md).

Ngay cả khi bạn không thể đóng góp qua mã nguồn, xin đừng ngần ngại báo cáo lỗi và đề xuất tính năng cần được triển khai để giải quyết trường hợp sử dụng của bạn.

## Tác giả

<div align="center">
    <a href="https://github.com/usebruno/bruno/graphs/contributors">
        <img src="https://contrib.rocks/image?repo=usebruno/bruno" />
    </a>
</div>

## Giấy phép 📄

[MIT](../../license.md)

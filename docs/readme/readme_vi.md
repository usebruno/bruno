<br />
<img src="../../assets/images/logo-transparent.png" width="80" alt="Bruno logo"/>

### Bruno - IDE mã nguồn mở để khám phá và kiểm thử APIs.

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
| **Tiếng Việt**
| [简体中文](./readme_cn.md)
| [正體中文](./readme_zhtw.md)
| [العربية](./readme_ar.md)
| [日本語](./readme_ja.md)
| [ქართული](./readme_ka.md)
| [Nederlands](./readme_nl.md)
| [فارسی](./readme_fa.md)

Bruno là một API client mới và sáng tạo, hướng tới việc thay đổi hiện trạng mà Postman và các công cụ tương tự đang đại diện.

Bruno lưu các collection trực tiếp trong một thư mục trên hệ thống tệp của bạn. Chúng tôi dùng Bru, một ngôn ngữ đánh dấu dạng văn bản thuần, để lưu thông tin về các API request.

Bạn có thể dùng Git hoặc bất kỳ hệ thống quản lý phiên bản nào bạn chọn để cộng tác trên các API collection.

Bruno chỉ hoạt động offline. Chúng tôi không có kế hoạch thêm cloud-sync vào Bruno, và sẽ không bao giờ làm vậy. Chúng tôi coi trọng quyền riêng tư dữ liệu của bạn và tin rằng dữ liệu nên ở lại trên thiết bị của bạn. Đọc tầm nhìn dài hạn của chúng tôi [tại đây](https://github.com/usebruno/bruno/discussions/269)

[Tải Bruno](https://www.usebruno.com/downloads)

📢 Xem bài nói chuyện gần đây của chúng tôi tại India FOSS 3.0 Conference [tại đây](https://www.youtube.com/watch?v=7bSMFpbcPiY)

![bruno](../../assets/images/landing-2-dark.png#gh-light-mode-only)
![bruno](../../assets/images/landing-2-light.png#gh-dark-mode-only) <br /><br />

## Phiên bản thương mại ✨

Phần lớn tính năng của chúng tôi là miễn phí và mã nguồn mở.
Chúng tôi cố gắng cân bằng hài hòa giữa [các nguyên tắc mã nguồn mở và tính bền vững](https://github.com/usebruno/bruno/discussions/269)

Bạn có thể xem các [phiên bản trả phí](https://www.usebruno.com/pricing) để biết liệu có tính năng bổ sung nào hữu ích cho bạn hoặc nhóm của bạn hay không! <br/>

## Mục lục

- [Cài đặt](#cài-đặt)
- [Tính năng](#tính-năng)
  - [Chạy trên nhiều nền tảng 🖥️](#chạy-trên-nhiều-nền-tảng-️)
  - [Cộng tác qua Git 👩‍💻🧑‍💻](#cộng-tác-qua-git-)
- [Liên kết quan trọng 📌](#liên-kết-quan-trọng-)
- [Showcase 🎥](#showcase-)
- [Chia sẻ lời chứng thực 📣](#chia-sẻ-lời-chứng-thực-)
- [Phát hành lên trình quản lý gói mới](#phát-hành-lên-trình-quản-lý-gói-mới)
- [Giữ liên lạc 🌐](#giữ-liên-lạc-)
- [Nhãn hiệu](#nhãn-hiệu)
- [Đóng góp 👩‍💻🧑‍💻](#đóng-góp-)
- [Tác giả](#tác-giả)
- [Giấy phép 📄](#giấy-phép-)

## Cài đặt

Bruno có sẵn dưới dạng bản tải xuống binary [trên website của chúng tôi](https://www.usebruno.com/downloads) cho Mac, Windows và Linux.

Bạn cũng có thể cài Bruno qua các trình quản lý gói như Homebrew, Chocolatey, Scoop, Snap, Flatpak và Apt.

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

# On Arch Linux via AUR
yay -S bruno

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

## Tính năng

### Chạy trên nhiều nền tảng 🖥️

![bruno](../../assets/images/run-anywhere.png) <br /><br />

### Cộng tác qua Git 👩‍💻🧑‍💻

Hoặc bất kỳ hệ thống quản lý phiên bản nào bạn chọn

![bruno](../../assets/images/version-control.png) <br /><br />

## Liên kết quan trọng 📌

- [Tầm nhìn dài hạn của chúng tôi](https://github.com/usebruno/bruno/discussions/269)
- [Roadmap](https://www.usebruno.com/roadmap)
- [Tài liệu](https://docs.usebruno.com)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/bruno)
- [Website](https://www.usebruno.com)
- [Bảng giá](https://www.usebruno.com/pricing)
- [Tải xuống](https://www.usebruno.com/downloads)

## Showcase 🎥

- [Testimonials](https://github.com/usebruno/bruno/discussions/343)
- [Knowledge Hub](https://github.com/usebruno/bruno/discussions/386)
- [Scriptmania](https://github.com/usebruno/bruno/discussions/385)

## Chia sẻ lời chứng thực 📣

Nếu Bruno đã giúp ích cho bạn trong công việc và trong nhóm của bạn, đừng quên chia sẻ [lời chứng thực trên GitHub discussion của chúng tôi](https://github.com/usebruno/bruno/discussions/343)

## Phát hành lên trình quản lý gói mới

Vui lòng xem [tại đây](../publishing/publishing_vi.md) để biết thêm thông tin.

## Giữ liên lạc 🌐

[𝕏 (Twitter)](https://twitter.com/use_bruno) <br />
[Website](https://www.usebruno.com) <br />
[Discord](https://discord.com/invite/KgcZUncpjq) <br />
[LinkedIn](https://www.linkedin.com/company/usebruno)

## Nhãn hiệu

**Tên**

`Bruno` là nhãn hiệu thuộc sở hữu của [Anoop M D](https://www.helloanoop.com/)

**Logo**

Logo được lấy từ [OpenMoji](https://openmoji.org/library/emoji-1F436/). Giấy phép: CC [BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

## Đóng góp 👩‍💻🧑‍💻

Tôi rất vui khi bạn muốn cải thiện Bruno. Vui lòng xem [hướng dẫn đóng góp](../contributing/contributing_vi.md)

Ngay cả khi bạn không thể đóng góp bằng code, đừng ngần ngại báo lỗi và yêu cầu tính năng cần được triển khai để giải quyết use case của bạn.

## Tác giả

<div align="center">
    <a href="https://github.com/usebruno/bruno/graphs/contributors">
        <img src="https://contrib.rocks/image?repo=usebruno/bruno" alt="Danh sách contributors của Bruno" />
    </a>
</div>

## Giấy phép 📄

[MIT](../../license.md)

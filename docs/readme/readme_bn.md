<br />
<img src="../../assets/images/logo-transparent.png" width="80"/>

### ব্রুনো - API অন্বেষণ এবং পরীক্ষা করার জন্য ওপেনসোর্স IDE।

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
| **বাংলা**
| [Español](./readme_es.md)
| [Italiano](./readme_it.md)
| [Română](./readme_ro.md)
| [Polski](./readme_pl.md)
| [简体中文](./readme_cn.md)
| [正體中文](./readme_zhtw.md)
| [العربية](./readme_ar.md)
| [日本語](./readme_ja.md)
| [ქართული](./readme_ka.md)

ব্রুনো হল একটি নতুন এবং উদ্ভাবনী API ক্লায়েন্ট, যার লক্ষ্য পোস্টম্যান এবং অনুরূপ সরঞ্জাম দ্বারা প্রতিনিধিত্ব করা স্থিতাবস্থায় বিপ্লব ঘটানো।

ব্রুনো আপনার সংগ্রহগুলি সরাসরি আপনার ফাইল সিস্টেমের একটি ফোল্ডারে সঞ্চয় করে। আমরা API অনুরোধ সম্পর্কে তথ্য সংরক্ষণ করতে একটি প্লেইন টেক্সট মার্কআপ ভাষা, ব্রু ব্যবহার করি।

আপনি আপনার API সংগ্রহে সহযোগিতা করতে গিট বা আপনার পছন্দের যেকোনো সংস্করণ নিয়ন্ত্রণ ব্যবহার করতে পারেন।

ব্রুনো শুধুমাত্র অফলাইন। ব্রুনোতে ক্লাউড-সিঙ্ক যোগ করার কোন পরিকল্পনা নেই, কখনও। আমরা আপনার ডেটা গোপনীয়তার মূল্য দিই এবং বিশ্বাস করি এটি আপনার ডিভাইসে থাকা উচিত। আমাদের দীর্ঘমেয়াদী দৃষ্টি পড়ুন। [এখানে ](https://github.com/usebruno/bruno/discussions/269)

📢 ইন্ডিয়া FOSS 3.0 সম্মেলনে আমাদের সাম্প্রতিক আলোচনা দেখুন [এখানে](https://www.youtube.com/watch?v=7bSMFpbcPiY)

![bruno](/assets/images/landing-2.png) <br /><br />

### স্থাপন

ব্রুনো বাইনারি ডাউনলোড হিসাবে উপলব্ধ [আমাদের ওয়েবসাইটে](https://www.usebruno.com/downloads) ম্যাক, উইন্ডোজ এবং লিনাক্সের জন্য।

আপনি Homebrew, Chocolatey, Snap এবং Apt এর মত প্যাকেজ ম্যানেজারদের মাধ্যমে ব্রুনো ইনস্টল করতে পারেন।

```sh
# Homebrew এর মাধ্যমে Mac-এ
brew install --cask bruno

# চকোলেটির মাধ্যমে উইন্ডোজে
choco install bruno

# স্ন্যাপ এর মাধ্যমে লিনাক্সে
snap install bruno

# Apt এর মাধ্যমে লিনাক্সে
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

### একাধিক প্ল্যাটফর্মে চালান 🖥️

![bruno](/assets/images/run-anywhere.png) <br /><br />

### Git এর মাধ্যমে সহযোগিতা করুন 👩‍💻🧑‍💻

অথবা আপনার পছন্দের যেকোনো সংস্করণ নিয়ন্ত্রণ ব্যবস্থা

![bruno](/assets/images/version-control.png) <br /><br />

### গুরুত্বপূর্ণ লিংক 📌

- [আমাদের দীর্ঘমেয়াদী দৃষ্টি](https://github.com/usebruno/bruno/discussions/269)
- [রোডম্যাপ](https://github.com/usebruno/bruno/discussions/384)
- [ডকুমেন্টেশন](https://docs.usebruno.com)
- [ওয়েবসাইট](https://www.usebruno.com)
- [মূল্য](https://www.usebruno.com/pricing)
- [ডাউনলোড করুন](https://www.usebruno.com/downloads)

### শোকেস 🎥

- [প্রশংসাপত্র](https://github.com/usebruno/bruno/discussions/343)
- [নলেজ হাব](https://github.com/usebruno/bruno/discussions/386)
- [স্ক্রিপ্টম্যানিয়া](https://github.com/usebruno/bruno/discussions/385)

### সমর্থন ❤️

উফ ! আপনি যদি প্রকল্পটি পছন্দ করেন তবে ⭐ বোতামটি টিপুন !!

### প্রশংসাপত্র শেয়ার করুন 📣

যদি ব্রুনো আপনাকে কর্মক্ষেত্রে এবং আপনার দলগুলিতে সাহায্য করে থাকে, অনুগ্রহ করে আপনার [আমাদের গিটহাব আলোচনায় প্রশংসাপত্রগুলি](https://github.com/usebruno/bruno/discussions/343) শেয়ার করতে ভুলবেন না

### নতুন প্যাকেজ পরিচালকদের কাছে প্রকাশ করা হচ্ছে

আরও তথ্যের জন্য অনুগ্রহ করে [এখানে](../publishing/publishing_bn.md) দেখুন।

### অবদান 👩‍💻🧑‍💻

আমি খুশি যে আপনি ব্রুনোর উন্নতি করতে চাইছেন। অনুগ্রহ করে [অবদানকারী নির্দেশিকা](../contributing/contributing_bn.md) দেখুন

আপনি কোডের মাধ্যমে অবদান রাখতে না পারলেও, অনুগ্রহ করে বাগ এবং বৈশিষ্ট্যের অনুরোধ ফাইল করতে দ্বিধা করবেন না যা আপনার ব্যবহারের ক্ষেত্রে সমাধান করার জন্য প্রয়োগ করা প্রয়োজন।

### লেখক

<div align="center">
    <a href="https://github.com/usebruno/bruno/graphs/contributors">
        <img src="https://contrib.rocks/image?repo=usebruno/bruno" />
    </a>
</div>

### সাথে থাকুন 🌐

[𝕏 (টুইটার)](https://twitter.com/use_bruno) <br />
[ওয়েবসাইট](https://www.usebruno.com) <br />
[ডিসকর্ড](https://discord.com/invite/KgcZUncpjq) <br />
[লিঙ্কডইন](https://www.linkedin.com/company/usebruno)

### ট্রেডমার্ক

**নাম**

`Bruno` হল একটি ট্রেডমার্ক [Anoop M D](https://www.helloanoop.com/)

**লোগো**

লোগোটি [OpenMoji](https://openmoji.org/library/emoji-1F436/) থেকে নেওয়া হয়েছে। লাইসেন্স: CC [BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

### লাইসেন্স 📄

[MIT](../../license.md)

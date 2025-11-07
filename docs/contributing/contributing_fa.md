[English](../../contributing.md)

## با هم، Bruno را بهتر می‌کنیم!

خوشحالم که قصد دارید Bruno را بهبود ببخشید. در ادامه قوانین و راهنماها برای راه‌اندازی Bruno روی سیستم شما آورده شده است.

### فناوری‌های استفاده‌شده

به فارسی برونو Bruno با استفاده از Next.js و React ساخته شده است. همچنین از Electron برای بسته‌بندی نسخه دسکتاپ (که امکان مجموعه‌های محلی را فراهم می‌کند) استفاده می‌کنیم.

کتابخانه‌هایی که استفاده می‌کنیم:

- CSS - Tailwind استایل
- Codemirror - ویرایشگر کد
- Redux - مدیریت وضعیت
- Tabler Icons - آیکون‌ها
- formik - فرم‌ها
- Yup اعتبارسنجی اسکیمـا
- axios - کلاینت درخواست
- chokidar - پایش‌گر سیستم فایل

### پیش‌نیازها

شما به [نود v20.x یا اخرین نسخه پایدار](https://nodejs.org/en/) و npm 8.x نیاز دارید. در این پروژه از فضای کاری npm (npm workspaces) استفاده می‌کنیم.

### شروع به کدنویسی

برای راه‌اندازی محیط توسعه محلی به فایل [مستندات توسعه](docs/development_fa.md) مراجعه کنید:

### ارسال Pull Request

1 - لطفاً Pull Requestها (PR) را کوتاه و متمرکز نگه دارید و تنها یک هدف مشخص را دنبال کنند. </br>
2 - لطفاً از فرمت نام‌گذاری شاخه‌ها استفاده کنید:
  - feature/[name]: این شاخه باید شامل یک قابلیت مشخص باشد.
    - feature/dark-mode : مثال
  - bugfix/[name]: این شاخه باید تنها شامل رفع یک باگ مشخص باشد.
    - bugfix/bug-1 : مثال

## توسعه

به فارسی برونو یا Bruno به‌صورت یک اپلیکیشن «سنگین» توسعه داده می‌شود. برای اجرا باید ابتدا Next.js را در یک پنجره ترمینال اجرا کنید و سپس اپلیکیشن Electron را در پنجره ترمینال دیگری راه‌اندازی نمایید.

### نیازمندی توسعه

- NodeJS v18

### اجرای محلی

```bash
# از ورژن NodeJS 18 استفاده کنید
nvm use

# نصب وابستگی‌ها
npm i --legacy-peer-deps

# ساخت مستندات GraphQL
npm run build:graphql-docs

# ساخت bruno-query
npm run build:bruno-query

# اجرای اپ Next (ترمینال 1)
npm run dev:web

# اجرای اپ Electron (ترمینال 2)
npm run dev:electron
```

### عیب‌یابی

ممکن است هنگام اجرای `npm install` خطای `Unsupported platform` ببینید. برای رفع این مشکل، پوشه `node_modules` و فایل `package-lock.json` را حذف کرده و سپس دوباره `npm install` را اجرا کنید. این کار معمولاً همه پکیج‌های لازم را نصب می‌کند.

```shell
# حذف پوشه node_modules در زیردایرکتوری‌ها
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
  rm -rf "$dir"
done

# حذف فایل package-lock.json در زیردایرکتوری‌ها
find . -type f -name "package-lock.json" -delete
```

### تست‌ها

```bash
# اجرای تست‌های schema مربوط به bruno
npm test --workspace=packages/bruno-schema

# اجرای تست‌ها در همه فضاهای کاری (در صورت وجود)
npm test --workspaces --if-present
```

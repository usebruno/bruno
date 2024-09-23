[English](../../contributing.md)

## আসুন ব্রুনোকে আরও ভালো করি, একসাথে!!

আমরা খুশি যে আপনি ব্রুনোর উন্নতি করতে চাইছেন। নীচে আপনার কম্পিউটারে ব্রুনো ইনষ্টল করার নির্দেশিকা রয়েছে৷।

### Technology Stack (প্রযুক্তি স্ট্যাক)

ব্রুনো Next.js এবং React ব্যবহার করে নির্মিত। এছাড়াও আমরা একটি ডেস্কটপ সংস্করণ পাঠাতে ইলেক্ট্রন ব্যবহার করি (যা স্থানীয় সংগ্রহ সমর্থন করে)

নিম্ন লিখিত লাইব্রেরি আমরা ব্যবহার করি -

- CSS - Tailwind
- Code Editors - Codemirror
- State Management - Redux
- Icons - Tabler Icons
- Forms - formik
- Schema Validation - Yup
- Request Client - axios
- Filesystem Watcher - chokidar

### Dependencies (নির্ভরতা)

আপনার প্রয়োজন হবে [নোড v18.x বা সর্বশেষ LTS সংস্করণ](https://nodejs.org/en/) এবং npm 8.x। আমরা প্রকল্পে npm ওয়ার্কস্পেস ব্যবহার করি ।

## Development

ব্রুনো একটি ডেস্কটপ অ্যাপ হিসেবে তৈরি করা হচ্ছে। আপনাকে একটি টার্মিনালে Next.js অ্যাপটি চালিয়ে অ্যাপটি লোড করতে হবে এবং তারপরে অন্য টার্মিনালে ইলেক্ট্রন অ্যাপটি চালাতে হবে।

### Dependencies (নির্ভরতা)

- NodeJS v18

### Local Development

```bash
# nodejs 18 সংস্করণ ব্যবহার করুন
nvm use

# নির্ভরতা ইনস্টল করুন
npm i --legacy-peer-deps

# গ্রাফকিউএল ডক্স তৈরি করুন
npm run build:graphql-docs

# ব্রুনো কোয়েরি তৈরি করুন
npm run build:bruno-query

# NextJs অ্যাপ চালান (টার্মিনাল 1)
npm run dev:web

# ইলেক্ট্রন অ্যাপ চালান (টার্মিনাল 2)
npm run dev:electron
```

### Troubleshooting (সমস্যা সমাধান)

আপনি যখন 'npm install' চালান তখন আপনি একটি 'অসমর্থিত প্ল্যাটফর্ম' ত্রুটির সম্মুখীন হতে পারেন৷ এটি ঠিক করতে, আপনাকে `node_modules` এবং `package-lock.json` মুছে ফেলতে হবে এবং `npm install` চালাতে হবে। এটি অ্যাপটি চালানোর জন্য প্রয়োজনীয় সমস্ত প্যাকেজ ইনস্টল করবে যাতে এই ত্রুটি ঠিক হয়ে যেতে পারে ।

```shell
# সাব-ডিরেক্টরিতে নোড_মডিউল মুছুন
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
  rm -rf "$dir"
done

# সাব-ডিরেক্টরিতে প্যাকেজ-লক মুছুন
find . -type f -name "package-lock.json" -delete
```

### Testing (পরীক্ষা)

```bash
# bruno-schema
npm test --workspace=packages/bruno-schema

# bruno-lang
npm test --workspace=packages/bruno-lang
```

### Raising Pull Request (পুল অনুরোধ উত্থাপন)

- অনুগ্রহ করে PR এর আকার ছোট রাখুন এবং একটি বিষয়ে ফোকাস করুন।
- অনুগ্রহ করে শাখা তৈরির বিন্যাস অনুসরণ করুন।
  - বৈশিষ্ট্য/[ফিচারের নাম]: এই শাখায় একটি নির্দিষ্ট বৈশিষ্ট্যের জন্য পরিবর্তন থাকতে হবে।
    - উদাহরণ: বৈশিষ্ট্য/ডার্ক-মোড।
  - বাগফিক্স/[বাগ নাম]: এই শাখায় একটি নির্দিষ্ট বাগ-এর জন্য শুধুমাত্র বাগ ফিক্স থাকা উচিত।
    - উদাহরণ বাগফিক্স/বাগ-1।

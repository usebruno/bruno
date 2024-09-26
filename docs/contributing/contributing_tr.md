[English](../../contributing.md)

## Bruno'yu birlikte daha iyi hale getirelim!!!

bruno'yu geliştirmek istemenizden mutluluk duyuyoruz. Aşağıda, bruno'yu bilgisayarınıza getirmeye başlamak için yönergeler bulunmaktadır.

### Kullanılan Teknolojiler

Bruno, Next.js ve React kullanılarak oluşturulmuştur. Ayrıca bir masaüstü sürümü (yerel koleksiyonları destekleyen) göndermek için electron kullanıyoruz

Kullandığımız kütüphaneler

- CSS - Tailwind
- Kod Düzenleyiciler - Codemirror
- Durum Yönetimi - Redux
- Iconlar - Tabler Icons
- Formlar - formik
- Şema Doğrulama - Yup
- İstek İstemcisi - axios
- Dosya Sistemi İzleyicisi - chokidar

### Bağımlılıklar

[Node v20.x veya en son LTS sürümüne](https://nodejs.org/en/) ve npm 8.x'e ihtiyacınız olacaktır. Projede npm çalışma alanlarını kullanıyoruz

## Gelişim

Bruno bir masaüstü uygulaması olarak geliştirilmektedir. Next.js uygulamasını bir terminalde çalıştırarak uygulamayı yüklemeniz ve ardından electron uygulamasını başka bir terminalde çalıştırmanız gerekir.

### Bağımlılıklar

- NodeJS v18

### Yerel Geliştirme

```bash
# nodejs 18 sürümünü kullan
nvm use

# deps yükleyin
npm i --legacy-peer-deps

# graphql dokümanlarını oluştur
npm run build:graphql-docs

# bruno sorgusu oluştur
npm run build:bruno-query

# sonraki uygulamayı çalıştır (terminal 1)
npm run dev:web

# electron uygulamasını çalıştır (terminal 2)
npm run dev:electron
```

### Sorun Giderme

`npm install`'ı çalıştırdığınızda `Unsupported platform` hatası ile karşılaşabilirsiniz. Bunu düzeltmek için `node_modules` ve `package-lock.json` dosyalarını silmeniz ve `npm install` dosyasını çalıştırmanız gerekecektir. Bu, uygulamayı çalıştırmak için gereken tüm gerekli paketleri yüklemelidir.

```shell
#  Alt dizinlerdeki node_modules öğelerini silme
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
  rm -rf "$dir"
done

# Alt dizinlerdeki paket kilidini silme
find . -type f -name "package-lock.json" -delete
```

### Test

```bash
# bruno-schema
npm test --workspace=packages/bruno-schema

# bruno-lang
npm test --workspace=packages/bruno-lang
```

### Pull Request Oluşturma

- Lütfen PR'ları küçük tutun ve tek bir şeye odaklanın
- Lütfen şube oluşturma formatını takip edin
  - feature/[özellik adı]: Bu dal belirli bir özellik için değişiklikler içermelidir
    - Örnek: feature/dark-mode
  - bugfix/[hata adı]: Bu dal yalnızca belirli bir hata için hata düzeltmeleri içermelidir
    - Örnek bugfix/bug-1

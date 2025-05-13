[English](../../contributing.md)

## Bruno'yu birlikte daha iyi hale getirelim!!

Bruno'yu geliştirmek istediğiniz için mutluyuz. Aşağıda Bruno'yu bilgisayarınızda çalıştırmak için yönergeler bulunmaktadır.

### Teknoloji Yığını

Bruno, React kullanılarak oluşturulmuştur ve masaüstü sürümünü (yerel koleksiyonlar için destekle) sunmak için Electron'u kullanır.

Kullandığımız kütüphaneler

- CSS - Tailwind
- Kod Düzenleyicileri - Codemirror
- Durum Yönetimi - Redux
- Simgeler - Tabler Simgeleri
- Formlar - formik
- Şema Doğrulaması - Yup
- İstek İstemcisi - axios
- Dosya Sistemi İzleyicisi - chokidar
- i18n - i18next

> [!ÖNEMLİ]
> [Node v22.x veya en son LTS sürümüne](https://nodejs.org/en/) ihtiyacınız olacak. Projede npm çalışma alanlarını kullanıyoruz

## Geliştirme

Bruno bir masaüstü uygulamasıdır. Uygulamayı hem ön ucu hem de Electron uygulamasını ayrı ayrı çalıştırarak yüklemeniz gerekir.

> Not: Ön uç için React ve derleme ve geliştirme sunucusu için rsbuild kullanıyoruz.

## Bağımlılıkları Yükle

```bash
# nodejs 22 sürümünü kullan
nvm use

# deps'i yükle
npm i --legacy-peer-deps
```

### Yerel Geliştirme (Seçenek 1)

```bash
# paketleri oluştur
npm run build:graphql-docs
npm run build:bruno-query
npm run build:bruno-common
npm run build:bruno-converters
npm run build:bruno-requests

# bundle js sandbox kütüphaneleri
npm run sandbox:bundle-libraries --workspace=packages/bruno-js

# react app'i çalıştır (terminal 1)
npm run dev:web

# electron app'i çalıştır (terminal 2)
npm run dev:electron
```

### Yerel Geliştirme (Seçenek 2)

```bash
# bağımlılıkları yükle ve ayarla
npm run setup

# electron ve react app'i eş zamanlı olarak çalıştırın
npm run dev
```

### Sorun Giderme

`npm install` çalıştırdığınızda `Desteklenmeyen platform` hatasıyla karşılaşabilirsiniz. Bunu düzeltmek için `node_modules` ve `package-lock.json` dosyalarını silmeniz ve `npm install` çalıştırmanız gerekir. Bu, uygulamayı çalıştırmak için gereken tüm paketleri yüklemelidir.

```shell
# Alt dizinlerdeki node_modules'ı silin
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
rm -rf "$dir"
done

# Alt dizinlerdeki package-lock'u silin
find . -type f -name "package-lock.json" -delete
```

### Test

```bash
# bruno-schema testlerini çalıştır
npm test --workspace=packages/bruno-schema

# testleri tüm çalışma alanlarında çalıştır
npm test --workspaces --if-present
```

### Çekme İstekleri Oluşturma

- Lütfen PR'leri küçük tutun ve tek bir şeye odaklanın
- Lütfen dalları oluşturma biçimini izleyin
- feature/[özellik adı]: Bu dal belirli bir özellik için değişiklikler içermelidir
- Örnek: feature/dark-mode
- bugfix/[bug adı]: Bu dal yalnızca belirli bir hata için hata düzeltmeleri içermelidir
- Örnek bugfix/bug-1
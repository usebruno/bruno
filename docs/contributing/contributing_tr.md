[English](/readme.md) | [Українська](/contributing_ua.md) | [Русский](/contributing_ru.md) | **Türkçe** | [Deutsch](/contributing_de.md) | [Français](/contributing_fr.md) | [বাংলা](docs/contributing/contributing_bn.md)

## Bruno'yu birlikte daha iyi hale getirelim !!

Bruno'yu geliştirmek istemenizden mutluluk duyuyorum. Aşağıda, bruno'yu bilgisayarınıza getirmeye başlamak için yönergeler bulunmaktadır.

### Kullanılan Teknolojiler

Bruno, Next.js ve React kullanılarak oluşturulmuştur. Ayrıca bir masaüstü sürümü (yerel koleksiyonları destekleyen) göndermek için electron kullanıyoruz

Kullandığımız kütüphaneler

- CSS - Tailwind
- Kod Düzenleyiciler - Codemirror
- Durum Yönetimi - Redux
- Iconlar - Tabler Simgeleri
- Formlar - formik
- Şema Doğrulama - Yup
- İstek İstemcisi - axios
- Dosya Sistemi İzleyicisi - chokidar

### Bağımlılıklar

[Node v18.x veya en son LTS sürümüne](https://nodejs.org/en/) ve npm 8.x'e ihtiyacınız olacaktır. Projede npm çalışma alanlarını kullanıyoruz

### Kodlamaya başlayalım

Yerel geliştirme ortamının çalıştırılmasına ilişkin talimatlar için lütfen [development.md](docs/development.md) adresine başvurun.

### Pull Request Oluşturma

- Lütfen PR'ları küçük tutun ve tek bir şeye odaklanın
- Lütfen şube oluşturma formatını takip edin
  - feature/[özellik adı]: Bu dal belirli bir özellik için değişiklikler içermelidir
    - Örnek: feature/dark-mode
  - bugfix/[hata adı]: Bu dal yalnızca belirli bir hata için hata düzeltmelerini içermelidir
    - Örnek bugfix/bug-1

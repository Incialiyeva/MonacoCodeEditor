# Controlled Monaco IntelliSense Provider

Bu modül, Monaco Editor'da **sadece belirlediğiniz API'ların** IntelliSense önerilerinde görünmesini sağlar. Varsayılan JavaScript/TypeScript önerileri devre dışı bırakılır ve sadece tanımladığınız servisler ve `this.` context'i için öneriler gösterilir.

## Özellikler

- ✅ **Sadece belirlediğiniz API'lar görünür** - DOM, ES6, vs. önerileri yok
- ✅ **`this.` yazınca context-specific öneriler** - Arka plandaki objenin methodları/propları
- ✅ **Minimalist yaklaşım** - Component içinde 1-2 obje tanımla, hazır
- ✅ **Sürdürülebilir** - Yeni API eklemek çok kolay
- ✅ **VS Code benzeri deneyim** - Temiz ve kontrollü IntelliSense

## Kullanım

### 1. Temel Kullanım

```typescript
import { MonacoIntelliSenseProvider } from './monaco-intellisense.provider';

// Component içinde servislerinizi tanımlayın
private recordService = {
  getById: (id: number) => ({ id, name: 'Example' }),
  save: (dto: any) => true,
  delete: (id: number) => true
};

private formApi = {
  open: (code: string) => {},
  close: () => {},
  getValue: (field: string) => '',
  setValue: (field: string, value: any) => {}
};

// this. context'i tanımlayın
private thisContext = {
  userName: 'User',
  hasPermission: (perm: string) => true,
  recordService: this.recordService,
  form: this.formApi,
  currentRecord: null
};

// Monaco editor'ı başlatın
async ngAfterViewInit() {
  // Editor oluştur
  this.editor = monaco.editor.create(this.host.nativeElement, {
    model: this.model,
    // Varsayılan önerileri kapat
    quickSuggestions: false,
    wordBasedSuggestions: 'off',
    snippetSuggestions: 'none'
  });

  // IntelliSense provider'ı başlat
  this.intelliSenseProvider = new MonacoIntelliSenseProvider(monaco);
  this.intelliSenseProvider.initialize();
  
  // Editor'ı yapılandır
  this.intelliSenseProvider.configureEditor(this.editor);

  // Servislerinizi ekleyin
  this.intelliSenseProvider.addLib({
    name: 'recordService',
    value: this.recordService,
    definition: `declare global {
      var recordService: {
        getById(id: number): any;
        save(dto: any): boolean;
        delete(id: number): boolean;
      };
    } export {};`
  });

  // this context'i ayarlayın
  const registry = (this.intelliSenseProvider as any).registry;
  registry.setThisContext(this.thisContext);
}
```

### 2. Örnek Component

`MonacoEditorExampleComponent` dosyasında tam bir örnek bulabilirsiniz. Bu component:

- 3 farklı servis tanımlar (`recordService`, `form`, `dialog`)
- `this.` context'i için özel öneriler sağlar
- Varsayılan önerileri tamamen kapatır
- Modern ve temiz bir UI sunar

### 3. Editor'da Test Etme

Editor'da şunları deneyin:

```javascript
// this. yazınca context önerileri gelir
function test() {
  this.  // ← userName, hasPermission, recordService, form, currentRecord
}

// recordService. yazınca sadece bu servisin methodları gelir
function handleRecord() {
  recordService.  // ← getById, save, delete
}

// form. yazınca sadece form API'sı gelir
function handleForm() {
  form.  // ← open, close, getValue, setValue
}
```

## API Referansı

### MonacoIntelliSenseProvider

#### Constructor
```typescript
new MonacoIntelliSenseProvider(monaco: any, staticDefsPath?: string)
```

#### Methods

##### `initialize()`
Provider'ı başlatır ve varsayılan servisleri yükler.

##### `configureEditor(editor: any)`
Editor'ı varsayılan önerileri kapatacak şekilde yapılandırır.

##### `addLib(binding: GlobalBinding)`
Yeni bir servis ekler.

```typescript
interface GlobalBinding {
  name: string;        // Global değişken adı
  value: any;          // Runtime değeri
  definition: string;  // TypeScript .d.ts tanımı
}
```

##### `dispose()`
Provider'ı temizler ve kaynakları serbest bırakır.

### MonacoContextRegistry

#### `setThisContext(context: ThisContext)`
`this.` yazıldığında görünecek context'i ayarlar.

```typescript
interface ThisContext {
  [key: string]: any;  // Method veya property
}
```

## Özelleştirme

### Yeni Servis Ekleme

```typescript
// 1. Servisi tanımla
private myService = {
  fetchData: async (url: string) => [],
  clearCache: () => {}
};

// 2. IntelliSense'e ekle
this.intelliSenseProvider.addLib({
  name: 'myService',
  value: this.myService,
  definition: `declare global {
    var myService: {
      fetchData(url: string): Promise<any[]>;
      clearCache(): void;
    };
  } export {};`
});
```

### this. Context'ini Güncelleme

```typescript
// Mevcut context'i al
const currentContext = registry.getThisContext();

// Yeni property ekle
currentContext.newProperty = 'value';
currentContext.newMethod = () => {};

// Context'i güncelle
registry.setThisContext(currentContext);
```

## Avantajlar

1. **Temiz Deneyim**: Sadece gerekli API'lar görünür
2. **Hızlı Geliştirme**: Otomatik tamamlama ile hızlı kod yazma
3. **Hata Azaltma**: Yanlış API kullanımını önler
4. **Sürdürülebilirlik**: Yeni API eklemek çok kolay
5. **Performans**: Gereksiz öneriler yüklenmez

## Notlar

- `noLib: true` ayarı sayesinde sadece sizin ExtraLib'leriniz kullanılır
- Custom completion provider sadece `this.` için çalışır
- Varsayılan öneriler tamamen kapatılmıştır
- TypeScript tip kontrolü aktif kalır

## Sorun Giderme

### Öneriler görünmüyor
- `configureEditor()` çağrıldığından emin olun
- `addLib()` ile servislerin eklendiğini kontrol edin
- `setThisContext()` ile this context'inin ayarlandığını doğrulayın

### Hala varsayılan öneriler geliyor
- `noLib: true` ayarının aktif olduğunu kontrol edin
- `wordBasedSuggestions: 'off'` ayarını doğrulayın
- Editor'ı yeniden başlatmayı deneyin 
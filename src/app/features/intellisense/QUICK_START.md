# 🚀 Hızlı Başlangıç - Controlled IntelliSense (Gelişmiş)

Bu rehber, Monaco Editor'da **sadece belirlediğiniz API'ların** görünmesini sağlayan controlled IntelliSense yaklaşımını 5 dakikada implement etmenizi sağlar.

## 📋 Gereksinimler

- Angular projesi
- Monaco Editor kurulu
- `MonacoIntelliSenseProvider` dosyası
- `IntelliSenseManifestLoader` (yeni!)
- `CompositeDisposable` (yeni!)

## ⚡ 5 Dakikalık Kurulum

### 1. Component Oluştur (1 dk)

```typescript
// my-editor.component.ts
import { AfterViewInit, Component, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { MonacoIntelliSenseProvider } from './monaco-intellisense.provider';
import { IntelliSenseManifestLoader } from './intellisense-manifest';
import { AutoDisposable } from './composite-disposable';

declare const monaco: any;

@Component({
  selector: 'app-my-editor',
  template: `<div #editorHost style="height:400px; border:1px solid #ccc;"></div>`
})
export class MyEditorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('editorHost') editorHost!: ElementRef;
  
  @AutoDisposable()
  private intelliSenseProvider!: MonacoIntelliSenseProvider;

  constructor(private manifestLoader: IntelliSenseManifestLoader) {}

  async ngAfterViewInit() {
    // Editor oluştur
    this.editor = monaco.editor.create(this.editorHost.nativeElement, {
      value: '// Kodunuzu buraya yazın\n',
      language: 'javascript'
    });

    // IntelliSense başlat (manifest ile)
    this.intelliSenseProvider = new MonacoIntelliSenseProvider(
      monaco, 
      undefined, 
      this.manifestLoader
    );
    await this.intelliSenseProvider.initialize();
    this.intelliSenseProvider.configureEditor(this.editor);
  }

  ngOnDestroy() {
    // AutoDisposable decorator otomatik dispose eder
  }
}
```

### 2. Servislerinizi Tanımlayın (2 dk)

```typescript
// Component içine ekleyin
private recordService = {
  getById: (id: number) => ({ id, name: 'Record' }),
  save: (data: any) => true,
  delete: (id: number) => true
};

private formApi = {
  open: (code: string) => {},
  close: () => {},
  getValue: (field: string) => '',
  setValue: (field: string, value: any) => {}
};

// this. context'i
private thisContext = {
  userName: 'User',
  hasPermission: (perm: string) => true,
  recordService: this.recordService,
  form: this.formApi
};
```

### 3. IntelliSense'e Ekleyin (1 dk)

```typescript
// ngAfterViewInit içine ekleyin
this.intelliSenseProvider.addLib({
  name: 'recordService',
  value: this.recordService,
  definition: `declare global {
    var recordService: {
      getById(id: number): any;
      save(data: any): boolean;
      delete(id: number): boolean;
    };
  } export {};`
});

this.intelliSenseProvider.addLib({
  name: 'form',
  value: this.formApi,
  definition: `declare global {
    var form: {
      open(code: string): void;
      close(): void;
      getValue(field: string): any;
      setValue(field: string, value: any): void;
    };
  } export {};`
});

// this context'i ayarla
const registry = (this.intelliSenseProvider as any).registry;
registry.setThisContext(this.thisContext);
```

### 4. Test Edin (1 dk)

Editor'da şunları deneyin:

```javascript
// this. yazınca context önerileri gelir
function test() {
  this.  // ← userName, hasPermission, recordService, form
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

## ✅ Tamamlandı!

Artık Monaco Editor'ınızda:
- ✅ Sadece belirlediğiniz API'lar görünür
- ✅ `this.` yazınca context-specific öneriler gelir
- ✅ Varsayılan JavaScript önerileri kapalı
- ✅ Temiz ve kontrollü IntelliSense deneyimi
- ✅ **Manifest tabanlı static loading** (yeni!)
- ✅ **Otomatik memory management** (yeni!)

## 🔧 Yeni Özellikler

### **1. Manifest Tabanlı Loading**

```typescript
// assets/intellisense/defs.manifest.json
{
  "version": "1.0.0",
  "files": [
    {
      "path": "lib/core.d.ts",
      "sha256": "a1b2c3d4...",
      "priority": 100
    }
  ]
}

// Component'te kullanım
constructor(private manifestLoader: IntelliSenseManifestLoader) {}

async ngAfterViewInit() {
  // Manifest otomatik yüklenir
  this.intelliSenseProvider = new MonacoIntelliSenseProvider(
    monaco, 
    undefined, 
    this.manifestLoader  // ← Manifest loader geç
  );
}
```

### **2. Otomatik Memory Management**

```typescript
// @AutoDisposable decorator ile otomatik cleanup
@AutoDisposable()
private intelliSenseProvider!: MonacoIntelliSenseProvider;

// ngOnDestroy'da otomatik dispose edilir
ngOnDestroy() {
  // Hiçbir şey yazmaya gerek yok!
}
```

### **3. CompositeDisposable ile Manuel Yönetim**

```typescript
import { DisposableManager } from './composite-disposable';

export class MyComponent {
  private disposables = new DisposableManager();

  addCustomProvider() {
    const disposable = monaco.languages.registerHoverProvider('javascript', provider);
    this.disposables.add(disposable);
  }

  ngOnDestroy() {
    this.disposables.dispose(); // Tüm disposables temizlenir
  }
}
```

## 🎯 Özelleştirme

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

### Static Definition Ekleme

```typescript
// 1. .d.ts dosyası oluştur
// assets/intellisense/app/my-api.d.ts
declare global {
  var myApi: {
    process(data: any): Promise<any>;
    validate(input: string): boolean;
  };
}
export {};

// 2. Manifest'e ekle
{
  "path": "app/my-api.d.ts",
  "sha256": "calculated-sha256-hash",
  "priority": 50
}

// 3. Otomatik yüklenir!
```

### this. Context'ini Güncelleme

```typescript
// Mevcut context'i al ve güncelle
const currentContext = registry.getThisContext();
currentContext.newProperty = 'value';
currentContext.newMethod = () => {};
registry.setThisContext(currentContext);
```

## 🎯 Örnek Kullanım Senaryoları

### Senaryo 1: Form Builder
```javascript
// this. yazınca:
this.createField()     // Form field oluştur
this.setValidation()   // Validation kuralları
this.getFormData()     // Form verilerini al
```

### Senaryo 2: Data Service
```javascript
// dataService. yazınca:
dataService.query()      // SQL sorgusu
dataService.execute()    // SQL çalıştır
dataService.transaction() // Transaction başlat
```

### Senaryo 3: UI Controller
```javascript
// uiController. yazınca:
uiController.showModal()    // Modal göster
uiController.hideModal()    // Modal gizle
uiController.updateProgress() // Progress güncelle
```

## 🚨 Sorun Giderme

### Öneriler görünmüyor
```typescript
// 1. Provider'ın başlatıldığından emin olun
await this.intelliSenseProvider.initialize();

// 2. Editor'ın yapılandırıldığını kontrol edin
this.intelliSenseProvider.configureEditor(this.editor);

// 3. Servislerin eklendiğini doğrulayın
this.intelliSenseProvider.addLib({...});
```

### Manifest yüklenmiyor
```typescript
// 1. HttpClient'ın import edildiğini kontrol edin
import { HttpClientModule } from '@angular/common/http';

// 2. Manifest dosyasının doğru yerde olduğunu kontrol edin
// assets/intellisense/defs.manifest.json

// 3. SHA256 hash'lerin doğru olduğunu kontrol edin
```

### Memory leak
```typescript
// 1. @AutoDisposable decorator kullanın
@AutoDisposable()
private provider!: MonacoIntelliSenseProvider;

// 2. Veya manuel dispose edin
ngOnDestroy() {
  this.provider.dispose();
}
```

## 📚 Sonraki Adımlar

1. **JSDoc Desteği**: Tip tanımlarına açıklama ekleyin
2. **Hover Bilgisi**: Method açıklamalarını gösterin
3. **Snippet Desteği**: Otomatik parametre yerleştirme
4. **Validation**: Tip kontrolü ve hata gösterimi
5. **Plugin Sistemi**: Angular DI ile dinamik API ekleme

---

**🎉 Tebrikler!** Artık Monaco Editor'ınızda **büyük ölçekte sürdürülebilir** controlled IntelliSense deneyimi yaşıyorsunuz. 
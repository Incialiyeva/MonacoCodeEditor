# 🚀 Hızlı Başlangıç - Controlled IntelliSense

Bu rehber, Monaco Editor'da **sadece belirlediğiniz API'ların** görünmesini sağlayan controlled IntelliSense yaklaşımını 5 dakikada implement etmenizi sağlar.

## 📋 Gereksinimler

- Angular projesi
- Monaco Editor kurulu
- `MonacoIntelliSenseProvider` dosyası

## ⚡ 5 Dakikalık Kurulum

### 1. Component Oluştur (1 dk)

```typescript
// my-editor.component.ts
import { AfterViewInit, Component, ViewChild, ElementRef } from '@angular/core';
import { MonacoIntelliSenseProvider } from './monaco-intellisense.provider';

declare const monaco: any;

@Component({
  selector: 'app-my-editor',
  template: `<div #editorHost style="height:400px; border:1px solid #ccc;"></div>`
})
export class MyEditorComponent implements AfterViewInit {
  @ViewChild('editorHost') editorHost!: ElementRef;
  
  private editor!: any;
  private intelliSenseProvider!: MonacoIntelliSenseProvider;

  async ngAfterViewInit() {
    // Editor oluştur
    this.editor = monaco.editor.create(this.editorHost.nativeElement, {
      value: '// Kodunuzu buraya yazın\n',
      language: 'javascript'
    });

    // IntelliSense başlat
    this.intelliSenseProvider = new MonacoIntelliSenseProvider(monaco);
    this.intelliSenseProvider.initialize();
    this.intelliSenseProvider.configureEditor(this.editor);
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

## 🔧 Özelleştirme

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
// Mevcut context'i al ve güncelle
const currentContext = registry.getThisContext();
currentContext.newProperty = 'value';
currentContext.newMethod = () => {};
registry.setThisContext(currentContext);
```

## 🎯 Örnek Kullanım Senaryoları

### Senaryo 1: Form Builder
```typescript
private formBuilder = {
  createField: (type: string) => {},
  setValidation: (field: string, rules: any) => {},
  getFormData: () => ({})
};

// this. yazınca: createField, setValidation, getFormData görünür
```

### Senaryo 2: Data Service
```typescript
private dataService = {
  query: (sql: string) => [],
  execute: (sql: string) => true,
  transaction: (callback: Function) => {}
};

// dataService. yazınca: query, execute, transaction görünür
```

### Senaryo 3: UI Controller
```typescript
private uiController = {
  showModal: (id: string) => {},
  hideModal: (id: string) => {},
  updateProgress: (percent: number) => {}
};

// uiController. yazınca: showModal, hideModal, updateProgress görünür
```

## 🚨 Sorun Giderme

### Öneriler görünmüyor
```typescript
// 1. Provider'ın başlatıldığından emin olun
this.intelliSenseProvider.initialize();

// 2. Editor'ın yapılandırıldığını kontrol edin
this.intelliSenseProvider.configureEditor(this.editor);

// 3. Servislerin eklendiğini doğrulayın
this.intelliSenseProvider.addLib({...});
```

### Hala varsayılan öneriler geliyor
```typescript
// Editor ayarlarını kontrol edin
this.editor.updateOptions({
  quickSuggestions: false,
  wordBasedSuggestions: 'off',
  snippetSuggestions: 'none'
});
```

## 📚 Sonraki Adımlar

1. **JSDoc Desteği**: Tip tanımlarına açıklama ekleyin
2. **Hover Bilgisi**: Method açıklamalarını gösterin
3. **Snippet Desteği**: Otomatik parametre yerleştirme
4. **Validation**: Tip kontrolü ve hata gösterimi

---

**🎉 Tebrikler!** Artık Monaco Editor'ınızda tam kontrollü IntelliSense deneyimi yaşıyorsunuz. 
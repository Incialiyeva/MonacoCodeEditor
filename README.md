# Monaco Editor + Prettier Integration in Angular

Bu rehber, Angular projenizde **Monaco Editor** ve **Prettier** entegrasyonunu nasıl kuracağınızı açıklar.

## 🚀 Özellikler

- ✨ **Monaco Editor** entegrasyonu
- 🎨 **Prettier** ile otomatik kod formatlaması
- 🔍 **IntelliSense** ve otomatik tamamlama
- 📁 **Dosya yükleme/indirme** desteği
- 🔄 **Diff görüntüleme** özelliği
- 💾 **Kaydetme ve geri alma** işlemleri
- 🌙 **Tema desteği** (Açık/Koyu)
- 📝 **Çoklu dil desteği** (JavaScript, HTML, SQL)

---

## 📋 Gereksinimler

- Node.js (v14 veya üzeri)
- Angular CLI
- Temel Angular/TypeScript bilgisi

---

## 🔧 Monaco Editor Kurulumu

### 1. Paketi Yükleyin
```bash
npm install monaco-editor
```

### 2. Angular Yapılandırması
`angular.json` dosyasına assets ekleyin:
```json
{
  "assets": [
    {
      "glob": "**/*",
      "input": "node_modules/monaco-editor/min/vs",
      "output": "assets/monaco/vs"
    }
  ]
}
```

### 3. Component Oluşturun
```html
<div #editorContainer style="height: 400px; width: 100%;"></div>
```

### 4. TypeScript Kodunu Ekleyin
```typescript
import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';

declare global {
  interface Window {
    require: any;
    monaco: any;
  }
}

@Component({
  selector: 'app-monaco-editor',
  templateUrl: './monaco-editor.component.html'
})
export class MonacoEditorComponent implements AfterViewInit {
  @ViewChild('editorContainer', { static: true }) editorContainer!: ElementRef<HTMLDivElement>;
  editor: any;

  ngAfterViewInit() {
    if (typeof window.require === 'function') {
      window.require.config({ paths: { 'vs': '/assets/monaco/vs' } });
      window.require(['vs/editor/editor.main'], () => {
        this.initializeEditor();
      });
    }
  }

  private initializeEditor() {
    this.editor = window.monaco.editor.create(this.editorContainer.nativeElement, {
      value: 'console.log("Hello World!");',
      language: 'javascript',
      theme: 'vs-dark',
      automaticLayout: true,
    });
  }
}
```

### 5. Temel Ayarları Yapın
```typescript
// Dil desteği
language: 'javascript' | 'html' | 'sql' | 'typescript' | 'json'

// Tema seçenekleri
theme: 'vs-dark' | 'vs-light' | 'hc-black'

// Otomatik düzen
automaticLayout: true
```

### 6. Hata Kontrolü
- Console'da Monaco yükleme hatalarını kontrol edin
- Assets klasörünün doğru yapılandırıldığını doğrulayın
- Development server'ı yeniden başlatın

---

## 🎨 Prettier Kurulumu

### 1. Prettier Paketlerini Yükleyin
```bash
npm install prettier prettier/standalone prettier/plugins/babel prettier/plugins/estree
```

### 2. Import'ları Ekleyin
```typescript
import * as prettier from 'prettier/standalone';
import * as parserBabel from 'prettier/plugins/babel';
import * as parserEstree from 'prettier/plugins/estree';
```

### 3. Format Fonksiyonu Oluşturun
```typescript
async formatCode(): Promise<void> {
  if (this.editor) {
    try {
      const code = this.editor.getValue();
      const formatted = await prettier.format(code, {
        parser: 'babel',
        plugins: [parserBabel, parserEstree],
        semi: true,
        singleQuote: true,
      });
      this.editor.setValue(formatted);
    } catch (error) {
      console.error('Format error:', error);
    }
  }
}
```

### 4. Buton Ekleyin
```html
<button (click)="formatCode()">Format Code</button>
```

### 5. Parser Ayarlarını Yapın
```typescript
// JavaScript için
parser: 'babel'

// HTML için
parser: 'html'

// JSON için
parser: 'json'
```

### 6. Prettier Ayarlarını Özelleştirin
```typescript
const prettierOptions = {
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  printWidth: 80,
  trailingComma: 'es5'
};
```

---

## ⚙️ Özelleştirme Ayarları

### 1. Klavye Kısayolu Ekleme
```typescript
this.editor.addAction({
  id: 'format-document',
  label: 'Format Document',
  keybindings: [
    window.monaco.KeyMod.CtrlCmd | window.monaco.KeyMod.Shift | window.monaco.KeyCode.KeyF
  ],
  run: async (ed: any) => {
    await this.formatCode();
  }
});
```

### 2. IntelliSense Ekleme
```typescript
window.monaco.languages.typescript.javascriptDefaults.addExtraLib(`
declare var myGlobalFunction: () => void;
`, 'global-types.d.ts');
```

### 3. Özel Tema Oluşturma
```typescript
window.monaco.editor.defineTheme('my-theme', {
  base: 'vs-dark',
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#1e1e1e',
    'editor.foreground': '#d4d4d4'
  }
});
```

### 4. Dil Desteği Ekleme
```typescript
// Yeni dil için
language: 'python' | 'java' | 'cpp' | 'csharp'
```

### 5. Tema Değiştirme
```typescript
toggleTheme(): void {
  const currentTheme = this.editor.getOption(window.monaco.editor.EditorOption.theme);
  const newTheme = currentTheme === 'vs-dark' ? 'vs-light' : 'vs-dark';
  window.monaco.editor.setTheme(newTheme);
}
```

### 6. Editor Ayarları
```typescript
// Otomatik tamamlama
quickSuggestions: true,

// Satır numaraları
lineNumbers: 'on',

// Minimap
minimap: { enabled: true },

// Word wrap
wordWrap: 'on'
```

---

## 🧠 IntelliSense Sistemi - Nasıl Çalışır?

Bu proje, Monaco Editor için gelişmiş bir IntelliSense (otomatik tamamlama) sistemi içerir. Sistem, `this.` context'inde runtime objelerinizi otomatik olarak önerir.

### 📁 Sistem Mimarisi

```
src/app/intellisense/
├── core/                    # Temel altyapı
│   ├── registry/           # Obje kayıt sistemi
│   │   ├── this-api-registry.service.ts    # Ana registry
│   │   └── runtime-globals.ts              # Toplu kayıt helper
│   ├── providers/          # Monaco provider'ları
│   │   ├── this-only-provider.ts           # this. context
│   │   └── root-only-provider.ts           # root. context
│   └── di/                 # Dependency injection
│       └── this-globals.token.ts           # DI token'ları
└── languages/              # Dil desteği
    ├── monaco-intellisense.provider.ts     # HTML/SQL desteği
    └── README.md                           # Dil dokümantasyonu
```

### 🔄 Çalışma Adımları

#### **Adım 1: Global Objeleri Tanımlayın**
```typescript
// app.config.ts
import { provideThisGlobal } from './intellisense/core/di/this-globals.token';

const api = {
  baseUrl: 'https://api.example.com',
  async get(endpoint: string) { /* ... */ },
  async post(endpoint: string, data: any) { /* ... */ }
};

const form = {
  getValue(field: string) { /* ... */ },
  setValue(field: string, value: any) { /* ... */ }
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideThisGlobal('api', api),
    provideThisGlobal('form', form)
  ]
};
```

#### **Adım 2: Monaco Editor Başlatılır**
```typescript
// monaco-editor-core.ts
export class MonacoEditorCore {
  constructor(
    @Optional() @Inject(THIS_GLOBALS) private injectedGlobals: Array<Record<string, any>> = []
  ) {
    // DI'dan gelen global objeler otomatik olarak alınır
  }

  initializeMonaco() {
    // 1. ThisApiRegistry oluşturulur
    this.thisApiRegistry = new ThisApiRegistry();
    
    // 2. Global objeler registry'ye kaydedilir
    registerRuntimeGlobals(diGlobals, {
      emitDts: true,
      monaco: window.monaco,
      registry: this.thisApiRegistry
    });
    
    // 3. Provider'lar kaydedilir
    this.thisProviderDisposable = registerThisOnlyProvider(window.monaco, this.thisApiRegistry);
    this.rootProviderDisposable = registerRootOnlyProvider(window.monaco, this.thisApiRegistry);
  }
}
```

#### **Adım 3: Kullanıcı Kod Yazmaya Başlar**
```javascript
// Kullanıcı bu kodu yazmaya başlar:
this.api.

// Provider otomatik olarak tetiklenir ve öneriler gösterilir:
// - get(endpoint: string)
// - post(endpoint: string, data: any)
// - baseUrl: string
```

#### **Adım 4: Provider Çalışır**
```typescript
// this-only-provider.ts
export function registerThisOnlyProvider(monaco, registry) {
  return monaco.languages.registerCompletionItemProvider('javascript', {
    provideCompletionItems(model, position) {
      const line = model.getLineContent(position.lineNumber).slice(0, position.column);
      
      // this.<prefix> kalıbını yakala
      const root = line.match(/\bthis\.(\w*)$/);
      if (root) {
        const prefix = root[1] ?? '';
        const roots = registry.getRootNames(); // ['api', 'form', ...]
        
        // Filtreleme ve öneri oluşturma
        const labels = prefix ? roots.filter(r => r.startsWith(prefix)) : roots;
        return { suggestions: labels.map(name => ({ label: name, ... })) };
      }
      
      // this.obj.<prefix> kalıbını yakala
      const mem = line.match(/\bthis\.(\w+)\.(\w*)$/);
      if (mem) {
        const [, obj, prefix = ''] = mem;
        const items = registry.getMembers(obj, monaco); // Obje üyelerini al
        return { suggestions: items };
      }
    }
  });
}
```

#### **Adım 5: Registry Obje Bilgilerini Sağlar**
```typescript
// this-api-registry.service.ts
export class ThisApiRegistry {
  private objects = new Map<string, ThisObjectDef>();
  
  getMembers(objName: string, monaco) {
    const objDef = this.objects.get(objName);
    if (!objDef) return [];
    
    const suggestions = [];
    
    // Metodları ekle
    Object.entries(objDef.methods || {}).forEach(([name, method]) => {
      suggestions.push({
        label: name,
        kind: monaco.languages.CompletionItemKind.Method,
        insertText: `${name}(${method.sig})`,
        detail: method.doc
      });
    });
    
    // Property'leri ekle
    Object.entries(objDef.props || {}).forEach(([name, prop]) => {
      suggestions.push({
        label: name,
        kind: monaco.languages.CompletionItemKind.Property,
        insertText: name,
        detail: prop.doc
      });
    });
    
    return suggestions;
  }
}
```

### 🎯 Özellikler

- **Otomatik Tip Çıkarma**: Runtime objelerden otomatik olarak tip bilgisi çıkarılır
- **Parametre Önerileri**: Fonksiyon parametreleri otomatik olarak algılanır
- **Dinamik Güncelleme**: Objeler runtime'da değiştiğinde öneriler güncellenir
- **Çoklu Dil Desteği**: JavaScript, HTML, SQL için özel provider'lar
- **Güvenlik**: Sadece kayıtlı objeler önerilir, güvenlik filtresi var

### 🔧 Özelleştirme

#### Yeni Global Obje Ekleme
```typescript
// app.config.ts
const newService = {
  async fetchData() { /* ... */ },
  processData(data: any) { /* ... */ }
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideThisGlobal('newService', newService)
  ]
};
```

#### Özel Provider Ekleme
```typescript
// Yeni bir provider oluşturun
export function registerCustomProvider(monaco, registry) {
  return monaco.languages.registerCompletionItemProvider('javascript', {
    provideCompletionItems(model, position) {
      // Özel mantık
    }
  });
}
```

---

## 🔄 Diff View ve Readonly Özellikleri

Bu proje, Monaco Editor'ın diff view ve readonly özelliklerini destekler.

### 📊 Diff View (Fark Görüntüleme)

#### **Temel Kullanım**
```typescript
// Diff view oluşturma
export class DiffViewService {
  createDiffView(originalCode: string, modifiedCode: string, container: HTMLElement) {
    const diffEditor = window.monaco.editor.createDiffEditor(container, {
      renderSideBySide: true,        // Yan yana görüntüleme
      enableSplitViewResizing: true, // Boyutlandırma
      automaticLayout: true,
      theme: 'vs-dark',
      
      originalEditor: {
        readOnly: true,              // Orijinal kod readonly
        lineNumbers: 'on'
      },
      modifiedEditor: {
        readOnly: false,             // Değiştirilmiş kod düzenlenebilir
        lineNumbers: 'on'
      }
    });

    // Kodları ayarla
    diffEditor.setModel({
      original: window.monaco.editor.createModel(originalCode, 'javascript'),
      modified: window.monaco.editor.createModel(modifiedCode, 'javascript')
    });

    return diffEditor;
  }
}
```

#### **Temel Ayarlar**
```typescript
const diffOptions = {
  renderSideBySide: true,           // Yan yana görüntüleme
  renderOverviewRuler: true,        // Sağ tarafta overview
  enableSplitViewResizing: true,    // Split view boyutlandırma
  ignoreTrimWhitespace: false,      // Boşlukları dikkate al
  automaticLayout: true,            // Otomatik boyutlandırma
  theme: 'vs-dark'                  // Tema
};
```

#### **Event Dinleme**
```typescript
// Değişiklikleri dinle
diffEditor.onDidUpdateDiff(() => {
  const changes = diffEditor.getLineChanges();
  console.log('Değişiklik sayısı:', changes?.length || 0);
});

// Model değişikliklerini dinle
diffEditor.getModifiedEditor().onDidChangeModelContent(() => {
  console.log('Kod güncellendi');
});
```

### 🔒 Readonly Özellikleri

#### **Temel Readonly**
```typescript
// Readonly editor oluşturma
const readonlyEditor = window.monaco.editor.create(container, {
  value: code,
  language: 'javascript',
  theme: 'vs-dark',
  automaticLayout: true,
  
  readOnly: true,                    // Tamamen readonly
  readOnlyMessage: {                 // Readonly mesajı
    value: 'Bu dosya salt okunur modda'
  },
  
  lineNumbers: 'on',                 // Satır numaraları
  minimap: { enabled: true },        // Minimap
  wordWrap: 'on',                    // Kelime kaydırma
  folding: true                      // Kod katlama
});
```

#### **Koşullu Readonly**
```typescript
// Readonly durumunu değiştir
editor.updateOptions({ readOnly: true });

// Readonly mesajını güncelle
editor.updateOptions({
  readOnlyMessage: { value: 'Salt okunur mod' }
});
```

#### **Bölgesel Readonly**
```typescript
// Belirli satırları readonly yap
const decorations = model.deltaDecorations([], [{
  range: new window.monaco.Range(startLine, 1, endLine, 1),
  options: {
    isWholeLine: true,
    className: 'readonly-line'
  }
}]);
```

#### **Readonly CSS**
```scss
.readonly-line {
  background-color: rgba(255, 0, 0, 0.1) !important;
  opacity: 0.7;
}

.monaco-editor.readonly .cursor {
  display: none !important;
}
```

### 🔧 Kombine Kullanım

#### **Readonly Diff View**
```typescript
// Her iki tarafı da readonly yap
const diffEditor = window.monaco.editor.createDiffEditor(container, {
  renderSideBySide: true,
  automaticLayout: true,
  theme: 'vs-dark',
  
  originalEditor: {
    readOnly: true,
    readOnlyMessage: { value: 'Orijinal kod - Salt okunur' }
  },
  modifiedEditor: {
    readOnly: true,
    readOnlyMessage: { value: 'Değiştirilmiş kod - Salt okunur' }
  }
});
```

---

## ⚠️ Sıkça Yaşanan Sorunlar

### 1. Monaco Yüklenmiyor
**Sorun:** Monaco Editor yüklenmiyor veya hata veriyor.

**Çözümler:**
1. `angular.json` dosyasındaki assets yapılandırmasını kontrol edin
2. `node_modules/monaco-editor/min/vs` klasörünün var olduğunu doğrulayın
3. Development server'ı yeniden başlatın: `ng serve`
4. Browser cache'ini temizleyin
5. Monaco'nun yüklenmesini bekleyin (console'da hata var mı kontrol edin)

### 2. Prettier Plugin Hatası
**Sorun:** Prettier plugin'leri yüklenmiyor.

**Çözümler:**
1. Plugin'leri yeniden yükleyin:
```bash
npm install prettier/plugins/babel prettier/plugins/estree --save
```

2. Tüm prettier paketlerini yeniden yükleyin:
```bash
npm uninstall prettier
npm install prettier prettier/standalone prettier/plugins/babel prettier/plugins/estree
```

3. Import'ları kontrol edin:
```typescript
import * as prettier from 'prettier/standalone';
import * as parserBabel from 'prettier/plugins/babel';
import * as parserEstree from 'prettier/plugins/estree';
```

4. Parser ayarlarını kontrol edin
5. Try-catch bloğu kullanın

### 3. TypeScript Hataları
**Sorun:** TypeScript tip hataları alıyorsunuz.

**Çözümler:**
1. Component'te declare kullanın:
```typescript
declare const monaco: any;
```

2. Global interface ekleyin:
```typescript
declare global {
  interface Window {
    require: any;
    monaco: any;
  }
}
```

3. tsconfig.json'a types ekleyin:
```json
{
  "compilerOptions": {
    "types": ["node"]
  }
}
```

4. @types/monaco-editor yükleyin:
```bash
npm install @types/monaco-editor --save-dev
```

5. any tipini geçici olarak kullanın

### 4. Editor Görünmüyor
**Sorun:** Editor container'ı boş görünüyor.

**Çözümler:**
1. Container'a yükseklik verin:
```css
.editor-container { height: 400px; }
```

2. automaticLayout: true ayarını kontrol edin
3. Container'ın display: none olmadığından emin olun
4. CSS z-index sorunlarını kontrol edin
5. Monaco'nun yüklenmesini bekleyin

### 5. Format Çalışmıyor
**Sorun:** Prettier formatlama çalışmıyor.

**Çözümler:**
1. Prettier ayarlarını kontrol edin
2. Parser'ı doğru seçin:
```typescript
parser: 'babel' // JavaScript için
parser: 'html'   // HTML için
parser: 'json'   // JSON için
```

3. Plugin'leri doğru import edin
4. Try-catch bloğu kullanın
5. Console'da hataları kontrol edin

### 6. Performans Sorunları
**Sorun:** Editor yavaş çalışıyor.

**Çözümler:**
1. Büyük dosyalar için lazy loading kullanın
2. Monaco worker'larını optimize edin
3. Gereksiz özellikleri devre dışı bırakın
4. Memory leak'leri kontrol edin
5. Editor'ü destroy ederken temizlik yapın

### 7. IntelliSense Çalışmıyor
**Sorun:** IntelliSense önerileri gelmiyor.

**Çözümler:**
1. Import path'lerini kontrol edin:
```typescript
import { provideThisGlobal } from './intellisense/core/di/this-globals.token';
```

2. Provider'ların doğru kaydedildiğini kontrol edin
3. Global objelerin DI'da tanımlandığını doğrulayın
4. Monaco'nun tamamen yüklendiğinden emin olun
5. Console'da provider hatalarını kontrol edin

---

## 📚 Faydalı Kaynaklar

- [Monaco Editor Dokümantasyon](https://microsoft.github.io/monaco-editor/)
- [Prettier Dokümantasyon](https://prettier.io/docs/en/)
- [Angular CLI](https://angular.dev/tools/cli)

---

Bu kurulum ile Angular projenizde profesyonel bir kod editörü deneyimi elde edebilirsiniz! 🚀

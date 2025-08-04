# MonacoEditorApp

Bu proje, **Monaco Editor** ve **Prettier** entegrasyonu ile gelişmiş bir kod editörü deneyimi sunar. Angular tabanlı bu uygulama, gerçek zamanlı kod formatlaması, IntelliSense desteği ve çoklu dil desteği ile profesyonel bir geliştirme ortamı sağlar.

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

# 🧠 Monaco Editor + Prettier Entegrasyonu Rehberi

Bu rehber, Angular projenizde **Monaco Editor** ve **Prettier** entegrasyonunu adım adım nasıl kuracağınızı açıklar.

## 📋 Gereksinimler

- Node.js (v14 veya üzeri)
- Angular CLI
- Temel Angular bilgisi

---

## ✨ 1. Monaco Editor Kurulumu

### 📦 Adım 1: Bağımlılıkları Yükleyin

Terminal'de proje klasörünüze gidin ve şu komutları çalıştırın:

```bash
# Monaco Editor'ı yükleyin
npm install monaco-editor

# Webpack plugin'ini geliştirme bağımlılığı olarak yükleyin
npm install monaco-editor-webpack-plugin --save-dev
```

### ⚙️ Adım 2: Angular Yapılandırması

`angular.json` dosyasını açın ve `assets` bölümüne şu yapılandırmayı ekleyin:

```json
{
  "projects": {
    "your-project-name": {
      "architect": {
        "build": {
          "options": {
            "assets": [
              "src/favicon.ico",
              "src/assets",
              {
                "glob": "**/*",
                "input": "node_modules/monaco-editor/min/vs",
                "output": "assets/monaco/vs"
              }
            ]
          }
        }
      }
    }
  }
}
```

### 🧱 Adım 3: Component'e Editor Ekleyin

**HTML Template'inizde (`component.html`):**

```html
<div class="editor-container">
  <div #editorContainer style="height: 400px; width: 100%; border: 1px solid #ccc;"></div>
</div>
```

**TypeScript Component'inizde (`component.ts`):**

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
  templateUrl: './monaco-editor.component.html',
  styleUrls: ['./monaco-editor.component.scss']
})
export class MonacoEditorComponent implements AfterViewInit {
  @ViewChild('editorContainer', { static: true }) editorContainer!: ElementRef<HTMLDivElement>;
  editor: any;

  ngAfterViewInit() {
    // Monaco'nun yüklenmesini bekleyin
    if (typeof window.require === 'function') {
      window.require.config({ paths: { 'vs': '/assets/monaco/vs' } });
      
      window.require(['vs/editor/editor.main'], () => {
        this.initializeEditor();
      });
    }
  }

  private initializeEditor() {
    this.editor = window.monaco.editor.create(this.editorContainer.nativeElement, {
      value: 'console.log("Merhaba Dünya!");',
      language: 'javascript',
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: true },
      fontSize: 14,
      lineNumbers: 'on',
      roundedSelection: false,
      scrollBeyondLastLine: false,
      readOnly: false,
      cursorStyle: 'line',
      automaticLayout: true,
    });
  }
}
```

### 🎨 Adım 4: Dil ve Tema Seçenekleri

**Dil değiştirme:**
```typescript
// JavaScript
language: 'javascript'

// TypeScript
language: 'typescript'

// HTML
language: 'html'

// SQL
language: 'sql'

// JSON
language: 'json'

// CSS
language: 'css'
```

**Tema değiştirme:**
```typescript
// Koyu tema
theme: 'vs-dark'

// Açık tema
theme: 'vs-light'

// Yüksek kontrast
theme: 'hc-black'
```

### 🧠 Adım 5: IntelliSense Ekleme

Global tip tanımları eklemek için:

```typescript
// Monaco yüklendikten sonra
window.monaco.languages.typescript.javascriptDefaults.addExtraLib(`
declare var myGlobalFunction: () => void;
declare var myGlobalVariable: string;
`, 'global-types.d.ts');
```

---

## 🎯 2. Prettier Entegrasyonu

### 📦 Adım 1: Prettier ve Plugin'leri Yükleyin

```bash
# Prettier'ı yükleyin
npm install prettier

# Standalone versiyonu ve plugin'leri yükleyin
npm install prettier/standalone prettier/plugins/babel prettier/plugins/estree
```

### ✨ Adım 2: Prettier Format Fonksiyonu Oluşturun

`src/app/utils/prettier-format.util.ts` dosyası oluşturun:

```typescript
import * as prettier from 'prettier/standalone';
import * as parserBabel from 'prettier/plugins/babel';
import * as parserEstree from 'prettier/plugins/estree';

export async function formatWithPrettier(code: string, language: string = 'javascript'): Promise<string> {
  try {
    let parser = 'babel';
    
    // Dil bazlı parser seçimi
    switch (language) {
      case 'html':
        parser = 'html';
        break;
      case 'css':
        parser = 'css';
        break;
      case 'json':
        parser = 'json';
        break;
      case 'sql':
        // SQL için basit formatlama
        return formatSQL(code);
      default:
        parser = 'babel';
    }

    const formatted = await prettier.format(code, {
      parser,
      plugins: [parserBabel, parserEstree],
      semi: true,
      singleQuote: true,
      tabWidth: 2,
      printWidth: 80,
      trailingComma: 'es5',
    });

    return formatted;
  } catch (error) {
    console.error('Prettier formatlama hatası:', error);
    return code; // Hata durumunda orijinal kodu döndür
  }
}

// SQL için basit formatlama
function formatSQL(sql: string): string {
  return sql
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s*=\s*/g, ' = ')
    .replace(/\s*\(\s*/g, ' (')
    .replace(/\s*\)\s*/g, ') ')
    .trim();
}
```

### 🧩 Adım 3: Monaco ile Prettier'ı Birleştirin

Component'inizde format fonksiyonunu ekleyin:

```typescript
import { formatWithPrettier } from '../utils/prettier-format.util';

// Component sınıfına ekleyin
async formatCode(): Promise<void> {
  if (this.editor) {
    try {
      const rawCode = this.editor.getValue();
      const language = this.detectLanguageFromCode(rawCode);
      
      const formatted = await formatWithPrettier(rawCode, language);
      this.editor.setValue(formatted);
      
      console.log('Kod başarıyla formatlandı!');
    } catch (error) {
      console.error('Formatlama hatası:', error);
      alert('Kod formatlanırken hata oluştu!');
    }
  }
}

// Dil tespiti için yardımcı fonksiyon
private detectLanguageFromCode(code: string): string {
  const trimmedCode = code.trim();
  
  if (trimmedCode.startsWith('<!DOCTYPE html') || trimmedCode.includes('<html')) {
    return 'html';
  }
  if (trimmedCode.toLowerCase().includes('select') || trimmedCode.toLowerCase().includes('from')) {
    return 'sql';
  }
  if (trimmedCode.includes('{') && trimmedCode.includes('}') && 
      (trimmedCode.includes('color:') || trimmedCode.includes('background:'))) {
    return 'css';
  }
  
  return 'javascript';
}
```

### 🎮 Adım 4: Format Butonu Ekleyin

HTML template'inize format butonu ekleyin:

```html
<div class="editor-toolbar">
  <button class="format-btn" (click)="formatCode()" title="Kodu Formatla">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" stroke-width="2"/>
      <path d="M8 8h8M8 12h8M8 16h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
    Prettier
  </button>
</div>
```

### ⌨️ Adım 5: Klavye Kısayolu Ekleyin

Monaco Editor'a format kısayolu ekleyin:

```typescript
private initializeEditor() {
  this.editor = window.monaco.editor.create(this.editorContainer.nativeElement, {
    // ... mevcut ayarlar
  });

  // Format kısayolu ekle (Ctrl+Shift+F)
  this.editor.addAction({
    id: 'format-document',
    label: 'Format Document',
    keybindings: [
      window.monaco.KeyMod.CtrlCmd | window.monaco.KeyMod.Shift | window.monaco.KeyCode.KeyF
    ],
    contextMenuGroupId: '1_modification',
    contextMenuOrder: 1.5,
    run: async (ed: any) => {
      await this.formatCode();
    }
  });
}
```

---

## 🛠️ 3. Gelişmiş Özellikler

### 📁 Dosya Yükleme/İndirme

```typescript
// Dosya yükleme
triggerFileUpload(): void {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.js,.html,.sql,.css,.json';
  fileInput.onchange = (event: any) => {
    const file = event.target.files[0];
    if (file) {
      this.loadFileIntoEditor(file);
    }
  };
  fileInput.click();
}

// Dosya indirme
downloadFile(): void {
  const code = this.editor.getValue();
  const blob = new Blob([code], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'code.js';
  link.click();
  window.URL.revokeObjectURL(url);
}
```

### 🔄 Diff Görüntüleme

```typescript
showDiff(): void {
  const original = this.lastSavedCode;
  const modified = this.editor.getValue();
  
  // Monaco diff editor oluştur
  const diffEditor = window.monaco.editor.createDiffEditor(document.getElementById('diff-container'), {
    originalEditable: false,
    readOnly: true,
  });
  
  diffEditor.setModel({
    original: window.monaco.editor.createModel(original, 'javascript'),
    modified: window.monaco.editor.createModel(modified, 'javascript')
  });
}
```

---

## ⚠️ 4. Yaygın Sorunlar ve Çözümleri

### ❌ Monaco Yüklenmiyor
**Sorun:** Monaco Editor yüklenmiyor veya hata veriyor.

**Çözüm:**
1. `angular.json` dosyasındaki assets yapılandırmasını kontrol edin
2. `node_modules/monaco-editor/min/vs` klasörünün var olduğunu doğrulayın
3. Development server'ı yeniden başlatın: `ng serve`

### ❌ Prettier Plugin Hatası
**Sorun:** Prettier plugin'leri yüklenmiyor.

**Çözüm:**
```bash
# Plugin'leri yeniden yükleyin
npm install prettier/plugins/babel prettier/plugins/estree --save

# Veya tüm prettier paketlerini yeniden yükleyin
npm uninstall prettier
npm install prettier prettier/standalone prettier/plugins/babel prettier/plugins/estree
```

### ❌ TypeScript Hataları
**Sorun:** TypeScript tip hataları alıyorsunuz.

**Çözüm:**
```typescript
// tsconfig.json dosyasına ekleyin
{
  "compilerOptions": {
    "types": ["node"]
  }
}

// Veya component'te declare kullanın
declare const monaco: any;
```

---

## 🎨 5. Özelleştirme Seçenekleri

### 🌙 Tema Değiştirme

```typescript
// Tema değiştirme fonksiyonu
toggleTheme(): void {
  const currentTheme = this.editor.getOption(monaco.editor.EditorOption.theme);
  const newTheme = currentTheme === 'vs-dark' ? 'vs-light' : 'vs-dark';
  
  window.monaco.editor.setTheme(newTheme);
  this.editor.updateOptions({ theme: newTheme });
}
```

### 📏 Prettier Ayarları

```typescript
// Prettier ayarlarını özelleştirin
const prettierOptions = {
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  printWidth: 80,
  trailingComma: 'es5',
  bracketSpacing: true,
  arrowParens: 'avoid',
  endOfLine: 'lf'
};
```

### 🎯 Özel IntelliSense

```typescript
// Özel tip tanımları ekleyin
window.monaco.languages.typescript.javascriptDefaults.addExtraLib(`
declare global {
  interface Window {
    myCustomAPI: {
      showMessage(msg: string): void;
      getData(): Promise<any>;
    }
  }
}
`, 'custom-api.d.ts');
```

---

## 🚀 6. Performans Optimizasyonları

### ⚡ Lazy Loading

```typescript
// Monaco'yu lazy load edin
async loadMonaco(): Promise<void> {
  if (typeof window.require === 'function') {
    return new Promise((resolve) => {
      window.require(['vs/editor/editor.main'], () => {
        this.initializeEditor();
        resolve();
      });
    });
  }
}
```

### 🔄 Debounced Formatting

```typescript
// Formatlama işlemini debounce edin
private formatDebounce: any;

async formatCodeDebounced(): Promise<void> {
  clearTimeout(this.formatDebounce);
  this.formatDebounce = setTimeout(() => {
    this.formatCode();
  }, 500);
}
```

---

## ✅ 7. Test Etme

### 🧪 Unit Testler

```typescript
// component.spec.ts
describe('MonacoEditorComponent', () => {
  it('should format code correctly', async () => {
    const component = new MonacoEditorComponent();
    const unformattedCode = 'const x=1;const y=2;';
    const formattedCode = await component.formatCode(unformattedCode);
    
    expect(formattedCode).toContain('const x = 1;');
    expect(formattedCode).toContain('const y = 2;');
  });
});
```

---

## 📚 8. Faydalı Kaynaklar

- [Monaco Editor Resmi Dokümantasyon](https://microsoft.github.io/monaco-editor/)
- [Prettier Resmi Dokümantasyon](https://prettier.io/docs/en/)
- [Angular CLI Dokümantasyon](https://angular.dev/tools/cli)

---

## 🎉 Sonuç

Bu rehber ile Angular projenizde Monaco Editor ve Prettier entegrasyonunu başarıyla kurabilirsiniz. Bu kurulum size:

- ✨ Profesyonel kod editörü deneyimi
- 🎨 Otomatik kod formatlaması
- 🔍 Gelişmiş IntelliSense
- 📁 Dosya yönetimi
- 🔄 Diff görüntüleme

özelliklerini sağlar.

Herhangi bir sorunla karşılaşırsanız, yukarıdaki "Yaygın Sorunlar" bölümünü kontrol edin veya GitHub Issues sayfasından destek alabilirsiniz.

**İyi kodlamalar! 🚀**

---

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.1.1.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

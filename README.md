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

## ✨ Kurulum Adımları

### 1. Bağımlılıkları Yükleyin

```bash
# Monaco Editor
npm install monaco-editor

# Prettier ve plugin'leri
npm install prettier prettier/standalone prettier/plugins/babel prettier/plugins/estree

# Webpack plugin (opsiyonel)
npm install monaco-editor-webpack-plugin --save-dev
```

### 2. Angular Yapılandırması

`angular.json` dosyasına assets ekleyin:

```json
{
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
```

### 3. Component Oluşturun

**HTML Template:**
```html
<div class="editor-container">
  <div #editorContainer style="height: 400px; width: 100%;"></div>
  <button (click)="formatCode()">Format Code</button>
</div>
```

**TypeScript Component:**
```typescript
import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import * as prettier from 'prettier/standalone';
import * as parserBabel from 'prettier/plugins/babel';
import * as parserEstree from 'prettier/plugins/estree';

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
}
```

### 4. Dil Desteği

```typescript
// JavaScript
language: 'javascript'

// HTML
language: 'html'

// SQL
language: 'sql'

// TypeScript
language: 'typescript'

// JSON
language: 'json'
```

### 5. Tema Seçenekleri

```typescript
// Koyu tema
theme: 'vs-dark'

// Açık tema
theme: 'vs-light'

// Yüksek kontrast
theme: 'hc-black'
```

---

## 🛠️ Ek Özellikler

### Dosya Yükleme/İndirme

**Dosya Yükleme:**
```typescript
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

loadFileIntoEditor(file: File): void {
  const reader = new FileReader();
  reader.onload = (e: any) => {
    this.editor.setValue(e.target.result);
  };
  reader.readAsText(file);
}
```

**Dosya İndirme:**
```typescript
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

### Diff Görüntüleme

```typescript
showDiff(): void {
  const original = this.lastSavedCode;
  const modified = this.editor.getValue();
  
  const diffEditor = window.monaco.editor.createDiffEditor(
    document.getElementById('diff-container'), 
    { originalEditable: false, readOnly: true }
  );
  
  diffEditor.setModel({
    original: window.monaco.editor.createModel(original, 'javascript'),
    modified: window.monaco.editor.createModel(modified, 'javascript')
  });
}
```

### Kaydetme ve Geri Alma

```typescript
// Kaydetme
saveCode(): void {
  const code = this.editor.getValue();
  this.lastSavedCode = code;
  console.log('Code saved');
}

// Geri alma
revertChanges(): void {
  this.editor.setValue(this.lastSavedCode);
  console.log('Changes reverted');
}
```

### Tema Değiştirme

```typescript
toggleTheme(): void {
  const currentTheme = this.editor.getOption(window.monaco.editor.EditorOption.theme);
  const newTheme = currentTheme === 'vs-dark' ? 'vs-light' : 'vs-dark';
  
  window.monaco.editor.setTheme(newTheme);
  this.editor.updateOptions({ theme: newTheme });
}
```

---

## ⚠️ Yaygın Sorunlar

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

---

## 🎯 Özelleştirme

### Klavye Kısayolu
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

### IntelliSense Ekleme
```typescript
window.monaco.languages.typescript.javascriptDefaults.addExtraLib(`
declare var myGlobalFunction: () => void;
`, 'global-types.d.ts');
```

### Özel Tema
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

### Prettier Ayarları
```typescript
const prettierOptions = {
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  printWidth: 80,
  trailingComma: 'es5',
  bracketSpacing: true,
  arrowParens: 'avoid'
};
```

---

## 📚 Faydalı Kaynaklar

- [Monaco Editor Dokümantasyon](https://microsoft.github.io/monaco-editor/)
- [Prettier Dokümantasyon](https://prettier.io/docs/en/)
- [Angular CLI](https://angular.dev/tools/cli)

---

Bu kurulum ile Angular projenizde profesyonel bir kod editörü deneyimi elde edebilirsiniz! 🚀

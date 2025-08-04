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

## ⚠️ Yaygın Sorunlar

### Monaco Yüklenmiyor
- `angular.json` assets yapılandırmasını kontrol edin
- Development server'ı yeniden başlatın: `ng serve`

### Prettier Plugin Hatası
```bash
npm install prettier/plugins/babel prettier/plugins/estree --save
```

### TypeScript Hataları
```typescript
// Component'te declare kullanın
declare const monaco: any;
```

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

---

## 📚 Faydalı Kaynaklar

- [Monaco Editor Dokümantasyon](https://microsoft.github.io/monaco-editor/)
- [Prettier Dokümantasyon](https://prettier.io/docs/en/)
- [Angular CLI](https://angular.dev/tools/cli)

---

Bu kurulum ile Angular projenizde profesyonel bir kod editörü deneyimi elde edebilirsiniz! 🚀

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

---

## 📚 Faydalı Kaynaklar

- [Monaco Editor Dokümantasyon](https://microsoft.github.io/monaco-editor/)
- [Prettier Dokümantasyon](https://prettier.io/docs/en/)
- [Angular CLI](https://angular.dev/tools/cli)

---

Bu kurulum ile Angular projenizde profesyonel bir kod editörü deneyimi elde edebilirsiniz! 🚀

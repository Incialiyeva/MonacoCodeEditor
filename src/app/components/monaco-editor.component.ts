import { Component, ElementRef, AfterViewInit, ViewChild, Inject, PLATFORM_ID, Renderer2, OnInit } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import * as prettier from 'prettier/standalone';
import * as parserBabel from 'prettier/plugins/babel';
import * as parserEstree from 'prettier/plugins/estree';

// Yeni feature importları
import { registerMonacoIntellisense } from '../features/intellisense/monaco-intellisense.provider';
import { formatWithPrettier } from '../features/prettier/prettier-format.util';
import { showMonacoDiff } from '../features/diff/monaco-diff.util';
import { applyMonacoTheme } from '../features/theme/monaco-theme.util';

interface EditorTab {
  name: string;
  code: string;
}

declare global {
  interface Window {
    require: any;
    monaco: any;
    MonacoEnvironment?: any;
  }
}

@Component({
  selector: 'app-monaco-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './monaco-editor.component.html',
  styleUrls: ['./monaco-editor.component.scss']
})
export class MonacoEditorComponent implements AfterViewInit, OnInit {
  @ViewChild('editorContainer', { static: true }) editorContainer!: ElementRef<HTMLDivElement>;
  editor: any;

  languages: { value: string, label: string, icon: SafeHtml }[] = [];
  selectedLanguage = 'javascript';
  selectedTheme = 'vs-dark';
  dropdownOpen = false;

  // Her dil için sekmeler ve kodlar
  tabsByLanguage: Record<string, EditorTab[]> = {
    javascript: [
      { name: 'Tab 1', code: `function hello() {\n  console.log('Hello, JavaScript!');\n}` },
      { name: 'Tab 2', code: `const foo = 'bar';\nconsole.log(foo);` }
    ],
    html: [
      { name: 'Tab 1', code: '<!DOCTYPE html>\n<html>\n  <body>\n    <h1>Hello HTML!</h1>\n  </body>\n</html>' },
      { name: 'Tab 2', code: '<div>Another HTML tab</div>' }
    ],
    sql: [
      { name: 'Tab 1', code: 'SELECT * FROM users;' },
      { name: 'Tab 2', code: 'SELECT COUNT(*) FROM orders;' }
    ]
  };
  selectedTabIndexByLanguage: Record<string, number> = {
    javascript: 0,
    html: 0,
    sql: 0
  };

  openTabs: { lang: string, idx: number, name: string, code: string, language: string }[];
  activeTab: { lang: string, idx: number };

  // Son kaydedilen kodu saklamak için
  lastSavedCodeByTab: Record<string, string> = {};

  scriptTemplates = [
    {
      name: 'onInit',
      description: 'Sayfa ilk yüklendiğinde tetiklenir.',
      code: `function onInit() {\n  // Kodunuzu buraya yazın\n}`
    },
    {
      name: 'onReady',
      description: 'Sayfa tamamen hazır olduğunda çalışır.',
      code: `function onReady() {\n  // Kodunuzu buraya yazın\n}`
    },
    {
      name: 'onSelect',
      description: 'Kullanıcı bir kayıt seçtiğinde tetiklenir.',
      code: `function onSelect(record) {\n  // Kodunuzu buraya yazın\n}`
    },
    {
      name: 'onEdit',
      description: 'Kullanıcı düzenleme moduna geçtiğinde tetiklenir.',
      code: `function onEdit(data) {\n  // Kodunuzu buraya yazın\n}`
    },
    {
      name: 'onValidate',
      description: 'Kayıt kaydedilmeden önce çalışır. false dönerse kayıt engellenir.',
      code: `function onValidate() {\n  // Kodunuzu buraya yazın\n  return true;\n}`
    },
    {
      name: 'onSave',
      description: 'Kayıt kaydedileceği sırada tetiklenir.',
      code: `function onSave(data) {\n  // Kodunuzu buraya yazın\n}`
    },
    {
      name: 'onClick',
      description: 'Özel bir butona tıklanınca çalışır.',
      code: `function onClick(event) {\n  // Kodunuzu buraya yazın\n}`
    },
    {
      name: 'onVisible',
      description: 'Alanın görünürlüğünü kontrol eder.',
      code: `function onVisible() {\n  // Kodunuzu buraya yazın\n  return true;\n}`
    },
    {
      name: 'onEnabled',
      description: 'Alanın aktifliğini kontrol eder.',
      code: `function onEnabled() {\n  // Kodunuzu buraya yazın\n  return true;\n}`
    },
    {
      name: 'onCalculate',
      description: 'Hesaplama yapmak için kullanılır.',
      code: `function onCalculate() {\n  // Kodunuzu buraya yazın\n}`
    }
  ];
  selectedScriptIdx = 0;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    @Inject(DomSanitizer) private sanitizer: DomSanitizer | null = null,
    private renderer: Renderer2,
    private hostRef: ElementRef
  ) {
    // openTabs ve activeTab burada kalabilir
    this.openTabs = [
      { lang: 'javascript', idx: 0, name: this.getTabName('javascript', 0), code: this.tabsByLanguage['javascript'][0].code, language: 'javascript' }
    ];
    this.activeTab = { lang: 'javascript', idx: 0 };
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      // Artık dil listesi yok, script seçimi var
    }
  }

  get selectedTab() {
    return this.tabsByLanguage[this.selectedLanguage][this.selectedTabIndexByLanguage[this.selectedLanguage]];
  }

  get selectedLanguageLabel(): string {
    const found = this.languages.find(l => l.value === this.selectedLanguage);
    return found ? found.label : '';
  }

  getLanguageIcon(lang: string): SafeHtml | null {
    const found = this.languages.find(l => l.value === lang);
    return found ? found.icon : null;
  }

  // Sekme ismini seçili dilin label'ı ile oluştur
  getTabName(langValue: string, idx: number): string {
    const lang = this.languages.find(l => l.value === langValue);
    return lang ? `${lang.label} ${idx + 1}` : `Tab ${idx + 1}`;
  }

  // Açık sekmeler (her dil için yalnızca bir sekme)
  // Aktif sekme bilgisi

  // Tüm sekmeleri tek bir diziye dönüştür
  get allTabs() {
    return this.openTabs;
  }

  // Aktif sekmeyi seç
  selectTabUniversal(lang: string, idx: number) {
    this.activeTab = { lang, idx };
    this.selectedLanguage = lang;
    this.selectedTabIndexByLanguage[lang] = idx;
    const tab = this.openTabs.find(t => t.lang === lang && t.idx === idx);
    if (this.editor && tab) {
      const model = this.editor.getModel();
      // Ensure the language is set to 'javascript' explicitly
      if (lang === 'javascript') {
        // @ts-ignore
        window.monaco.editor.setModelLanguage(model, 'javascript');
      }
      this.editor.setValue(tab.code);
    }
  }

  // Kapatınca aktif sekme güncelle
  closeTabUniversal(lang: string, idx: number) {
    const tabIdx = this.openTabs.findIndex(t => t.lang === lang && t.idx === idx);
    if (tabIdx > -1) {
      this.openTabs.splice(tabIdx, 1);
      // Eğer kapatılan sekme aktifse, başka açık sekme varsa ona geç
      if (this.activeTab.lang === lang && this.activeTab.idx === idx) {
        if (this.openTabs.length > 0) {
          const next = this.openTabs[Math.max(0, tabIdx - 1)];
          this.selectTabUniversal(next.lang, next.idx);
        }
      }
    }
  }

  addTab() {
    const lang = this.selectedLanguage;
    const idx = this.tabsByLanguage[lang].length;
    // Yeni sekme açılırken başa context tipi ekle
    const contextHeader = '/** @type {MonacoContext} */\nconst self = this;\n';
    this.tabsByLanguage[lang].push({ name: this.getTabName(lang, idx), code: contextHeader });
    this.selectedTabIndexByLanguage[lang] = idx;
    if (this.editor) {
      this.editor.setValue(contextHeader);
    }
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    if (typeof window.require === 'function') {
      window.require.config({ paths: { 'vs': '/assets/monaco/vs' } });
      window.MonacoEnvironment = {
        getWorkerUrl: function (workerId: string, label: string) {
          const baseUrl = window.location.origin + '/assets/monaco';
          return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
            self.MonacoEnvironment = {
              baseUrl: '${baseUrl}'
            };
            importScripts('${baseUrl}/vs/base/worker/workerMain.js');
          `)}`;
        }
      };
      window.require(['vs/editor/editor.main'], () => {
        const tab = this.scriptTemplates[this.selectedScriptIdx];
        this.editor = window.monaco.editor.create(this.editorContainer.nativeElement, {
          value: tab.code,
          language: 'javascript',
          theme: 'vs-dark',
          automaticLayout: true
        });
        this.editor.onDidChangeModelContent(() => {
          this.scriptTemplates[this.selectedScriptIdx].code = this.editor.getValue();
        });
        // Sadece intellisense provider fonksiyonunu çağır
        registerMonacoIntellisense(window.monaco);
        console.log('Monaco editor mounted!');
      });
    } else {
      console.error('Monaco loader.js (window.require) bulunamadı!');
    }
  }

  // Dil seçilince sekme ekle veya mevcut sekmeye geç
  onLanguageChange(event: any) {
    const lang = this.selectedLanguage;
    // O dil için kaç sekme var, ona göre isimlendir
    const sameLangTabs = this.openTabs.filter(t => t.lang === lang);
    const idx = sameLangTabs.length;
    const name = this.getTabName(lang, idx);
    const code = this.tabsByLanguage[lang][0]?.code || '';
    this.openTabs.push({ lang, idx, name, code, language: lang });
    this.selectTabUniversal(lang, idx);
  }

  onThemeChange(event: any) {
    if (isPlatformBrowser(this.platformId) && this.editor) {
      // @ts-ignore
      monaco.editor.setTheme(this.selectedTheme);
    }
  }

  toggleTheme() {
    this.selectedTheme = this.selectedTheme === 'vs-dark' ? 'vs-light' : 'vs-dark';
    // Sadece feature fonksiyonunu çağır
    applyMonacoTheme({
      monaco: window.monaco,
      editor: this.editor,
      theme: this.selectedTheme,
      hostElement: this.hostRef.nativeElement,
      renderer: this.renderer
    });
  }

  selectTab(idx: number) {
    // Artık kullanılmıyor, universal fonksiyon var
  }

  formatDocument() {
    if (isPlatformBrowser(this.platformId) && this.editor) {
      this.editor.getAction('editor.action.formatDocument').run();
    }
  }

  saveCode() {
    if (isPlatformBrowser(this.platformId) && this.editor) {
      const code = this.editor.getValue();
      // Burada kodu kaydetme işlemi yapılabilir, örnek olarak console.log
      console.log('Saved code:', code);
      // Aktif tab için kaydedilen kodu sakla
      const tabKey = this.getActiveTabKey();
      this.lastSavedCodeByTab[tabKey] = code;
    }
  }

  // Aktif tab için benzersiz anahtar
  getActiveTabKey(): string {
    return `${this.activeTab.lang}_${this.activeTab.idx}`;
  }

  // Diff gösterme fonksiyonu (Monaco diff editor ile açılacak)
  showDiff() {
    if (isPlatformBrowser(this.platformId) && this.editor) {
      const tabKey = this.getActiveTabKey();
      const original = this.lastSavedCodeByTab[tabKey] || '';
      const modified = this.editor.getValue();
      // Sadece diff fonksiyonunu çağır
      showMonacoDiff({
        monaco: window.monaco,
        editor: this.editor,
        original,
        modified,
        language: 'javascript',
        theme: this.selectedTheme
      });
    }
  }

  // Add a method to format the code using Prettier
  async formatCode() {
    if (isPlatformBrowser(this.platformId) && this.editor) {
      try {
        const code = this.editor.getValue();
        // Sadece prettier format fonksiyonunu çağır
        const formatted = await formatWithPrettier(code);
        if (typeof formatted === 'string') {
          const model = this.editor.getModel();
          if (model) {
            setTimeout(() => {
              this.editor.setValue(formatted);
            }, 0);
          } else {
            alert('Monaco Editor modeli bulunamadı!');
          }
        } else {
          alert('Prettier kodu formatlayamadı!');
        }
      } catch (e: any) {
        alert('Prettier formatlama hatası: ' + (e?.message || JSON.stringify(e)));
        console.error('Prettier formatlama hatası:', e);
      }
    }
  }

  onScriptChange(idx: number) {
    this.selectedScriptIdx = idx;
    if (this.editor) {
      this.editor.setValue(this.scriptTemplates[idx].code);
    }
  }
} 
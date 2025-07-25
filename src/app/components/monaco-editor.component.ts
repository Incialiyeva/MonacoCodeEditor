import { Component, ElementRef, AfterViewInit, ViewChild, Inject, PLATFORM_ID, Renderer2, OnInit } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import * as prettier from 'prettier/standalone';
import * as parserBabel from 'prettier/plugins/babel';
import * as parserEstree from 'prettier/plugins/estree';

interface EditorTab {
  name: string;
  code: string;
}

declare global {
  interface Window {
    require: any;
    monaco: any;
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
      const safe = (svg: string) => this.sanitizer ? this.sanitizer.bypassSecurityTrustHtml(svg) : '';
      this.languages = [
        {
          value: 'javascript',
          label: 'JavaScript',
          icon: safe(`<svg width="18" height="18" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="6" fill="#F7DF1E"/><text x="7" y="23" font-size="16" font-family="monospace" fill="#222">JS</text></svg>`)
        },
        {
          value: 'html',
          label: 'HTML',
          icon: safe(`<svg width="18" height="18" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="6" fill="#E44D26"/><text x="5" y="23" font-size="16" font-family="monospace" fill="#fff">&lt;&gt;</text></svg>`)
        },
        {
          value: 'sql',
          label: 'SQL',
          icon: safe(`<svg width="18" height="18" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="6" fill="#336791"/><ellipse cx="16" cy="16" rx="10" ry="6" fill="#fff"/><text x="8" y="21" font-size="14" font-family="monospace" fill="#336791">SQL</text></svg>`)
        }
      ];
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
    this.tabsByLanguage[lang].push({ name: this.getTabName(lang, idx), code: '' });
    this.selectedTabIndexByLanguage[lang] = idx;
    if (this.editor) {
      this.editor.setValue('');
    }
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    if (typeof window.require === 'function') {
      // Update the path to match the correct asset directory
      // @ts-ignore
      window.require.config({ paths: { 'vs': '/assets/monaco/vs' } });
      // Set the Monaco environment to specify the base URL for workers
      // @ts-ignore
      window.MonacoEnvironment = {
        getWorkerUrl: function (workerId: string, label: string) {
          const baseUrl = window.location.origin + '/assets/monaco'; // Adjusted to remove duplicate 'vs'
          return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
            self.MonacoEnvironment = {
              baseUrl: '${baseUrl}'
            };
            importScripts('${baseUrl}/vs/base/worker/workerMain.js');
          `)}`;
        }
      };
      // @ts-ignore
      window.require(['vs/editor/editor.main'], () => {
        const tab = this.openTabs.find(t => t.lang === 'javascript') || this.openTabs[0];
        // @ts-ignore
        this.editor = window.monaco.editor.create(this.editorContainer.nativeElement, {
          value: tab.code,
          language: 'javascript',
          theme: 'vs-dark',
          automaticLayout: true
        });
        this.editor.onDidChangeModelContent(() => {
          const active = this.openTabs.find(t => t.lang === this.activeTab.lang && t.idx === this.activeTab.idx);
          if (active) active.code = this.editor.getValue();
        });
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
    if (this.editor) {
      // @ts-ignore
      monaco.editor.setTheme(this.selectedTheme);
    }
    // Host elemente class ekle
    const host = this.hostRef.nativeElement;
    if (this.selectedTheme === 'vs-dark') {
      this.renderer.removeClass(host, 'light-theme');
      this.renderer.addClass(host, 'dark-theme');
    } else {
      this.renderer.removeClass(host, 'dark-theme');
      this.renderer.addClass(host, 'light-theme');
    }
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
      // Monaco diff editor aç
      const diffContainer = document.createElement('div');
      diffContainer.style.width = '80vw';
      diffContainer.style.height = '70vh';
      diffContainer.style.position = 'fixed';
      diffContainer.style.top = '10vh';
      diffContainer.style.left = '10vw';
      diffContainer.style.zIndex = '9999';
      diffContainer.style.background = '#23272e';
      diffContainer.style.border = '2px solid #4f8cff';
      diffContainer.style.borderRadius = '12px';
      diffContainer.style.boxShadow = '0 8px 32px #0006';
      diffContainer.id = 'monaco-diff-container';
      document.body.appendChild(diffContainer);
      // @ts-ignore
      window.require(['vs/editor/editor.main'], () => {
        // @ts-ignore
        const monaco = window.monaco;
        const originalModel = monaco.editor.createModel(original, this.selectedLanguage);
        const modifiedModel = monaco.editor.createModel(modified, this.selectedLanguage);
        // @ts-ignore
        const diffEditor = monaco.editor.createDiffEditor(diffContainer, {
          theme: this.selectedTheme,
          automaticLayout: true,
        });
        diffEditor.setModel({ original: originalModel, modified: modifiedModel });
        // Kapatma butonu
        const closeBtn = document.createElement('button');
        closeBtn.innerText = 'Kapat';
        closeBtn.style.position = 'absolute';
        closeBtn.style.top = '12px';
        closeBtn.style.right = '18px';
        closeBtn.style.zIndex = '10000';
        closeBtn.style.background = '#4f8cff';
        closeBtn.style.color = '#fff';
        closeBtn.style.border = 'none';
        closeBtn.style.borderRadius = '6px';
        closeBtn.style.padding = '0.5rem 1.2rem';
        closeBtn.style.fontSize = '1rem';
        closeBtn.style.cursor = 'pointer';
        closeBtn.onclick = () => {
          diffEditor.dispose();
          originalModel.dispose();
          modifiedModel.dispose();
          diffContainer.remove();
        };
        diffContainer.appendChild(closeBtn);
        // Kodu Güncelle butonu
        const applyBtn = document.createElement('button');
        applyBtn.innerText = 'Kodu Güncelle';
        applyBtn.style.position = 'absolute';
        applyBtn.style.top = '12px';
        applyBtn.style.right = '110px';
        applyBtn.style.zIndex = '10000';
        applyBtn.style.background = '#43b77a';
        applyBtn.style.color = '#fff';
        applyBtn.style.border = 'none';
        applyBtn.style.borderRadius = '6px';
        applyBtn.style.padding = '0.5rem 1.2rem';
        applyBtn.style.fontSize = '1rem';
        applyBtn.style.cursor = 'pointer';
        applyBtn.onclick = () => {
          const newCode = modifiedModel.getValue();
          if (this.editor) {
            this.editor.setValue(newCode);
          }
          diffEditor.dispose();
          originalModel.dispose();
          modifiedModel.dispose();
          diffContainer.remove();
        };
        diffContainer.appendChild(applyBtn);
      });
    }
  }

  // Add a method to format the code using Prettier
  async formatCode() {
    if (isPlatformBrowser(this.platformId) && this.editor) {
      try {
        const code = this.editor.getValue();
        console.log('Prettier input code:', code);
        const formatted = await prettier.format(code, {
          parser: 'babel',
          plugins: [parserBabel, parserEstree],
          singleQuote: true
        });
        console.log('Prettier formatted:', formatted);
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
} 
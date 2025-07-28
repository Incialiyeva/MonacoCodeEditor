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
      code: `/** @type {MonacoContext} */\nconst self = this;\nfunction onInit() {\n  // Kodunuzu buraya yazın\n}`
    },
    {
      name: 'onReady',
      description: 'Sayfa tamamen hazır olduğunda çalışır.',
      code: `/** @type {MonacoContext} */\nconst self = this;\nfunction onReady() {\n  // Kodunuzu buraya yazın\n}`
    },
    {
      name: 'onSelect',
      description: 'Kullanıcı bir kayıt seçtiğinde tetiklenir.',
      code: `/** @type {MonacoContext} */\nconst self = this;\nfunction onSelect(record) {\n  // Kodunuzu buraya yazın\n}`
    },
    {
      name: 'onEdit',
      description: 'Kullanıcı düzenleme moduna geçtiğinde tetiklenir.',
      code: `/** @type {MonacoContext} */\nconst self = this;\nfunction onEdit(data) {\n  // Kodunuzu buraya yazın\n}`
    },
    {
      name: 'onValidate',
      description: 'Kayıt kaydedilmeden önce çalışır. false dönerse kayıt engellenir.',
      code: `/** @type {MonacoContext} */\nconst self = this;\nfunction onValidate() {\n  // Kodunuzu buraya yazın\n  return true;\n}`
    },
    {
      name: 'onSave',
      description: 'Kayıt kaydedileceği sırada tetiklenir.',
      code: `/** @type {MonacoContext} */\nconst self = this;\nfunction onSave(data) {\n  // Kodunuzu buraya yazın\n}`
    },
    {
      name: 'onClick',
      description: 'Özel bir butona tıklanınca çalışır.',
      code: `/** @type {MonacoContext} */\nconst self = this;\nfunction onClick(event) {\n  // Kodunuzu buraya yazın\n}`
    },
    {
      name: 'onVisible',
      description: 'Alanın görünürlüğünü kontrol eder.',
      code: `/** @type {MonacoContext} */\nconst self = this;\nfunction onVisible() {\n  // Kodunuzu buraya yazın\n  return true;\n}`
    },
    {
      name: 'onEnabled',
      description: 'Alanın aktifliğini kontrol eder.',
      code: `/** @type {MonacoContext} */\nconst self = this;\nfunction onEnabled() {\n  // Kodunuzu buraya yazın\n  return true;\n}`
    },
    {
      name: 'onCalculate',
      description: 'Hesaplama yapmak için kullanılır.',
      code: `/** @type {MonacoContext} */\nconst self = this;\nfunction onCalculate() {\n  // Kodunuzu buraya yazın\n}`
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
      // @ts-ignore
      if (!('MonacoEnvironment' in window)) {
        // @ts-ignore
        window.MonacoEnvironment = {};
      }
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
        // Monaco context tiplerini ekle
        // @ts-ignore
        window.monaco.languages.typescript.javascriptDefaults.addExtraLib(`

/**
 * GLOBAL CONTEXT – Monaco ortamı için zengin API
 * Kod yazarken autocomplete, type checking ve güvenli tanım sağlar.
 */

declare global {
  interface MonacoContext {
    record: {
      id?: string;
      name?: string;
      price?: number;
      quantity?: number;
      total?: number;
      [key: string]: any;
    };
    isEditMode: boolean;
    form: {
      getValue(field: string): any;
      setValue(field: string, value: any): void;
      setVisible(field: string, visible: boolean): void;
      setEnabled(field: string, enabled: boolean): void;
      showError(field: string, message: string): void;
    };
    dialog: {
      alert(message: string): void;
      confirm(message: string): Promise<boolean>;
      open(path: string, params?: Record<string, any>): void;
    };
    navigation: {
      go(path: string, params?: Record<string, any>): void;
      reload(): void;
    };
  }
  const self: MonacoContext;
  function showMessage(text: string): void;
  function log(text: string): void;
}

declare const self: MonacoContext;
declare function showMessage(text: string): void;
declare function log(text: string): void;

declare function onInit(): void;
declare function onReady(): void;
declare function onSelect(record: Record<string, any>): void;
declare function onEdit(data: Record<string, any>): void;
declare function onValidate(): boolean;
declare function onSave(data: Record<string, any>): void;
declare function onClick(event?: any): void;
declare function onVisible(): boolean;
declare function onEnabled(): boolean;
declare function onCalculate(): any;

`, 'filename/monacoContext.d.ts');
        // İlk script ile başlat
        const tab = this.scriptTemplates[this.selectedScriptIdx];
        // @ts-ignore
        this.editor = window.monaco.editor.create(this.editorContainer.nativeElement, {
          value: tab.code,
          language: 'javascript',
          theme: 'vs-dark',
          automaticLayout: true
        });
        this.editor.onDidChangeModelContent(() => {
          // Kod değiştiğinde güncelle
          this.scriptTemplates[this.selectedScriptIdx].code = this.editor.getValue();
        });
        // Custom autocomplete provider for 'self.', 'this.' and their members
        // @ts-ignore
        window.monaco.languages.registerCompletionItemProvider('javascript', {
          triggerCharacters: ['.'],
          provideCompletionItems: function(model: any, position: any) {
            const textUntilPosition = model.getValueInRange({
              startLineNumber: position.lineNumber,
              startColumn: 1,
              endLineNumber: position.lineNumber,
              endColumn: position.column
            });
            // self. veya this.
            if (/\b(self|this)\.$/.test(textUntilPosition)) {
              return {
                suggestions: [
                  {
                    label: 'form',
                    kind: window.monaco.languages.CompletionItemKind.Property,
                    insertText: 'form',
                    detail: 'Form API',
                    documentation: 'Form işlemleri için API'
                  },
                  {
                    label: 'dialog',
                    kind: window.monaco.languages.CompletionItemKind.Property,
                    insertText: 'dialog',
                    detail: 'Dialog API',
                    documentation: 'Uyarı, onay, pencere açma'
                  },
                  {
                    label: 'navigation',
                    kind: window.monaco.languages.CompletionItemKind.Property,
                    insertText: 'navigation',
                    detail: 'Navigation API',
                    documentation: 'Sayfa geçiş ve yenileme'
                  },
                  {
                    label: 'record',
                    kind: window.monaco.languages.CompletionItemKind.Property,
                    insertText: 'record',
                    detail: 'Aktif form verileri',
                    documentation: 'Formdaki mevcut kayıt verileri'
                  },
                  {
                    label: 'isEditMode',
                    kind: window.monaco.languages.CompletionItemKind.Property,
                    insertText: 'isEditMode',
                    detail: 'Düzenleme modu',
                    documentation: 'Sayfa şu an düzenleme modunda mı?'
                  }
                ]
              };
            }
            // self.form. veya this.form.
            if (/\b(self|this)\.form\.$/.test(textUntilPosition)) {
              return {
                suggestions: [
                  {
                    label: 'getValue',
                    kind: window.monaco.languages.CompletionItemKind.Method,
                    insertText: 'getValue($1)',
                    insertTextRules: window.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'Alan değeri al',
                    documentation: 'form.getValue(field: string): any'
                  },
                  {
                    label: 'setValue',
                    kind: window.monaco.languages.CompletionItemKind.Method,
                    insertText: 'setValue($1, $2)',
                    insertTextRules: window.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'Alan değeri ata',
                    documentation: 'form.setValue(field: string, value: any): void'
                  },
                  {
                    label: 'setVisible',
                    kind: window.monaco.languages.CompletionItemKind.Method,
                    insertText: 'setVisible($1, $2)',
                    insertTextRules: window.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'Alan görünürlüğü',
                    documentation: 'form.setVisible(field: string, visible: boolean): void'
                  },
                  {
                    label: 'setEnabled',
                    kind: window.monaco.languages.CompletionItemKind.Method,
                    insertText: 'setEnabled($1, $2)',
                    insertTextRules: window.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'Alan aktifliği',
                    documentation: 'form.setEnabled(field: string, enabled: boolean): void'
                  },
                  {
                    label: 'showError',
                    kind: window.monaco.languages.CompletionItemKind.Method,
                    insertText: 'showError($1, $2)',
                    insertTextRules: window.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'Alan hata mesajı',
                    documentation: 'form.showError(field: string, message: string): void'
                  }
                ]
              };
            }
            // self.dialog. veya this.dialog.
            if (/\b(self|this)\.dialog\.$/.test(textUntilPosition)) {
              return {
                suggestions: [
                  {
                    label: 'alert',
                    kind: window.monaco.languages.CompletionItemKind.Method,
                    insertText: 'alert($1)',
                    insertTextRules: window.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'Uyarı göster',
                    documentation: 'dialog.alert(message: string): void'
                  },
                  {
                    label: 'confirm',
                    kind: window.monaco.languages.CompletionItemKind.Method,
                    insertText: 'confirm($1)',
                    insertTextRules: window.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'Onay iste',
                    documentation: 'dialog.confirm(message: string): Promise<boolean>'
                  },
                  {
                    label: 'open',
                    kind: window.monaco.languages.CompletionItemKind.Method,
                    insertText: 'open($1, $2)',
                    insertTextRules: window.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'Pencere aç',
                    documentation: 'dialog.open(path: string, params?: Record<string, any>): void'
                  }
                ]
              };
            }
            // self.navigation. veya this.navigation.
            if (/\b(self|this)\.navigation\.$/.test(textUntilPosition)) {
              return {
                suggestions: [
                  {
                    label: 'go',
                    kind: window.monaco.languages.CompletionItemKind.Method,
                    insertText: 'go($1, $2)',
                    insertTextRules: window.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'Sayfa geçişi',
                    documentation: 'navigation.go(path: string, params?: Record<string, any>): void'
                  },
                  {
                    label: 'reload',
                    kind: window.monaco.languages.CompletionItemKind.Method,
                    insertText: 'reload()',
                    insertTextRules: window.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'Sayfayı yenile',
                    documentation: 'navigation.reload(): void'
                  }
                ]
              };
            }
            return { suggestions: [] };
          }
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

  onScriptChange(idx: number) {
    this.selectedScriptIdx = idx;
    if (this.editor) {
      this.editor.setValue(this.scriptTemplates[idx].code);
    }
  }
} 
import { Component, ElementRef, AfterViewInit, ViewChild, Inject, PLATFORM_ID, Renderer2, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import * as prettier from 'prettier/standalone';
import * as parserBabel from 'prettier/plugins/babel';
import * as parserEstree from 'prettier/plugins/estree';

// Yeni feature importları
import { initializeMonacoIntelliSense, MonacoIntelliSenseProvider } from '../features/intellisense/monaco-intellisense.provider';
import { formatWithPrettier } from '../features/prettier/prettier-format.util';
import { showMonacoDiff } from '../features/diff/monaco-diff.util';
import { applyMonacoTheme } from '../features/theme/monaco-theme.util';
import { registerHTMLLanguage } from '../features/language/html-language.provider';
import { registerSQLLanguage } from '../features/language/sql-language.provider';
import { validateHTML } from '../features/language/html-validation.util';
import { validateSQL } from '../features/language/sql-validation.util';

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
export class MonacoEditorComponent implements AfterViewInit, OnInit, OnChanges {
  @ViewChild('editorContainer', { static: true }) editorContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef<HTMLInputElement>;
  @Input() selectedScriptIndex: number = 0;
  @Input() editorTheme: string = 'vs-dark';
  editor: any;
  intelliSenseProvider: MonacoIntelliSenseProvider | null = null;

  languages: { value: string, label: string, icon: SafeHtml }[] = [];
  selectedLanguage = 'javascript';
  selectedTheme = 'vs-dark';

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
  showSaveModal = false;
  selectedTabsForSave: number[] = [];
  chooseAllForSave = true;
  activeTabForSave: number = 0;

  // Diff için orijinal kodları sakla
  originalCodeByTab: Record<string, string> = {};

  // Download menu için
  showDownloadMenu = false;

  openSaveModal() {
    this.selectedTabsForSave = this.openTabs.map((_, i) => i);
    this.chooseAllForSave = true;
    this.activeTabForSave = this.selectedTabsForSave[0] ?? 0;
    this.showSaveModal = true;
  }

  toggleChooseAllForSave() {
    if (this.chooseAllForSave) {
      this.selectedTabsForSave = this.openTabs.map((_, i) => i);
    } else {
      this.selectedTabsForSave = [];
    }
    // Aktif sekme seçili değilse, ilk seçiliyi aktif yap
    if (!this.selectedTabsForSave.includes(this.activeTabForSave)) {
      this.activeTabForSave = this.selectedTabsForSave[0] ?? 0;
    }
  }

  toggleTabForSave(idx: number) {
    if (this.selectedTabsForSave.includes(idx)) {
      this.selectedTabsForSave = this.selectedTabsForSave.filter(i => i !== idx);
    } else {
      this.selectedTabsForSave = [...this.selectedTabsForSave, idx];
    }
    this.chooseAllForSave = this.selectedTabsForSave.length === this.openTabs.length;
    // Aktif sekme seçili değilse, ilk seçiliyi aktif yap
    if (!this.selectedTabsForSave.includes(this.activeTabForSave)) {
      this.activeTabForSave = this.selectedTabsForSave[0] ?? 0;
    }
  }

  setActiveTabForSave(idx: number) {
    this.activeTabForSave = idx;
  }

  saveSelectedTabs() {
    // Sadece seçili sekmelerin kodunu kaydet (örnek: console.log)
    const selectedTabs = this.openTabs.filter((_, i) => this.selectedTabsForSave.includes(i));
    selectedTabs.forEach(tab => {
      console.log('Saved tab:', tab.name, tab.code);
      // Burada gerçek kaydetme işlemi yapılabilir
    });
    this.showSaveModal = false;
  }

  cancelSaveModal() {
    this.showSaveModal = false;
  }

  scriptTemplates = [
    {
      name: 'onInit',
      description: 'Triggered when the page is first loaded.',
      code: `function onInit() {\n  // Initialize your application here\n  console.log('Application initialized');\n}`
    },
    {
      name: 'onClick',
      description: 'Runs when a button is clicked.',
      code: `function onClick(event) {\n  // Handle button click here\n  console.log('Button clicked:', event);\n}`
    },
    {
      name: 'onSave',
      description: 'Triggered when data is being saved.',
      code: `function onSave(data) {\n  // Handle data saving here\n  console.log('Saving data:', data);\n  return true; // Return true to allow save\n}`
    },
    {
      name: 'SELECT Users',
      description: 'Query to select all users from database.',
      code: `SELECT * FROM users\nWHERE active = 1\nORDER BY created_at DESC;`
    },
    {
      name: 'INSERT Record',
      description: 'Insert a new record into database.',
      code: `INSERT INTO users (name, email, created_at)\nVALUES ('John Doe', 'john@example.com', NOW());`
    },
    {
      name: 'UPDATE Data',
      description: 'Update existing records in database.',
      code: `UPDATE users\nSET last_login = NOW()\nWHERE id = ?;`
    },
    {
      name: 'HTML Form',
      description: 'Basic HTML form structure.',
      code: `<!DOCTYPE html>\n<html>\n<head>\n  <title>Form</title>\n</head>\n<body>\n  <form>\n    <input type="text" placeholder="Name">\n    <button type="submit">Submit</button>\n  </form>\n</body>\n</html>`
    },
    {
      name: 'HTML Table',
      description: 'HTML table structure.',
      code: `<!DOCTYPE html>\n<html>\n<head>\n  <title>Table</title>\n</head>\n<body>\n  <table>\n    <tr>\n      <th>Name</th>\n      <th>Email</th>\n    </tr>\n    <tr>\n      <td>John</td>\n      <td>john@example.com</td>\n    </tr>\n  </table>\n</body>\n</html>`
    },
    {
      name: 'HTML Card',
      description: 'HTML card component.',
      code: `<!DOCTYPE html>\n<html>\n<head>\n  <title>Card</title>\n</head>\n<body>\n  <div class="card">\n    <h3>Card Title</h3>\n    <p>Card content goes here</p>\n    <button>Action</button>\n  </div>\n</body>\n</html>`
    },
    {
      name: 'HTML with Errors',
      description: 'HTML with intentional errors for testing validation.',
      code: `<html>\n<head>\n  <title>Test</title>\n</head>\n<body>\n  <div>\n    <h1>Test</h1>\n    <p>This is a test\n    <div>\n      <span>Nested content</div>\n    </div>\n  </div>\n</body>\n</html>`
    },
    {
      name: 'SQL with Errors',
      description: 'SQL with intentional errors for testing validation.',
      code: `SELECT * FROM users\nWHERE active = 1\nORDER BY created_at DESC`
    },
    {
      name: 'SQL Complex Errors',
      description: 'SQL with multiple intentional errors for comprehensive testing.',
      code: `SELECT * FROM users\nWHERE active\nORDER BY\nGROUP BY name\nINSERT users (name, email)\nUPDATE users\nDELETE users\nCREATE TABLE users\nJOIN orders`
    },
    {
      name: 'Valid SQL Examples',
      description: 'Valid SQL statements for testing.',
      code: `SELECT * FROM users WHERE active = 1;\n\nUPDATE users SET last_login = NOW() WHERE id = 1;\n\nINSERT INTO users (name, email) VALUES ('John', 'john@example.com');`
    },
    {
      name: 'SQL with Typos',
      description: 'SQL with common typos for testing validation.',
      code: `SELEC id, name email\nFORM users\nWHERE active = 'yes'\nAND ORDER BY created_at DESC`
    },
    {
      name: 'Complex SQL Query',
      description: 'Complex SQL query with multiple clauses.',
      code: `SELECT u.id, u.name, u.email, COUNT(o.id) as order_count\nFROM users u\nLEFT JOIN orders o ON u.id = o.user_id\nWHERE u.active = 1\nAND u.created_at > '2023-01-01'\nGROUP BY u.id, u.name, u.email\nHAVING COUNT(o.id) > 0\nORDER BY order_count DESC\nLIMIT 10`
    },
    {
      name: 'SQL with Functions',
      description: 'SQL with various functions and expressions.',
      code: `SELECT \n  id,\n  name,\n  email,\n  CONCAT(first_name, ' ', last_name) as full_name,\n  COUNT(*) as total_orders,\n  SUM(amount) as total_amount,\n  AVG(amount) as avg_amount\nFROM users u\nJOIN orders o ON u.id = o.user_id\nWHERE status = 'active'\nGROUP BY id, name, email, first_name, last_name\nHAVING total_amount > 1000\nORDER BY total_amount DESC`
    }
  ];

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

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedScriptIndex'] && this.editor && isPlatformBrowser(this.platformId)) {
      const newScriptIndex = changes['selectedScriptIndex'].currentValue;
      const selectedScript = this.scriptTemplates[newScriptIndex];
      if (selectedScript) {
        const language = this.detectLanguageFromCode(selectedScript.code);
        const model = this.editor.getModel();
        if (window.monaco && model) {
          window.monaco.editor.setModelLanguage(model, language);
        }
        this.editor.setValue(selectedScript.code);
        console.log('Script changed to:', selectedScript.name);
      }
    }
    
    if (changes['editorTheme'] && this.editor && isPlatformBrowser(this.platformId)) {
      const newTheme = changes['editorTheme'].currentValue;
      if (window.monaco) {
        window.monaco.editor.setTheme(newTheme);
        console.log('Theme changed to:', newTheme);
      }
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
    // Önce mevcut tabdaki kodu kaydet
    if (this.editor && this.activeTab) {
      const prevTab = this.openTabs.find(t => t.lang === this.activeTab.lang && t.idx === this.activeTab.idx);
      if (prevTab) {
        prevTab.code = this.editor.getValue();
        // Orijinal kodu sakla
        const tabKey = this.getTabKey(prevTab);
        this.saveOriginalCode(tabKey, prevTab.code);
      }
    }
    this.activeTab = { lang, idx };
    this.selectedLanguage = lang;
    this.selectedTabIndexByLanguage[lang] = idx;
    const tab = this.openTabs.find(t => t.lang === lang && t.idx === idx);
    if (this.editor && tab) {
      const model = this.editor.getModel();
      if (window.monaco && model) {
        window.monaco.editor.setModelLanguage(model, lang);
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
      const model = this.editor.getModel();
      if (model && window.monaco) {
        window.monaco.editor.setModelLanguage(model, lang);
      }
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
        // Monaco Editor dil modüllerini kaydet
        if (window.monaco) {
          // HTML ve SQL dil desteğini kaydet
          registerHTMLLanguage(window.monaco);
          registerSQLLanguage(window.monaco);
          
          // IntelliSense provider'ı başlat
          this.intelliSenseProvider = initializeMonacoIntelliSense(window.monaco);
        }

        // Seçilen script template'ini al
        const selectedScript = this.scriptTemplates[this.selectedScriptIndex];
        if (selectedScript) {
          const language = this.detectLanguageFromCode(selectedScript.code);
          this.editor = window.monaco.editor.create(this.editorContainer.nativeElement, {
            value: selectedScript.code,
            language: language,
            theme: this.editorTheme,
            automaticLayout: true,
            // Gelişmiş IntelliSense ayarları
            suggestOnTriggerCharacters: true,
            quickSuggestions: {
              other: true,
              comments: true,
              strings: true
            },
            acceptSuggestionOnCommitCharacter: true,
            acceptSuggestionOnEnter: 'on',
            tabCompletion: 'on',
            wordBasedSuggestions: true,
            parameterHints: {
              enabled: true
            },
            suggest: {
              localityBonus: true,
              snippetsPreventQuickSuggestions: false,
              showIcons: true,
              maxVisibleSuggestions: 12,
              insertMode: 'replace'
            },
            // TypeScript/JavaScript için özel ayarlar
            typescript: {
              suggest: {
                includeCompletionsForModuleExports: true,
                includeCompletionsWithSnippetText: true,
                includeCompletionsWithInsertText: true
              }
            },
            javascript: {
              suggest: {
                includeCompletionsForModuleExports: true,
                includeCompletionsWithSnippetText: true,
                includeCompletionsWithInsertText: true
              }
            }
          });
          
          
          // Editor içeriği değiştiğinde script template'ini güncelle
          this.editor.onDidChangeModelContent(() => {
            this.scriptTemplates[this.selectedScriptIndex].code = this.editor.getValue();
            // Kod hatalarını otomatik kontrol et
            setTimeout(() => this.checkCodeErrors(), 500);
          });
          
          // Context menu ekle
          this.editor.addAction({
            id: 'format-document',
            label: 'Format Document',
            keybindings: [
              window.monaco.KeyMod.Alt | window.monaco.KeyCode.KeyF
            ],
            contextMenuGroupId: '1_modification',
            contextMenuOrder: 1.5,
            run: async (ed: any) => {
              await this.formatCode();
            }
          });
          
          this.editor.addAction({
            id: 'open-in-live-server',
            label: 'Open in Live Server',
            contextMenuGroupId: '9_cutcopypaste',
            contextMenuOrder: 1.5,
            run: (ed: any) => {
              this.openInLiveServer();
            }
          });
          
          console.log('Monaco editor mounted with script:', selectedScript.name, 'and theme:', this.editorTheme);
        } else {
          console.error('Script template not found for index:', this.selectedScriptIndex);
        }
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

  // Kod hatalarını kontrol et ve göster
  checkCodeErrors() {
    if (isPlatformBrowser(this.platformId) && this.editor) {
      const code = this.editor.getValue();
      const language = this.detectLanguageFromCode(code);
      
      if (language === 'html') {
        const validation = validateHTML(code);
        if (!validation.isValid) {
          console.warn('HTML Validation Errors:', validation.errors);
          // Hataları Monaco Editor'da göstermek için markers ekle
          this.addValidationMarkers(validation.errors);
        } else {
          console.log('HTML is valid');
          this.clearValidationMarkers();
        }
      } else if (language === 'sql') {
        const validation = validateSQL(code);
        if (!validation.isValid) {
          console.warn('SQL Validation Errors:', validation.errors);
          // Hataları Monaco Editor'da göstermek için markers ekle
          this.addValidationMarkers(validation.errors);
        } else {
          console.log('SQL is valid');
          this.clearValidationMarkers();
        }
      }
    }
  }

  // Validation markers ekle
  addValidationMarkers(errors: string[]) {
    if (window.monaco && this.editor) {
      const model = this.editor.getModel();
      if (model) {
        const language = this.detectLanguageFromCode(this.editor.getValue());
        const namespace = language === 'html' ? 'html-validation' : 'sql-validation';
        
        const markers = errors.map((error, index) => ({
          message: error,
          severity: window.monaco.MarkerSeverity.Error,
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: model.getLineCount(),
          endColumn: model.getLineMaxColumn(model.getLineCount())
        }));
        
        window.monaco.editor.setModelMarkers(model, namespace, markers);
      }
    }
  }

  // Validation markers'ları temizle
  clearValidationMarkers() {
    if (window.monaco && this.editor) {
      const model = this.editor.getModel();
      if (model) {
        const language = this.detectLanguageFromCode(this.editor.getValue());
        const namespace = language === 'html' ? 'html-validation' : 'sql-validation';
        window.monaco.editor.setModelMarkers(model, namespace, []);
      }
    }
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
    if (isPlatformBrowser(this.platformId) && window.monaco && this.editor) {
      applyMonacoTheme({
        monaco: window.monaco,
        editor: this.editor,
        theme: this.selectedTheme,
        hostElement: this.hostRef.nativeElement,
        renderer: this.renderer
      });
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
      // Aktif tab için kaydedilen kodu sakla
      const tabKey = this.getActiveTabKey();
      this.lastSavedCodeByTab[tabKey] = code;
      this.openSaveModal();
    }
  }

  closeSaveModal() {
    this.showSaveModal = false;
  }

  // Aktif tab için benzersiz anahtar
  getActiveTabKey(): string {
    return `${this.activeTab.lang}_${this.activeTab.idx}`;
  }

  // Tab için orijinal kodu sakla
  saveOriginalCode(tabKey: string, code: string) {
    if (!this.originalCodeByTab[tabKey]) {
      this.originalCodeByTab[tabKey] = code;
    }
  }

  // Tab için benzersiz anahtar
  getTabKey(tab: any): string {
    return `${tab.lang}_${tab.idx}`;
  }

  // Diff oluştur
  generateDiff(original: string, modified: string): { left: string, right: string } {
    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');
    
    let leftLines: string[] = [];
    let rightLines: string[] = [];
    
    // Basit diff algoritması
    let i = 0, j = 0;
    while (i < originalLines.length || j < modifiedLines.length) {
      if (i < originalLines.length && j < modifiedLines.length && originalLines[i] === modifiedLines[j]) {
        // Aynı satır
        leftLines.push(` ${originalLines[i]}`);
        rightLines.push(` ${modifiedLines[j]}`);
        i++; j++;
      } else if (j < modifiedLines.length && (i >= originalLines.length || originalLines[i] !== modifiedLines[j])) {
        // Yeni satır eklendi
        if (i < originalLines.length) {
          leftLines.push(`-${originalLines[i]}`);
          rightLines.push(`+${modifiedLines[j]}`);
          i++; j++;
        } else {
          leftLines.push('');
          rightLines.push(`+${modifiedLines[j]}`);
          j++;
        }
      } else if (i < originalLines.length) {
        // Satır silindi
        leftLines.push(`-${originalLines[i]}`);
        rightLines.push('');
        i++;
      }
    }
    
    return {
      left: leftLines.join('\n'),
      right: rightLines.join('\n')
    };
  }

  // HTML formatında diff oluştur
  generateDiffHTML(original: string, modified: string): { left: string, right: string } {
    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');
    
    let leftHTML: string[] = [];
    let rightHTML: string[] = [];
    
    // Basit diff algoritması
    let i = 0, j = 0;
    while (i < originalLines.length || j < modifiedLines.length) {
      if (i < originalLines.length && j < modifiedLines.length && originalLines[i] === modifiedLines[j]) {
        // Aynı satır
        leftHTML.push(`<span class="diff-line unchanged"> ${originalLines[i]}</span>`);
        rightHTML.push(`<span class="diff-line unchanged"> ${modifiedLines[j]}</span>`);
        i++; j++;
      } else if (j < modifiedLines.length && (i >= originalLines.length || originalLines[i] !== modifiedLines[j])) {
        // Yeni satır eklendi
        if (i < originalLines.length) {
          leftHTML.push(`<span class="diff-line deleted">-${originalLines[i]}</span>`);
          rightHTML.push(`<span class="diff-line added">+${modifiedLines[j]}</span>`);
          i++; j++;
        } else {
          leftHTML.push(`<span class="diff-line empty"></span>`);
          rightHTML.push(`<span class="diff-line added">+${modifiedLines[j]}</span>`);
          j++;
        }
      } else if (i < originalLines.length) {
        // Satır silindi
        leftHTML.push(`<span class="diff-line deleted">-${originalLines[i]}</span>`);
        rightHTML.push(`<span class="diff-line empty"></span>`);
        i++;
      }
    }
    
    return {
      left: leftHTML.join('\n'),
      right: rightHTML.join('\n')
    };
  }

  // Aktif tab için diff al
  getActiveTabDiff(): { left: string, right: string } {
    if (this.activeTabForSave >= 0 && this.activeTabForSave < this.openTabs.length) {
      const tab = this.openTabs[this.activeTabForSave];
      const tabKey = this.getTabKey(tab);
      const original = this.originalCodeByTab[tabKey] || tab.code;
      const modified = tab.code;
      return this.generateDiff(original, modified);
    }
    return { left: '', right: '' };
  }

  // Aktif tab için HTML diff al
  getActiveTabDiffHTML(): { left: string, right: string } {
    if (this.activeTabForSave >= 0 && this.activeTabForSave < this.openTabs.length) {
      const tab = this.openTabs[this.activeTabForSave];
      const tabKey = this.getTabKey(tab);
      const original = this.originalCodeByTab[tabKey] || tab.code;
      const modified = tab.code;
      return this.generateDiffHTML(original, modified);
    }
    return { left: '', right: '' };
  }

  // Diff gösterme fonksiyonu (Monaco diff editor ile açılacak)
  showDiff() {
    if (isPlatformBrowser(this.platformId) && this.editor && window.monaco) {
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
        const language = this.detectLanguageFromCode(code);
        
        // Formatlama sırasında validation'ı geçici olarak devre dışı bırak
        this.clearValidationMarkers();
        
        // Sadece prettier format fonksiyonunu çağır
        const formatted = await formatWithPrettier(code, language);
        if (typeof formatted === 'string') {
          const model = this.editor.getModel();
          if (model) {
            setTimeout(() => {
              this.editor.setValue(formatted);
              // Formatlama sonrası validation'ı tekrar etkinleştir
              setTimeout(() => this.checkCodeErrors(), 1000);
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

  // Revert changes to original script template
  revertChanges() {
    if (isPlatformBrowser(this.platformId) && this.editor) {
      const script = this.scriptTemplates[this.selectedScriptIndex];
      this.editor.setValue(script.code);
    }
  }

  // Open in Live Server functionality
  openInLiveServer() {
    if (isPlatformBrowser(this.platformId) && this.editor) {
      const code = this.editor.getValue();
      const language = this.detectLanguageFromCode(code);
      
      console.log('Detected language:', language);
      console.log('Code preview:', code.substring(0, 100));
      
      if (language === 'html') {
        // HTML içeriğini blob olarak oluştur
        const blob = new Blob([code], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        
        // Yeni sekmede aç
        window.open(url, '_blank');
        
        console.log('HTML opened in new tab');
      } else {
        alert('Live Server sadece HTML dosyaları için kullanılabilir!');
      }
    }
  }

  // IntelliSense Provider erişim metodları
  addCustomLib(content: string, targetFileSrc: string): void {
    if (this.intelliSenseProvider) {
      this.intelliSenseProvider.addLib({ content, targetFileSrc });
      this.intelliSenseProvider.loadLib(targetFileSrc);
    }
  }

  removeCustomLib(targetFileSrc: string): void {
    if (this.intelliSenseProvider) {
      this.intelliSenseProvider.removeLib(targetFileSrc);
    }
  }

  getLoadedLibs(): string[] {
    if (this.intelliSenseProvider) {
      return this.intelliSenseProvider.getLoadedLibs();
    }
    return [];
  }

  getAllLibs(): any[] {
    if (this.intelliSenseProvider) {
      return this.intelliSenseProvider.getAllLibs();
    }
    return [];
  }

  clearAllLibs(): void {
    if (this.intelliSenseProvider) {
      this.intelliSenseProvider.clearAllLibs();
    }
  }

  // File upload functionality
  triggerFileUpload() {
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.click();
    }
    this.showDownloadMenu = false;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.loadFileIntoEditor(file);
    }
    // Reset file input
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  loadFileIntoEditor(file: File) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const content = e.target.result;
      const language = this.detectLanguageFromFile(file);
      
      // Update editor content
      if (this.editor) {
        this.editor.setValue(content);
        
        // Set language
        const model = this.editor.getModel();
        if (window.monaco && model) {
          window.monaco.editor.setModelLanguage(model, language);
        }
        
        // Update script template
        const script = this.scriptTemplates[this.selectedScriptIndex];
        script.code = content;
        script.name = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
        
        console.log(`File loaded: ${file.name} with language: ${language}`);
      }
    };
    reader.readAsText(file);
  }

  // Detect language from file extension and content
  detectLanguageFromFile(file: File): string {
    const fileName = file.name.toLowerCase();
    const extension = fileName.split('.').pop();
    
    // Check file extension first
    switch (extension) {
      case 'html':
      case 'htm':
        return 'html';
      case 'sql':
        return 'sql';
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
      case 'vue':
      case 'php':
      case 'py':
      case 'java':
      case 'cpp':
      case 'c':
      case 'cs':
      case 'rb':
      case 'go':
      case 'rs':
      case 'swift':
      case 'kt':
      case 'scala':
      case 'r':
      case 'm':
      case 'pl':
      case 'sh':
      case 'bat':
      case 'ps1':
        return 'javascript';
      case 'css':
      case 'scss':
      case 'sass':
      case 'less':
        return 'css';
      case 'json':
        return 'json';
      case 'xml':
        return 'xml';
      case 'yml':
      case 'yaml':
        return 'yaml';
      case 'md':
      case 'markdown':
        return 'markdown';
      default:
        // If no specific extension, try to detect from content
        return 'javascript';
    }
  }

  // Enhanced language detection from code content
  detectLanguageFromCode(code: string): string {
    const trimmedCode = code.trim();
    
    // HTML detection
    if (trimmedCode.startsWith('<!DOCTYPE html') || 
        trimmedCode.startsWith('<html') || 
        trimmedCode.includes('<html') ||
        trimmedCode.includes('<!DOCTYPE')) {
      return 'html';
    }
    
    // SQL detection
    if (trimmedCode.toLowerCase().startsWith('select') || 
        trimmedCode.toLowerCase().includes('from') ||
        trimmedCode.toLowerCase().startsWith('insert') ||
        trimmedCode.toLowerCase().startsWith('update') ||
        trimmedCode.toLowerCase().startsWith('delete') ||
        trimmedCode.toLowerCase().startsWith('create') ||
        trimmedCode.toLowerCase().startsWith('drop') ||
        trimmedCode.toLowerCase().startsWith('alter')) {
      return 'sql';
    }
    
    // CSS detection
    if (trimmedCode.includes('{') && trimmedCode.includes('}') && 
        (trimmedCode.includes('color:') || trimmedCode.includes('background:') || 
         trimmedCode.includes('font-size:') || trimmedCode.includes('margin:') ||
         trimmedCode.includes('padding:') || trimmedCode.includes('border:'))) {
      return 'css';
    }
    
    // JSON detection
    if ((trimmedCode.startsWith('{') && trimmedCode.endsWith('}')) ||
        (trimmedCode.startsWith('[') && trimmedCode.endsWith(']'))) {
      try {
        JSON.parse(trimmedCode);
        return 'json';
      } catch (e) {
        // Not valid JSON, continue to other checks
      }
    }
    
    // YAML detection
    if (trimmedCode.includes(':') && 
        (trimmedCode.includes('version:') || trimmedCode.includes('name:') || 
         trimmedCode.includes('description:') || trimmedCode.includes('dependencies:'))) {
      return 'yaml';
    }
    
    // Markdown detection
    if (trimmedCode.startsWith('#') || 
        trimmedCode.includes('##') || 
        trimmedCode.includes('**') || 
        trimmedCode.includes('*') ||
        trimmedCode.includes('[') && trimmedCode.includes('](')) {
      return 'markdown';
    }
    
    // Default to JavaScript
    return 'javascript';
  }

  // Types Manager erişim metodları
  loadTypesModules(modules: string[]): void {
    console.log('loadTypesModules is deprecated, use addCustomLib instead');
  }

  loadOnlyTypesModules(modules: string[]): void {
    console.log('loadOnlyTypesModules is deprecated, use addCustomLib instead');
  }

  getLoadedTypesModules(): string[] {
    return this.getLoadedLibs();
  }

  addCustomType(content: string, filename: string): void {
    this.addCustomLib(content, filename);
  }

  removeCustomType(filename: string): void {
    // This method is for backward compatibility
    console.log('removeCustomType is deprecated, use removeCustomLib instead');
  }

  // Download menu toggle
  toggleDownloadMenu() {
    console.log('Toggle download menu clicked, current state:', this.showDownloadMenu);
    this.showDownloadMenu = !this.showDownloadMenu;
    console.log('New state:', this.showDownloadMenu);
  }

  // Close download menu
  closeDownloadMenu() {
    this.showDownloadMenu = false;
  }

  // Download file with appropriate extension
  downloadFile() {
    if (isPlatformBrowser(this.platformId) && this.editor) {
      const code = this.editor.getValue();
      const language = this.detectLanguageFromCode(code);
      const script = this.scriptTemplates[this.selectedScriptIndex];
      
      // Get file extension based on language
      let extension = 'js';
      let mimeType = 'text/javascript';
      
      switch (language) {
        case 'html':
          extension = 'html';
          mimeType = 'text/html';
          break;
        case 'sql':
          extension = 'sql';
          mimeType = 'text/sql';
          break;
        case 'javascript':
        default:
          extension = 'js';
          mimeType = 'text/javascript';
          break;
      }
      
      // Create filename with script name
      const filename = `${script.name.replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`;
      
      // Create blob and download
      const blob = new Blob([code], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log(`File downloaded: ${filename}`);
      this.showDownloadMenu = false;
    }
  }

  // Download all open tabs as ZIP
  downloadAsZip() {
    if (isPlatformBrowser(this.platformId) && this.editor) {
      // Import JSZip dynamically
      import('jszip').then((JSZip) => {
        const zip = new JSZip.default();
        
        // Add current editor content
        const code = this.editor.getValue();
        const language = this.detectLanguageFromCode(code);
        const script = this.scriptTemplates[this.selectedScriptIndex];
        
        let extension = 'js';
        switch (language) {
          case 'html':
            extension = 'html';
            break;
          case 'sql':
            extension = 'sql';
            break;
          case 'javascript':
          default:
            extension = 'js';
            break;
        }
        
        const filename = `${script.name.replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`;
        zip.file(filename, code);
        
        // Add all open tabs
        this.openTabs.forEach((tab, index) => {
          const tabLanguage = this.detectLanguageFromCode(tab.code);
          let tabExtension = 'js';
          switch (tabLanguage) {
            case 'html':
              tabExtension = 'html';
              break;
            case 'sql':
              tabExtension = 'sql';
              break;
            case 'javascript':
            default:
              tabExtension = 'js';
              break;
          }
          
          const tabFilename = `${tab.name.replace(/[^a-zA-Z0-9]/g, '_')}.${tabExtension}`;
          zip.file(tabFilename, tab.code);
        });
        
        // Generate and download ZIP
        zip.generateAsync({ type: 'blob' }).then((content: Blob) => {
          const url = window.URL.createObjectURL(content);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'monaco_editor_files.zip';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          console.log('ZIP file downloaded: monaco_editor_files.zip');
          this.showDownloadMenu = false;
        });
      }).catch((error) => {
        console.error('Error creating ZIP:', error);
        alert('ZIP oluşturulurken hata oluştu. Lütfen tekrar deneyin.');
      });
    }
  }
}
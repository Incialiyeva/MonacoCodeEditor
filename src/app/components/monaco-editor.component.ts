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
import { validateHTML } from '../features/language/html-validation.util';
import { validateSQL } from '../features/language/sql-validation.util';
import { SQLExecutorService, SQLResult } from '../services/sql-executor.service';
import { MonacoLanguageRegistryService } from '../services/monaco-language-registry.service';
import { EnhancedSQLLanguageService } from '../services/enhanced-sql-language.service';

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
  styleUrls: ['./monaco-editor.component.scss'],
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

  // Save confirmation modal için
  showSaveConfirmation = false;

  // Run/Debug için
  showRunOutput = false;
  runOutput: string = '';
  isRunning = false;
  isDebugging = false;
  debugOutput: string = '';
  executionTime: number = 0;

  // Toolbar visibility control
  showToolbar = false;

  // Debug properties - eksik olan property'leri ekliyorum
  showVariablesPanel = false;
  showCallStackPanel = false;
  debugCallStack: any[] = [];
  debugVariables: Record<string, any> = {};

  // Breakpoint management - yeni özellikler
  breakpoints: Set<number> = new Set();
  breakpointDecorations: string[] = [];
  hoverProvider: any = null;

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
    private hostRef: ElementRef,
    private sqlExecutor: SQLExecutorService,
    private monacoLanguageRegistry: MonacoLanguageRegistryService,
    private enhancedSQLService: EnhancedSQLLanguageService
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
        
        // Initialize saved code for this script if not already saved
        const scriptKey = `script_${newScriptIndex}`;
        if (!this.lastSavedCodeByTab[scriptKey]) {
          this.lastSavedCodeByTab[scriptKey] = selectedScript.code;
          this.originalCodeByTab[scriptKey] = selectedScript.code;
        }
        
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
      (window as any).MonacoEnvironment = {
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
        // Monaco Editor dil modüllerini yükle ve yapılandır
        this.configureMonacoLanguages();
        
        // FULL Language Service Support
        this.monacoLanguageRegistry.initializeLanguageServices(window.monaco);
        this.enhancedSQLService.registerSQLLanguageService(window.monaco);
        
        // IntelliSense Provider'ı initialize et
        this.intelliSenseProvider = initializeMonacoIntelliSense(window.monaco);

        const selectedScript = this.scriptTemplates[this.selectedScriptIndex];
        if (selectedScript) {
          const language = this.detectLanguageFromCode(selectedScript.code);
          this.editor = window.monaco.editor.create(this.editorContainer.nativeElement, {
            value: selectedScript.code,
            language: language,
            theme: this.editorTheme,
            automaticLayout: true,
            // Breakpoint desteği için glyph margin'i aktif et
            glyphMargin: true,
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
            wordBasedSuggestions: 'currentDocument',
            parameterHints: {
              enabled: true,
              cycle: true
            },
            suggest: {
              localityBonus: true,
              snippetsPreventQuickSuggestions: false,
              showIcons: true,
              maxVisibleSuggestions: 12,
              insertMode: 'replace',
              filterGraceful: true,
              showKeywords: true,
              showSnippets: true,
              showWords: true,
              showClasses: true,
              showFunctions: true,
              showConstructors: true,
              showFields: true,
              showVariables: true,
              showInterfaces: true,
              showModules: true,
              showProperties: true,
              showEvents: true,
              showOperators: true,
              showUnits: true,
              showValues: true,
              showConstants: true,
              showEnums: true,
              showEnumMembers: true,
              showReferences: true,
              showFolders: true,
              showTypeParameters: true,
              showIssues: true,
              showUsers: true,
              showColors: true
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
            },
            // VS Code benzeri özellikler
            folding: true,
            foldingStrategy: 'auto',
            showFoldingControls: 'always',
            unfoldOnClickAfterEndOfLine: false,
            foldingHighlight: true,
            foldingImportsByDefault: false,
            links: true,
            colorDecorators: true,
            lightbulb: {
              enabled: true
            },
            codeActionsOnSave: {
              'source.organizeImports': true
            },
            formatOnPaste: true,
            formatOnType: true,
            autoIndent: 'full',
            bracketPairColorization: {
              enabled: true
            },
            guides: {
              bracketPairs: 'active',
              bracketPairsHorizontal: 'active',
              highlightActiveBracketPair: true,
              indentation: true,
              highlightActiveIndentation: true
            },
            unicodeHighlight: {
              ambiguousCharacters: true,
              invisibleCharacters: true
            },
            inlineSuggest: {
              enabled: true
            },
            stickyScroll: {
              enabled: true
            }
          });
          
          // Breakpoint ve hover özelliklerini initialize et
          this.initializeBreakpointSupport();
          this.initializeHoverProvider();
          
          // Editor içeriği değiştiğinde script template'ini güncelle
          this.editor.onDidChangeModelContent(() => {
            this.scriptTemplates[this.selectedScriptIndex].code = this.editor.getValue();
            // Kod hatalarını otomatik kontrol et
            setTimeout(() => this.checkCodeErrors(), 500);
          });
          
          // Initialize saved codes for all scripts
          this.initializeSavedCodes();
          
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
            id: 'run-code',
            label: 'Run Code',
            keybindings: [
              window.monaco.KeyMod.Ctrl | window.monaco.KeyCode.F5
            ],
            contextMenuGroupId: '9_cutcopypaste',
            contextMenuOrder: 1.0,
            run: async (ed: any) => {
              await this.runCode();
            }
          });
          
          this.editor.addAction({
            id: 'debug-code',
            label: 'Debug Code',
            keybindings: [
              window.monaco.KeyCode.F5
            ],
            contextMenuGroupId: '9_cutcopypaste',
            contextMenuOrder: 1.1,
            run: async (ed: any) => {
              await this.debugCode();
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
      // Show diff view first, let user review changes
      this.showDiffForSave();
    }
  }

  // Show diff view for save confirmation
  showDiffForSave() {
    if (isPlatformBrowser(this.platformId) && this.editor && window.monaco) {
      const script = this.scriptTemplates[this.selectedScriptIndex];
      const scriptKey = `script_${this.selectedScriptIndex}`;
      
      // Get the last saved version
      const original = this.lastSavedCodeByTab[scriptKey] || script.code;
      const modified = this.editor.getValue();
      
      // Detect language for diff
      const language = this.detectLanguageFromCode(modified);
      
      console.log('Showing diff for save confirmation');
      console.log('Original (saved):', original.substring(0, 100) + '...');
      console.log('Modified (current):', modified.substring(0, 100) + '...');
      
      // Show Monaco diff with save confirmation
      showMonacoDiff({
        monaco: window.monaco,
        editor: this.editor,
        original,
        modified,
        language,
        theme: this.selectedTheme
      });
      
      // Show save confirmation modal after diff
      setTimeout(() => {
        this.showSaveConfirmationModal();
      }, 1000);
    }
  }

  // Confirm save after user reviews diff
  confirmSave() {
    if (isPlatformBrowser(this.platformId) && this.editor) {
      const code = this.editor.getValue();
      const script = this.scriptTemplates[this.selectedScriptIndex];
      
      // Save the current code to the script template
      script.code = code;
      
      // Store the saved code for diff comparison
      const scriptKey = `script_${this.selectedScriptIndex}`;
      this.lastSavedCodeByTab[scriptKey] = code;
      
      // Also store in original code for diff
      this.originalCodeByTab[scriptKey] = code;
      
      console.log('Code saved successfully after diff confirmation:', script.name);
      
      // Show success message
      this.showSaveSuccessMessage();
      
      // Close the modal
      this.showSaveConfirmation = false;
    }
  }

  // Cancel save after diff review
  cancelSave() {
    console.log('Save cancelled by user');
    // Close the modal
    this.showSaveConfirmation = false;
    // Optionally show a message that save was cancelled
    this.showCancelMessage();
  }

  // Show cancel message
  showCancelMessage() {
    const message = document.createElement('div');
    message.textContent = 'Save cancelled';
    message.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff6b6b;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 600;
      z-index: 10000;
      box-shadow: 0 4px 16px rgba(255, 107, 107, 0.3);
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
      if (message.parentNode) {
        message.parentNode.removeChild(message);
      }
    }, 3000);
  }

  // Show save success message
  showSaveSuccessMessage() {
    // Create a temporary success message
    const message = document.createElement('div');
    message.textContent = 'Code saved successfully!';
    message.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #3fb950;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 600;
      z-index: 10000;
      box-shadow: 0 4px 16px rgba(63, 185, 80, 0.3);
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(message);
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (message.parentNode) {
        message.parentNode.removeChild(message);
      }
    }, 3000);
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
      const script = this.scriptTemplates[this.selectedScriptIndex];
      const scriptKey = `script_${this.selectedScriptIndex}`;
      
      // Get the last saved version
      const original = this.lastSavedCodeByTab[scriptKey] || script.code;
      const modified = this.editor.getValue();
      
      // Detect language for diff
      const language = this.detectLanguageFromCode(modified);
      
      console.log('Showing diff between saved and current version');
      console.log('Original (saved):', original.substring(0, 100) + '...');
      console.log('Modified (current):', modified.substring(0, 100) + '...');
      
      // Always show Monaco diff, even if files are identical
      showMonacoDiff({
        monaco: window.monaco,
        editor: this.editor,
        original,
        modified,
        language,
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
      const scriptKey = `script_${this.selectedScriptIndex}`;
      
      // Get the last saved version
      const savedCode = this.lastSavedCodeByTab[scriptKey] || script.code;
      
      // Revert to the saved version
      this.editor.setValue(savedCode);
      
      // Update the script template to match
      script.code = savedCode;
      
      console.log('Changes reverted to last saved version');
      
      // Show a brief revert message
      this.showRevertMessage();
    }
  }

  // Show revert message
  showRevertMessage() {
    const message = document.createElement('div');
    message.textContent = 'Changes reverted!';
    message.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ffb300;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 600;
      z-index: 10000;
      box-shadow: 0 4px 16px rgba(255, 179, 0, 0.3);
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
      if (message.parentNode) {
        message.parentNode.removeChild(message);
      }
    }, 3000);
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
      this.intelliSenseProvider.addLibOld({ content, targetFileSrc });
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
    
    // JavaScript detection first (before SQL to avoid conflicts)
    if (trimmedCode.includes('function') || 
        trimmedCode.includes('=>') ||
        trimmedCode.includes('const ') ||
        trimmedCode.includes('let ') ||
        trimmedCode.includes('var ') ||
        trimmedCode.includes('console.') ||
        trimmedCode.includes('document.') ||
        trimmedCode.includes('.js') ||
        trimmedCode.includes('Array.') ||
        trimmedCode.includes('Math.') ||
        trimmedCode.includes('JSON.') ||
        trimmedCode.includes('class ') ||
        trimmedCode.includes('import ') ||
        trimmedCode.includes('export ') ||
        trimmedCode.includes('async ') ||
        trimmedCode.includes('await ') ||
        trimmedCode.includes('typeof ') ||
        trimmedCode.includes('instanceof ')) {
      return 'javascript';
    }
    
    // SQL detection - daha spesifik kontroller
    const codeLines = trimmedCode.toLowerCase().split('\n');
    const sqlKeywords = ['select', 'insert', 'update', 'delete', 'create', 'drop', 'alter'];
    let sqlLineCount = 0;
    
    for (const line of codeLines) {
      const cleanLine = line.trim();
      // SQL satırı kontrolü - sadece satır başında SQL keyword varsa
      if (sqlKeywords.some(keyword => 
        cleanLine.startsWith(keyword + ' ') || 
        cleanLine.startsWith(keyword + '\t') ||
        cleanLine === keyword
      )) {
        sqlLineCount++;
      }
    }
    
    // En az 1 SQL satırı varsa ve JavaScript belirtileri yoksa SQL
    if (sqlLineCount > 0 && 
        !trimmedCode.includes('function') && 
        !trimmedCode.includes('=>') &&
        !trimmedCode.includes('const ') &&
        !trimmedCode.includes('let ') &&
        !trimmedCode.includes('var ') &&
        !trimmedCode.includes('console.') &&
        !trimmedCode.includes('Array.') &&
        !trimmedCode.includes('.js')) {
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

  // Initialize saved codes for all scripts
  initializeSavedCodes() {
    this.scriptTemplates.forEach((script, index) => {
      const scriptKey = `script_${index}`;
      this.lastSavedCodeByTab[scriptKey] = script.code;
      this.originalCodeByTab[scriptKey] = script.code;
    });
  }

  // Show save confirmation modal
  showSaveConfirmationModal() {
    this.showSaveConfirmation = true;
  }

  // Run Code - VS Code benzeri run özelliği
  async runCode() {
    if (isPlatformBrowser(this.platformId) && this.editor) {
      const code = this.editor.getValue();
      const language = this.detectLanguageFromCode(code);
      
      this.isRunning = true;
      this.showRunOutput = true;
      this.runOutput = 'Running...\n';
      
      const startTime = performance.now();
      
      try {
        switch (language) {
          case 'javascript':
            await this.runJavaScript(code);
            break;
          case 'html':
            await this.runHTML(code);
            break;
          case 'sql':
            await this.runSQL(code);
            break;
          default:
            this.runOutput = 'Language not supported for execution\n';
        }
      } catch (error: any) {
        this.runOutput += `\nError: ${error.message || error}\n`;
      } finally {
        const endTime = performance.now();
        this.executionTime = endTime - startTime;
        this.isRunning = false;
        this.runOutput += `\nExecution completed in ${this.executionTime.toFixed(2)}ms\n`;
      }
    }
  }

  // Debug Code - VS Code benzeri debug özelliği  
  async debugCode() {
    if (isPlatformBrowser(this.platformId) && this.editor) {
      const code = this.editor.getValue();
      const language = this.detectLanguageFromCode(code);
      
      this.isDebugging = true;
      this.showRunOutput = true;
      this.debugOutput = 'Starting debug session...\n';
      this.runOutput = this.debugOutput;
      
      // Debug panel'leri açma opsiyon
      if (this.breakpoints.size > 0) {
        this.debugOutput += `Found ${this.breakpoints.size} breakpoint(s) at lines: ${Array.from(this.breakpoints).join(', ')}\n`;
        this.runOutput += this.debugOutput;
        
        // Debug panellerini otomatik aç
        this.showVariablesPanel = true;
        this.showCallStackPanel = true;
        this.updateDebugVariables();
        this.updateDebugCallStack();
      }
      
      const startTime = performance.now();
      
      try {
        switch (language) {
          case 'javascript':
            await this.debugJavaScript(code);
            break;
          case 'html':
            await this.debugHTML(code);
            break;
          case 'sql':
            await this.debugSQL(code);
            break;
          default:
            this.runOutput = 'Language not supported for debugging\n';
        }
      } catch (error: any) {
        this.runOutput += `\nDebug Error: ${error.message || error}\n`;
      } finally {
        const endTime = performance.now();
        this.executionTime = endTime - startTime;
        this.isDebugging = false;
        this.runOutput += `\nDebug session completed in ${this.executionTime.toFixed(2)}ms\n`;
        
        // Debug panellerini kapat
        setTimeout(() => {
          this.showVariablesPanel = false;
          this.showCallStackPanel = false;
        }, 3000);
      }
    }
  }

  // JavaScript execution
  private async runJavaScript(code: string) {
    this.runOutput += 'Executing JavaScript...\n';
    
    try {
      // Capture console.log output
      const originalLog = console.log;
      const logs: string[] = [];
      
      console.log = (...args) => {
        logs.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' '));
      };
      
      // Execute the code using Function constructor instead of eval
      const executeFunction = new Function('console', code);
      const result = executeFunction(console);
      
      // Restore console.log
      console.log = originalLog;
      
      // Show output
      if (logs.length > 0) {
        this.runOutput += 'Console Output:\n' + logs.join('\n') + '\n';
      }
      
      if (result !== undefined) {
        this.runOutput += `\nReturn Value: ${typeof result === 'object' ? JSON.stringify(result, null, 2) : result}\n`;
      }
      
      this.runOutput += '\nJavaScript executed successfully!\n';
      
    } catch (error: any) {
      this.runOutput += `\nJavaScript Error: ${error.message}\n`;
      if (error.stack) {
        this.runOutput += `Stack: ${error.stack}\n`;
      }
    }
  }

  // HTML preview
  private async runHTML(code: string) {
    this.runOutput += 'Opening HTML preview...\n';
    
    try {
      // HTML içeriğini blob olarak oluştur ve yeni sekmede aç
      const blob = new Blob([code], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      
      // Yeni sekmede aç
      const newWindow = window.open(url, '_blank');
      
      if (newWindow) {
        this.runOutput += 'HTML preview opened in new tab successfully!\n';
        this.runOutput += `Preview URL: ${url}\n`;
        
        // URL'yi kısa süre sonra temizle
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 60000);
      } else {
        this.runOutput += 'Failed to open HTML preview. Please allow popups for this site.\n';
      }
      
    } catch (error: any) {
      this.runOutput += `\nHTML Preview Error: ${error.message}\n`;
    }
  }

  // SQL execution with real SQLite database
  private async runSQL(code: string) {
    this.runOutput += 'Connecting to SQL database...\n';
    
    try {
      // SQL validation (gevşek)
      const validation = validateSQL(code);
      
      if (!validation.isValid) {
        this.runOutput += '\nSQL Validation Warnings:\n';
        validation.errors.forEach(error => {
          this.runOutput += `⚠️ ${error}\n`;
        });
        this.runOutput += '\n📄 Continuing execution...\n\n';
      } else {
        this.runOutput += '✅ SQL validation passed!\n\n';
      }
      
      // Gerçek SQL execution
      this.runOutput += '🚀 Executing SQL statements...\n\n';
      const result: SQLResult = await this.sqlExecutor.executeSQL(code);
      
      if (!result.success) {
        this.runOutput += `❌ SQL Execution Error:\n${result.error}\n`;
        return;
      }
      
      // Sonuçları formatla ve göster
      this.displaySQLResults(result);
      
    } catch (error: any) {
      this.runOutput += `\n💥 Unexpected Error: ${error.message}\n`;
    }
  }

  private displaySQLResults(result: SQLResult): void {
    if (!result.data || result.data.length === 0) {
      this.runOutput += '✅ SQL executed successfully (no results to display)\n';
      return;
    }

    result.data.forEach((statementResult, index) => {
      this.runOutput += `--- Statement ${index + 1} ---\n`;
      
      if (statementResult.columns && statementResult.values) {
        // SELECT sorgusu - tablo formatında göster
        this.runOutput += this.formatResultTable(statementResult.columns, statementResult.values);
        this.runOutput += `\n📊 ${statementResult.values.length} row(s) returned\n\n`;
        
      } else if (statementResult.rowsAffected !== undefined) {
        // INSERT, UPDATE, DELETE, CREATE vs.
        const statement = statementResult.statement.trim().toUpperCase();
        
        if (statement.startsWith('CREATE TABLE')) {
          const tableMatch = statement.match(/CREATE\s+TABLE\s+(\w+)/i);
          const tableName = tableMatch ? tableMatch[1] : 'table';
          this.runOutput += `✅ Table '${tableName}' created successfully\n\n`;
          
        } else if (statement.startsWith('INSERT')) {
          this.runOutput += `✅ ${statementResult.rowsAffected} row(s) inserted\n\n`;
          
        } else if (statement.startsWith('UPDATE')) {
          this.runOutput += `✅ ${statementResult.rowsAffected} row(s) updated\n\n`;
          
        } else if (statement.startsWith('DELETE')) {
          this.runOutput += `✅ ${statementResult.rowsAffected} row(s) deleted\n\n`;
          
        } else {
          this.runOutput += `✅ Statement executed successfully\n\n`;
        }
      }
    });
    
    this.runOutput += `⏱️ Execution completed in ${result.executionTime?.toFixed(2)}ms\n`;
    
    // Mevcut tabloları göster
    this.showCurrentTables();
  }

  private formatResultTable(columns: string[], values: any[][]): string {
    if (values.length === 0) {
      return '(No results)\n';
    }

    // Kolon genişliklerini hesapla
    const columnWidths = columns.map((col, index) => {
      const maxValueWidth = Math.max(...values.map(row => String(row[index] || '').length));
      return Math.max(col.length, maxValueWidth, 3);
    });

    // Header satırı
    let table = '| ';
    columns.forEach((col, index) => {
      table += col.padEnd(columnWidths[index]) + ' | ';
    });
    table += '\n';

    // Separator satırı
    table += '|';
    columnWidths.forEach(width => {
      table += '-'.repeat(width + 2) + '|';
    });
    table += '\n';

    // Data satırları
    values.forEach(row => {
      table += '| ';
      row.forEach((cell, index) => {
        const cellStr = String(cell || '');
        table += cellStr.padEnd(columnWidths[index]) + ' | ';
      });
      table += '\n';
    });

    return table;
  }

  private async showCurrentTables(): Promise<void> {
    try {
      const tables = await this.sqlExecutor.getTables();
      if (tables.length > 0) {
        this.runOutput += `\n📋 Current tables in database: ${tables.join(', ')}\n`;
      } else {
        this.runOutput += `\n📋 No tables in database\n`;
      }
    } catch (error) {
      console.error('Error getting tables:', error);
    }
  }

  // JavaScript debugging with step-by-step analysis
  private async debugJavaScript(code: string) {
    this.runOutput += 'Starting JavaScript debug session...\n';
    
    try {
      // Analyze code structure
      const lines = code.split('\n');
      this.runOutput += `\nCode Analysis:\n`;
      this.runOutput += `- Total lines: ${lines.length}\n`;
      
      const functions = code.match(/function\s+\w+/g) || [];
      const variables = code.match(/(?:var|let|const)\s+\w+/g) || [];
      const loops = code.match(/for\s*\(|while\s*\(/g) || [];
      const conditionals = code.match(/if\s*\(/g) || [];
      
      this.runOutput += `- Functions declared: ${functions.length} (${functions.join(', ')})\n`;
      this.runOutput += `- Variables declared: ${variables.length} (${variables.join(', ')})\n`;
      this.runOutput += `- Loops found: ${loops.length}\n`;
      this.runOutput += `- Conditionals found: ${conditionals.length}\n`;
      
      // Simulate step-by-step execution
      this.runOutput += '\nStep-by-step execution simulation:\n';
      lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        const lineNumber = index + 1;
        
        if (trimmedLine && !trimmedLine.startsWith('//') && !trimmedLine.startsWith('/*')) {
          // Check if this is a breakpoint line
          if (this.breakpoints.has(lineNumber)) {
            this.runOutput += `🔴 BREAKPOINT → Line ${lineNumber}: ${trimmedLine}\n`;
            this.runOutput += `    ⏸️  Execution paused for debugging\n`;
            
            // Show variable state at breakpoint
            this.runOutput += `    📊 Variable inspection available\n`;
            this.simulateVariableState(trimmedLine, lineNumber);
          } else {
            this.runOutput += `Line ${lineNumber}: ${trimmedLine}\n`;
          }
          
          // Simulate execution analysis
          if (trimmedLine.includes('console.log')) {
            this.runOutput += `  → Console output detected\n`;
          }
          if (trimmedLine.includes('=') && !trimmedLine.includes('==') && !trimmedLine.includes('===')) {
            this.runOutput += `  → Variable assignment detected\n`;
          }
          if (trimmedLine.includes('function')) {
            this.runOutput += `  → Function definition detected\n`;
          }
        }
      });
      
      // Try to execute the code safely
      this.runOutput += '\nAttempting controlled execution...\n';
      try {
        // Create a safer execution environment using Function constructor
        const safeCode = this.createSafeExecutionWrapper(code);
        const executeFunction = new Function('return ' + safeCode);
        const result = executeFunction();
        this.runOutput += `✅ Code executed successfully\n`;
        if (result !== undefined) {
          this.runOutput += `📤 Final result: ${result}\n`;
        }
      } catch (execError: any) {
        this.runOutput += `❌ Runtime error: ${execError.message}\n`;
      }
      
    } catch (error: any) {
      this.runOutput += `Debug Error: ${error.message}\n`;
    }
  }

  // Simulate variable state for debugging
  private simulateVariableState(line: string, lineNumber: number) {
    // Extract variable assignments and function calls for simulation
    const varMatches = line.match(/(?:var|let|const)\s+(\w+)\s*=\s*(.+)/);
    const assignMatches = line.match(/(\w+)\s*=\s*(.+)/);
    
    if (varMatches) {
      const varName = varMatches[1];
      const varValue = varMatches[2].trim();
      this.debugVariables[varName] = `${this.inferType(varValue)}: ${varValue}`;
    } else if (assignMatches && !line.includes('==') && !line.includes('===')) {
      const varName = assignMatches[1];
      const varValue = assignMatches[2].trim();
      this.debugVariables[varName] = `${this.inferType(varValue)}: ${varValue}`;
    }
    
    // Add line context
    this.debugVariables[`__currentLine`] = `number: ${lineNumber}`;
    this.debugVariables[`__currentStatement`] = `string: "${line.trim()}"`;
  }

  // Infer variable type for debugging
  private inferType(value: string): string {
    if (value.match(/^["'`]/)) return 'string';
    if (value.match(/^\d+$/)) return 'number';
    if (value.match(/^\d*\.\d+$/)) return 'number';
    if (value === 'true' || value === 'false') return 'boolean';
    if (value.startsWith('[') || value.startsWith('Array')) return 'array';
    if (value.startsWith('{') || value.startsWith('Object')) return 'object';
    if (value.includes('function') || value.includes('=>')) return 'function';
    return 'unknown';
  }

  // Create safer execution wrapper
  private createSafeExecutionWrapper(code: string): string {
    return `
      (function() {
        try {
          ${code}
        } catch (e) {
          return 'Error: ' + e.message;
        }
      })();
    `;
  }

  // HTML debugging - analyze structure
  private async debugHTML(code: string) {
    this.runOutput += 'Starting HTML debug session...\n';
    
    try {
      // HTML structure analysis
      const tags = code.match(/<\w+/g) || [];
      const closingTags = code.match(/<\/\w+>/g) || [];
      const selfClosingTags = code.match(/<\w+[^>]*\/>/g) || [];
      
      this.runOutput += `\nHTML Structure Analysis:\n`;
      this.runOutput += `- Opening tags: ${tags.length}\n`;
      this.runOutput += `- Closing tags: ${closingTags.length}\n`;
      this.runOutput += `- Self-closing tags: ${selfClosingTags.length}\n`;
      
      // Check for common HTML elements
      const hasDoctype = code.toLowerCase().includes('<!doctype');
      const hasHtml = code.includes('<html');
      const hasHead = code.includes('<head');
      const hasBody = code.includes('<body');
      
      this.runOutput += `\nDocument Structure:\n`;
      this.runOutput += `- DOCTYPE declaration: ${hasDoctype ? '✓' : '✗'}\n`;
      this.runOutput += `- HTML element: ${hasHtml ? '✓' : '✗'}\n`;
      this.runOutput += `- HEAD section: ${hasHead ? '✓' : '✗'}\n`;
      this.runOutput += `- BODY section: ${hasBody ? '✓' : '✗'}\n`;
      
      // Validate HTML
      const validation = validateHTML(code);
      if (!validation.isValid) {
        this.runOutput += '\nHTML Validation Issues:\n';
        validation.errors.forEach(error => {
          this.runOutput += `- ${error}\n`;
        });
      } else {
        this.runOutput += '\nHTML validation passed!\n';
      }
      
      // Run HTML preview
      await this.runHTML(code);
      
    } catch (error: any) {
      this.runOutput += `\nHTML Debug Error: ${error.message}\n`;
    }
  }

  // SQL debugging - detailed analysis
  private async debugSQL(code: string) {
    this.runOutput += 'Starting SQL debug session...\n';
    
    try {
      // SQL structure analysis
      const statements = code.split(';').filter(s => s.trim());
      this.runOutput += `\nSQL Analysis:\n`;
      this.runOutput += `- Number of statements: ${statements.length}\n`;
      
      statements.forEach((statement, index) => {
        const trimmed = statement.trim();
        if (trimmed) {
          const type = this.detectSQLType(trimmed);
          this.runOutput += `Statement ${index + 1}: ${type} - "${trimmed.substring(0, 50)}..."\n`;
        }
      });
      
      // Analyze keywords
      const keywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'GROUP BY', 'ORDER BY', 'HAVING'];
      this.runOutput += `\nKeyword usage:\n`;
      keywords.forEach(keyword => {
        const count = (code.toUpperCase().match(new RegExp(keyword, 'g')) || []).length;
        if (count > 0) {
          this.runOutput += `- ${keyword}: ${count} times\n`;
        }
      });
      
      // Run SQL validation and execution
      await this.runSQL(code);
      
    } catch (error: any) {
      this.runOutput += `\nSQL Debug Error: ${error.message}\n`;
    }
  }

  // Detect SQL statement type
  private detectSQLType(sql: string): string {
    // Yorumları ve boş satırları filtrele, sonra ilk SQL statement'ı bul
    const lines = sql.split('\n');
    const sqlStatements: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      // Yorum satırlarını ve boş satırları atla
      if (!trimmed || trimmed.startsWith('--')) {
        continue;
      }
      sqlStatements.push(trimmed);
    }
    
    // Tüm SQL statement'ları birleştir ve ilk keyword'ü bul
    const fullSQL = sqlStatements.join(' ').trim().toUpperCase();
    
    if (fullSQL.startsWith('SELECT')) return 'SELECT';
    if (fullSQL.startsWith('INSERT')) return 'INSERT';
    if (fullSQL.startsWith('UPDATE')) return 'UPDATE';
    if (fullSQL.startsWith('DELETE')) return 'DELETE';
    if (fullSQL.startsWith('CREATE TABLE')) return 'CREATE TABLE';
    if (fullSQL.startsWith('CREATE INDEX')) return 'CREATE INDEX';
    if (fullSQL.startsWith('CREATE VIEW')) return 'CREATE VIEW';
    if (fullSQL.startsWith('CREATE')) return 'CREATE';
    if (fullSQL.startsWith('DROP TABLE')) return 'DROP TABLE';
    if (fullSQL.startsWith('DROP INDEX')) return 'DROP INDEX';
    if (fullSQL.startsWith('DROP')) return 'DROP';
    if (fullSQL.startsWith('ALTER TABLE')) return 'ALTER TABLE';
    if (fullSQL.startsWith('ALTER')) return 'ALTER';
    
    // Eğer birden fazla statement varsa, hepsini listele
    const statements = fullSQL.split(';').filter(s => s.trim());
    if (statements.length > 1) {
      const types = statements.map(stmt => {
        const trimmedStmt = stmt.trim();
        if (trimmedStmt.startsWith('CREATE TABLE')) return 'CREATE TABLE';
        if (trimmedStmt.startsWith('INSERT')) return 'INSERT';
        if (trimmedStmt.startsWith('SELECT')) return 'SELECT';
        if (trimmedStmt.startsWith('UPDATE')) return 'UPDATE';
        if (trimmedStmt.startsWith('DELETE')) return 'DELETE';
        return 'OTHER';
      }).filter(type => type !== 'OTHER');
      
      if (types.length > 0) {
        return `MULTIPLE (${types.join(', ')})`;
      }
    }
    
    return 'UNKNOWN';
  }

  // Close run output panel
  closeRunOutput() {
    this.showRunOutput = false;
    this.runOutput = '';
    this.isRunning = false;
    this.isDebugging = false;
  }

  // Clear run output
  clearRunOutput() {
    this.runOutput = '';
    this.debugOutput = '';
  }

  // Toggle toolbar visibility
  toggleToolbar() {
    this.showToolbar = !this.showToolbar;
  }

  // Close toolbar
  closeToolbar() {
    this.showToolbar = false;
  }

  // Breakpoint yönetimi metodları
  private initializeBreakpointSupport() {
    if (!isPlatformBrowser(this.platformId) || !this.editor) return;

    // Mouse down event listener - glyph margin tıklaması için
    this.editor.onMouseDown((e: any) => {
      if (e.target && e.target.type === window.monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        const lineNumber = e.target.position.lineNumber;
        this.toggleBreakpoint(lineNumber);
      }
    });

    // İlk breakpoint decorasyonlarını ayarla
    this.updateBreakpointDecorations();
  }

  // Breakpoint toggle işlemi
  toggleBreakpoint(lineNumber: number) {
    if (this.breakpoints.has(lineNumber)) {
      this.breakpoints.delete(lineNumber);
    } else {
      this.breakpoints.add(lineNumber);
    }
    this.updateBreakpointDecorations();
  }

  // Breakpoint decorasyonlarını güncelle
  private updateBreakpointDecorations() {
    if (!this.editor || !window.monaco) return;

    const decorations = Array.from(this.breakpoints).map(lineNumber => ({
      range: new window.monaco.Range(lineNumber, 1, lineNumber, 1),
      options: {
        isWholeLine: false, // Sadece glyph margin'de göster
        glyphMarginClassName: 'my-breakpoint-glyph',
        glyphMarginHoverMessage: { value: `Breakpoint on line ${lineNumber}` },
        // inlineClassName'i kaldırıyorum - artık satır highlight'ı olmayacak
      }
    }));

    this.breakpointDecorations = this.editor.deltaDecorations(
      this.breakpointDecorations,
      decorations
    );
  }

  // Hover provider'ı initialize et  
  private initializeHoverProvider() {
    if (!isPlatformBrowser(this.platformId) || !window.monaco) return;

    // TypeScript/JavaScript için hover provider
    this.hoverProvider = window.monaco.languages.registerHoverProvider('typescript', {
      provideHover: (model: any, position: any) => {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const wordText = word.word;
        const lineContent = model.getLineContent(position.lineNumber);
        const fullCode = model.getValue();
        
        // Detaylı analiz yap
        const hoverInfo = this.getDetailedHoverInfo(wordText, lineContent, fullCode, position.lineNumber);
        
        if (hoverInfo) {
          return {
            range: new window.monaco.Range(
              position.lineNumber,
              word.startColumn,
              position.lineNumber,
              word.endColumn
            ),
            contents: hoverInfo.contents
          };
        }
        return null;
      }
    });

    // JavaScript için de aynı provider'ı kaydet
    window.monaco.languages.registerHoverProvider('javascript', {
      provideHover: (model: any, position: any) => {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const wordText = word.word;
        const lineContent = model.getLineContent(position.lineNumber);
        const fullCode = model.getValue();
        
        const hoverInfo = this.getDetailedHoverInfo(wordText, lineContent, fullCode, position.lineNumber);
        
        if (hoverInfo) {
          return {
            range: new window.monaco.Range(
              position.lineNumber,
              word.startColumn,
              position.lineNumber,
              word.endColumn
            ),
            contents: hoverInfo.contents
          };
        }
        return null;
      }
    });

    // HTML için hover provider
    window.monaco.languages.registerHoverProvider('html', {
      provideHover: (model: any, position: any) => {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const wordText = word.word;
        const lineContent = model.getLineContent(position.lineNumber);
        
        const htmlInfo = this.getHTMLHoverInfo(wordText, lineContent);
        
        if (htmlInfo) {
          return {
            range: new window.monaco.Range(
              position.lineNumber,
              word.startColumn,
              position.lineNumber,
              word.endColumn
            ),
            contents: htmlInfo.contents
          };
        }
        return null;
      }
    });

    // SQL için hover provider
    window.monaco.languages.registerHoverProvider('sql', {
      provideHover: (model: any, position: any) => {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const wordText = word.word.toUpperCase();
        const lineContent = model.getLineContent(position.lineNumber);
        
        const sqlInfo = this.getSQLHoverInfo(wordText, lineContent);
        
        if (sqlInfo) {
          return {
            range: new window.monaco.Range(
              position.lineNumber,
              word.startColumn,
              position.lineNumber,
              word.endColumn
            ),
            contents: sqlInfo.contents
          };
        }
        return null;
      }
    });
  }

  // Detaylı hover bilgisi al
  private getDetailedHoverInfo(word: string, lineContent: string, fullCode: string, lineNumber: number): { contents: any[] } | null {
    // 1. Built-in JavaScript/TypeScript objelerini kontrol et
    const builtinInfo = this.getBuiltinInfo(word);
    if (builtinInfo) {
      return { contents: builtinInfo };
    }

    // 2. Kod içinde tanımlanan değişken/fonksiyonları analiz et
    const customInfo = this.analyzeCustomSymbol(word, lineContent, fullCode, lineNumber);
    if (customInfo) {
      return { contents: customInfo };
    }

    // 3. Genel kelime bilgisi
    const generalInfo = this.getGeneralWordInfo(word, lineContent);
    if (generalInfo) {
      return { contents: generalInfo };
    }

    return null;
  }

  // Built-in objeler için detaylı bilgi
  private getBuiltinInfo(word: string): any[] | null {
    const builtins: Record<string, { type: string, description: string, syntax?: string, examples?: string[], methods?: string[] }> = {
      'console': {
        type: 'Console',
        description: 'Tarayıcının debugging console\'una erişim sağlar.',
        syntax: 'console.method()',
        examples: [
          'console.log("Hello World")',
          'console.error("Error message")',
          'console.warn("Warning message")'
        ],
        methods: ['log()', 'error()', 'warn()', 'info()', 'table()', 'clear()']
      },
      'document': {
        type: 'Document',
        description: 'Tarayıcıda yüklenen web sayfasını temsil eder.',
        syntax: 'document.property | document.method()',
        examples: [
          'document.getElementById("myId")',
          'document.querySelector(".myClass")',
          'document.createElement("div")'
        ],
        methods: ['getElementById()', 'querySelector()', 'createElement()', 'addEventListener()']
      },
      'window': {
        type: 'Window',
        description: 'DOM document içeren pencereyi temsil eder.',
        syntax: 'window.property | window.method()',
        examples: [
          'window.alert("Message")',
          'window.open("url")',
          'window.location.href'
        ],
        methods: ['alert()', 'confirm()', 'prompt()', 'open()', 'close()']
      },
      'Array': {
        type: 'ArrayConstructor',
        description: 'Array objesi oluşturmak için kullanılır.',
        syntax: 'new Array() | Array.method()',
        examples: [
          'let arr = new Array(1, 2, 3)',
          'Array.from([1, 2, 3])',
          'Array.isArray(arr)'
        ],
        methods: ['from()', 'isArray()', 'of()']
      },
      'Math': {
        type: 'Math',
        description: 'Matematik işlemleri ve sabitleri sağlar.',
        syntax: 'Math.property | Math.method()',
        examples: [
          'Math.PI',
          'Math.random()',
          'Math.max(1, 2, 3)',
          'Math.round(4.7)'
        ],
        methods: ['abs()', 'ceil()', 'floor()', 'max()', 'min()', 'random()', 'round()']
      },
      'JSON': {
        type: 'JSON',
        description: 'JavaScript Object Notation formatına çevirme işlemleri.',
        syntax: 'JSON.method()',
        examples: [
          'JSON.stringify({name: "John"})',
          'JSON.parse(\'{"name": "John"}\')'
        ],
        methods: ['stringify()', 'parse()']
      },
      'Date': {
        type: 'DateConstructor',
        description: 'Tarih ve saat işlemleri için kullanılır.',
        syntax: 'new Date() | Date.method()',
        examples: [
          'new Date()',
          'new Date("2023-01-01")',
          'Date.now()'
        ],
        methods: ['now()', 'parse()', 'UTC()']
      },
      'String': {
        type: 'StringConstructor',
        description: 'String objesi oluşturmak için kullanılır.',
        syntax: 'new String() | String.method()',
        examples: [
          'new String("text")',
          'String.fromCharCode(65)'
        ],
        methods: ['fromCharCode()', 'fromCodePoint()', 'raw()']
      },
      'Number': {
        type: 'NumberConstructor', 
        description: 'Number objesi oluşturmak için kullanılır.',
        syntax: 'new Number() | Number.property',
        examples: [
          'Number.MAX_VALUE',
          'Number.parseInt("123")',
          'Number.isNaN(NaN)'
        ],
        methods: ['parseInt()', 'parseFloat()', 'isNaN()', 'isInteger()']
      },
      'Object': {
        type: 'ObjectConstructor',
        description: 'Tüm JavaScript objelerinin temel özelliklerini sağlar.',
        syntax: 'Object.method()',
        examples: [
          'Object.keys(obj)',
          'Object.values(obj)',
          'Object.assign(target, source)'
        ],
        methods: ['keys()', 'values()', 'entries()', 'assign()', 'create()']
      }
    };

    const info = builtins[word];
    if (!info) return null;

    const contents = [
      { value: `**${word}**`, supportHtml: false },
      { value: `*${info.type}*`, supportHtml: false },
      { value: `---`, supportHtml: false },
      { value: info.description, supportHtml: false }
    ];

    if (info.syntax) {
      contents.push({ value: `**Syntax:** \`${info.syntax}\``, supportHtml: false });
    }

    if (info.examples && info.examples.length > 0) {
      contents.push({ value: `**Examples:**`, supportHtml: false });
      info.examples.forEach(example => {
        contents.push({ value: `\`\`\`javascript\n${example}\n\`\`\``, supportHtml: false });
      });
    }

    if (info.methods && info.methods.length > 0) {
      contents.push({ value: `**Common Methods:** ${info.methods.join(', ')}`, supportHtml: false });
    }

    return contents;
  }

  // Kod içinde tanımlanan sembolleri analiz et
  private analyzeCustomSymbol(word: string, lineContent: string, fullCode: string, lineNumber: number): any[] | null {
    const lines = fullCode.split('\n');
    
    // Değişken tanımlaması ara
    const varPattern = new RegExp(`(?:var|let|const)\\s+${word}\\s*=\\s*(.+)`, 'g');
    const funcPattern = new RegExp(`function\\s+${word}\\s*\\(([^)]*)\\)`, 'g');
    const arrowFuncPattern = new RegExp(`(?:const|let|var)\\s+${word}\\s*=\\s*\\(([^)]*)\\)\\s*=>`, 'g');
    
    let foundInfo: any[] = [];

    // Tüm kodda ara
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Değişken tanımlaması
      const varMatch = varPattern.exec(line);
      if (varMatch) {
        const value = varMatch[1].trim();
        const inferredType = this.inferDetailedType(value);
        
        foundInfo = [
          { value: `**${word}** *(variable)*`, supportHtml: false },
          { value: `**Type:** ${inferredType.type}`, supportHtml: false },
          { value: `**Value:** \`${value}\``, supportHtml: false },
          { value: `**Line:** ${i + 1}`, supportHtml: false },
          { value: `---`, supportHtml: false },
          { value: inferredType.description, supportHtml: false }
        ];
        break;
      }
      
      // Fonksiyon tanımlaması
      const funcMatch = funcPattern.exec(line);
      if (funcMatch) {
        const params = funcMatch[1] || '';
        const paramCount = params.trim() ? params.split(',').length : 0;
        
        foundInfo = [
          { value: `**${word}** *(function)*`, supportHtml: false },
          { value: `**Parameters:** ${paramCount} (${params || 'none'})`, supportHtml: false },
          { value: `**Line:** ${i + 1}`, supportHtml: false },
          { value: `---`, supportHtml: false },
          { value: 'User-defined function', supportHtml: false }
        ];
        break;
      }
      
      // Arrow fonksiyon tanımlaması  
      const arrowMatch = arrowFuncPattern.exec(line);
      if (arrowMatch) {
        const params = arrowMatch[1] || '';
        const paramCount = params.trim() ? params.split(',').length : 0;
        
        foundInfo = [
          { value: `**${word}** *(arrow function)*`, supportHtml: false },
          { value: `**Parameters:** ${paramCount} (${params || 'none'})`, supportHtml: false },
          { value: `**Line:** ${i + 1}`, supportHtml: false },
          { value: `---`, supportHtml: false },
          { value: 'User-defined arrow function', supportHtml: false }
        ];
        break;
      }
    }

    // Fonksiyon çağrısı kontrolü
    if (foundInfo.length === 0 && lineContent.includes(`${word}(`)) {
      foundInfo = [
        { value: `**${word}** *(function call)*`, supportHtml: false },
        { value: `**Type:** Function invocation`, supportHtml: false },
        { value: `**Line:** ${lineNumber}`, supportHtml: false },
        { value: `---`, supportHtml: false },
        { value: 'Function being called on this line', supportHtml: false }
      ];
    }

    return foundInfo.length > 0 ? foundInfo : null;
  }

  // Detaylı tip çıkarımı
  private inferDetailedType(value: string): { type: string, description: string } {
    value = value.trim();
    
    if (value.match(/^["'`]/)) {
      return { 
        type: 'string', 
        description: `Text value. Length: ${value.length - 2} characters.`
      };
    }
    
    if (value.match(/^\d+$/)) {
      return { 
        type: 'number (integer)', 
        description: `Whole number value: ${value}`
      };
    }
    
    if (value.match(/^\d*\.\d+$/)) {
      return { 
        type: 'number (float)', 
        description: `Decimal number value: ${value}`
      };
    }
    
    if (value === 'true' || value === 'false') {
      return { 
        type: 'boolean', 
        description: `Boolean value representing ${value}.`
      };
    }
    
    if (value.startsWith('[') && value.endsWith(']')) {
      const items = value.slice(1, -1).split(',').length;
      return { 
        type: 'array', 
        description: `Array with ${items} element(s).`
      };
    }
    
    if (value.startsWith('{') && value.endsWith('}')) {
      const props = value.slice(1, -1).split(',').length;
      return { 
        type: 'object', 
        description: `Object with ${props} property(ies).`
      };
    }
    
    if (value.includes('function') || value.includes('=>')) {
      return { 
        type: 'function', 
        description: 'Function definition.'
      };
    }
    
    if (value === 'null') {
      return { 
        type: 'null', 
        description: 'Null value - intentional absence of value.'
      };
    }
    
    if (value === 'undefined') {
      return { 
        type: 'undefined', 
        description: 'Undefined value - variable declared but not assigned.'
      };
    }
    
    return { 
      type: 'unknown', 
      description: `Complex expression or unrecognized type: ${value.substring(0, 50)}...`
    };
  }

  // Genel kelime bilgisi
  private getGeneralWordInfo(word: string, lineContent: string): any[] | null {
    // JavaScript anahtar kelimeleri
    const keywords: Record<string, string> = {
      'function': 'Function declaration keyword',
      'var': 'Variable declaration (function-scoped)',
      'let': 'Variable declaration (block-scoped)',
      'const': 'Constant declaration (block-scoped)',
      'if': 'Conditional statement',
      'else': 'Alternative condition',
      'for': 'Loop statement',
      'while': 'Loop statement',
      'return': 'Return value from function',
      'true': 'Boolean true value',
      'false': 'Boolean false value',
      'null': 'Null value',
      'undefined': 'Undefined value',
      'typeof': 'Type checking operator',
      'instanceof': 'Instance checking operator',
      'new': 'Object instantiation operator',
      'this': 'Current object reference',
      'class': 'Class declaration keyword',
      'extends': 'Class inheritance keyword',
      'import': 'Module import statement',
      'export': 'Module export statement',
      'async': 'Asynchronous function modifier',
      'await': 'Async operation wait keyword',
      'try': 'Error handling block',
      'catch': 'Error handling block',
      'finally': 'Cleanup block',
      'throw': 'Error throwing statement'
    };

    if (keywords[word]) {
      return [
        { value: `**${word}** *(JavaScript keyword)*`, supportHtml: false },
        { value: `**Type:** Reserved word`, supportHtml: false },
        { value: `---`, supportHtml: false },
        { value: keywords[word], supportHtml: false }
      ];
    }

    return null;
  }

  // HTML hover bilgisi
  private getHTMLHoverInfo(word: string, lineContent: string): { contents: any[] } | null {
    const htmlTags: Record<string, { description: string, attributes?: string[], example?: string }> = {
      'div': {
        description: 'Generic container element for styling and layout',
        attributes: ['class', 'id', 'style'],
        example: '<div class="container">Content</div>'
      },
      'span': {
        description: 'Inline generic container element',
        attributes: ['class', 'id', 'style'],
        example: '<span class="highlight">Text</span>'
      },
      'h1': {
        description: 'Main heading element (largest)',
        attributes: ['class', 'id'],
        example: '<h1>Page Title</h1>'
      },
      'p': {
        description: 'Paragraph element for text content',
        attributes: ['class', 'id'],
        example: '<p>This is a paragraph.</p>'
      },
      'a': {
        description: 'Anchor element for links',
        attributes: ['href', 'target', 'class', 'id'],
        example: '<a href="https://example.com">Link</a>'
      },
      'img': {
        description: 'Image element',
        attributes: ['src', 'alt', 'width', 'height'],
        example: '<img src="image.jpg" alt="Description">'
      },
      'button': {
        description: 'Clickable button element',
        attributes: ['type', 'onclick', 'class', 'id'],
        example: '<button onclick="myFunction()">Click me</button>'
      },
      'input': {
        description: 'Input field element',
        attributes: ['type', 'name', 'value', 'placeholder'],
        example: '<input type="text" placeholder="Enter text">'
      }
    };

    const tagInfo = htmlTags[word.toLowerCase()];
    if (tagInfo) {
      const contents = [
        { value: `**<${word}>** *(HTML tag)*`, supportHtml: false },
        { value: `---`, supportHtml: false },
        { value: tagInfo.description, supportHtml: false }
      ];

      if (tagInfo.attributes) {
        contents.push({ value: `**Common attributes:** ${tagInfo.attributes.join(', ')}`, supportHtml: false });
      }

      if (tagInfo.example) {
        contents.push({ value: `**Example:**`, supportHtml: false });
        contents.push({ value: `\`\`\`html\n${tagInfo.example}\n\`\`\``, supportHtml: false });
      }

      return { contents };
    }

    return null;
  }

  // SQL hover bilgisi
  private getSQLHoverInfo(word: string, lineContent: string): { contents: any[] } | null {
    const sqlKeywords: Record<string, { description: string, syntax?: string, example?: string }> = {
      'SELECT': {
        description: 'Veritabanından veri sorgulamak için kullanılır',
        syntax: 'SELECT column1, column2 FROM table_name',
        example: 'SELECT name, age FROM users'
      },
      'FROM': {
        description: 'Veri çekileček tabloyu belirtir',
        syntax: 'FROM table_name',
        example: 'FROM users'
      },
      'WHERE': {
        description: 'Koşullu filtreleme için kullanılır',
        syntax: 'WHERE condition',
        example: 'WHERE age > 18'
      },
      'INSERT': {
        description: 'Tabloya yeni veri eklemek için kullanılır',
        syntax: 'INSERT INTO table_name (columns) VALUES (values)',
        example: 'INSERT INTO users (name, age) VALUES (\'John\', 25)'
      },
      'UPDATE': {
        description: 'Mevcut verileri güncellemek için kullanılır',
        syntax: 'UPDATE table_name SET column = value WHERE condition',
        example: 'UPDATE users SET age = 26 WHERE name = \'John\''
      },
      'DELETE': {
        description: 'Verileri silmek için kullanılır',
        syntax: 'DELETE FROM table_name WHERE condition',
        example: 'DELETE FROM users WHERE age < 18'
      },
      'JOIN': {
        description: 'İki veya daha fazla tabloyu birleştirmek için kullanılır',
        syntax: 'JOIN table2 ON table1.column = table2.column',
        example: 'JOIN orders ON users.id = orders.user_id'
      },
      'ORDER': {
        description: 'Sonuçları sıralamak için kullanılır (ORDER BY ile)',
        syntax: 'ORDER BY column_name ASC|DESC',
        example: 'ORDER BY name ASC'
      },
      'GROUP': {
        description: 'Sonuçları gruplamak için kullanılır (GROUP BY ile)',
        syntax: 'GROUP BY column_name',
        example: 'GROUP BY department'
      }
    };

    const keywordInfo = sqlKeywords[word];
    if (keywordInfo) {
      const contents = [
        { value: `**${word}** *(SQL keyword)*`, supportHtml: false },
        { value: `---`, supportHtml: false },
        { value: keywordInfo.description, supportHtml: false }
      ];

      if (keywordInfo.syntax) {
        contents.push({ value: `**Syntax:** \`${keywordInfo.syntax}\``, supportHtml: false });
      }

      if (keywordInfo.example) {
        contents.push({ value: `**Example:**`, supportHtml: false });
        contents.push({ value: `\`\`\`sql\n${keywordInfo.example}\n\`\`\``, supportHtml: false });
      }

      return { contents };
    }

    return null;
  }

  // Debug panelleri için toggle metodları
  toggleVariablesPanel() {
    this.showVariablesPanel = !this.showVariablesPanel;
    if (this.showVariablesPanel && this.isDebugging) {
      // Debug modundaysa değişkenleri güncelle
      this.updateDebugVariables();
    }
  }

  toggleCallStackPanel() {
    this.showCallStackPanel = !this.showCallStackPanel;
    if (this.showCallStackPanel && this.isDebugging) {
      // Debug modundaysa call stack'i güncelle  
      this.updateDebugCallStack();
    }
  }

  // Debug değişkenlerini güncelle
  private updateDebugVariables() {
    // Örnek debug değişkenleri
    this.debugVariables = {
      'localVar': 'string: "Hello World"',
      'counter': 'number: 42',
      'isActive': 'boolean: true',
      'userData': 'object: { name: "John", age: 30 }'
    };
  }

  // Debug call stack'ini güncelle
  private updateDebugCallStack() {
    const callStack = [
      { name: 'main()', file: 'script.js', line: 15 },
      { name: 'processData()', file: 'script.js', line: 8 },
      { name: 'validateInput()', file: 'script.js', line: 3 }
    ];
    this.debugCallStack = callStack;
  }

  // Monaco Editor dil yapılandırması
  private configureMonacoLanguages(): void {
    if (!window.monaco) return;

    // HTML için gelişmiş yapılandırma
    this.configureHTMLSupport();
    
    // SQL için gelişmiş yapılandırma
    this.configureSQLSupport();
  }

  private configureHTMLSupport(): void {
    const monaco = window.monaco;
    
    // HTML için completion provider
    monaco.languages.registerCompletionItemProvider('html', {
      provideCompletionItems: (model: any, position: any) => {
        const suggestions = [
          // HTML5 semantic tags
          {
            label: 'article',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '<article>\n\t$0\n</article>',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'HTML5 article element'
          },
          {
            label: 'section',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '<section>\n\t$0\n</section>',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'HTML5 section element'
          },
          {
            label: 'header',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '<header>\n\t$0\n</header>',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'HTML5 header element'
          },
          {
            label: 'footer',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '<footer>\n\t$0\n</footer>',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'HTML5 footer element'
          },
          {
            label: 'nav',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '<nav>\n\t$0\n</nav>',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'HTML5 navigation element'
          },
          {
            label: 'main',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '<main>\n\t$0\n</main>',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'HTML5 main content element'
          },
          {
            label: 'aside',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '<aside>\n\t$0\n</aside>',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'HTML5 aside element'
          },
          // Form elements
          {
            label: 'form',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '<form action="$1" method="$2">\n\t$0\n</form>',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'HTML form element'
          },
          {
            label: 'input',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '<input type="$1" name="$2" id="$3" />',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'HTML input element'
          },
          {
            label: 'button',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '<button type="$1">$0</button>',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'HTML button element'
          },
          // Common attributes
          {
            label: 'class',
            kind: monaco.languages.CompletionItemKind.Property,
            insertText: 'class="$1"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'CSS class attribute'
          },
          {
            label: 'id',
            kind: monaco.languages.CompletionItemKind.Property,
            insertText: 'id="$1"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Unique identifier attribute'
          }
        ];

        return { suggestions };
      }
    });

    // HTML için hover provider
    monaco.languages.registerHoverProvider('html', {
      provideHover: (model: any, position: any) => {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const htmlElementInfo: Record<string, string> = {
          'div': 'A generic container element',
          'span': 'A generic inline element',
          'article': 'Represents a self-contained piece of content',
          'section': 'Represents a section of a document',
          'header': 'Represents introductory content',
          'footer': 'Represents footer content',
          'nav': 'Represents a navigation section',
          'main': 'Represents the main content of the document',
          'aside': 'Represents content aside from the main content'
        };

        const info = htmlElementInfo[word.word];
        if (info) {
          return {
            range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
            contents: [
              { value: `**${word.word}**` },
              { value: info }
            ]
          };
        }
        
        return null;
      }
    });
  }

  private configureSQLSupport(): void {
    const monaco = window.monaco;
    
    // SQL için completion provider
    monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: (model: any, position: any) => {
        const suggestions = [
          // SQL Keywords
          {
            label: 'SELECT',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'SELECT $1 FROM $2',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Retrieve data from database'
          },
          {
            label: 'INSERT',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'INSERT INTO $1 ($2) VALUES ($3)',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Insert new data into table'
          },
          {
            label: 'UPDATE',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'UPDATE $1 SET $2 = $3 WHERE $4',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Update existing data in table'
          },
          {
            label: 'DELETE',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'DELETE FROM $1 WHERE $2',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Delete data from table'
          },
          {
            label: 'CREATE TABLE',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'CREATE TABLE $1 (\n\t$2\n)',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Create a new table'
          },
          {
            label: 'ALTER TABLE',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'ALTER TABLE $1 $2',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Modify table structure'
          },
          {
            label: 'DROP TABLE',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'DROP TABLE $1',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Delete a table'
          },
          // SQL Functions
          {
            label: 'COUNT',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'COUNT($1)',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Count number of rows'
          },
          {
            label: 'SUM',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'SUM($1)',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Calculate sum of values'
          },
          {
            label: 'AVG',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'AVG($1)',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Calculate average of values'
          },
          {
            label: 'MAX',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'MAX($1)',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Find maximum value'
          },
          {
            label: 'MIN',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'MIN($1)',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Find minimum value'
          },
          // Data Types
          {
            label: 'VARCHAR',
            kind: monaco.languages.CompletionItemKind.TypeParameter,
            insertText: 'VARCHAR($1)',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Variable character string'
          },
          {
            label: 'INTEGER',
            kind: monaco.languages.CompletionItemKind.TypeParameter,
            insertText: 'INTEGER',
            documentation: 'Integer number type'
          },
          {
            label: 'DATETIME',
            kind: monaco.languages.CompletionItemKind.TypeParameter,
            insertText: 'DATETIME',
            documentation: 'Date and time type'
          },
          // Clauses
          {
            label: 'WHERE',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'WHERE $1',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Filter rows based on condition'
          },
          {
            label: 'ORDER BY',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'ORDER BY $1',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Sort results'
          },
          {
            label: 'GROUP BY',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'GROUP BY $1',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Group rows by column'
          },
          {
            label: 'HAVING',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'HAVING $1',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Filter groups'
          },
          {
            label: 'LIMIT',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'LIMIT $1',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Limit number of results'
          }
        ];

        return { suggestions };
      }
    });

    // SQL için hover provider
    monaco.languages.registerHoverProvider('sql', {
      provideHover: (model: any, position: any) => {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const sqlKeywordInfo: Record<string, string> = {
          'SELECT': 'Retrieves data from one or more tables',
          'FROM': 'Specifies the table(s) to retrieve data from',
          'WHERE': 'Filters rows based on specified conditions',
          'INSERT': 'Adds new rows to a table',
          'UPDATE': 'Modifies existing rows in a table',
          'DELETE': 'Removes rows from a table',
          'CREATE': 'Creates database objects like tables, views, etc.',
          'DROP': 'Removes database objects',
          'ALTER': 'Modifies the structure of database objects',
          'JOIN': 'Combines rows from two or more tables',
          'INNER': 'Returns only matching rows from both tables',
          'LEFT': 'Returns all rows from left table and matching rows from right',
          'RIGHT': 'Returns all rows from right table and matching rows from left',
          'FULL': 'Returns all rows when there is a match in either table',
          'ORDER': 'Sorts the result set',
          'GROUP': 'Groups rows that have the same values',
          'HAVING': 'Filters groups based on conditions',
          'COUNT': 'Returns the number of rows',
          'SUM': 'Returns the sum of numeric values',
          'AVG': 'Returns the average of numeric values',
          'MAX': 'Returns the maximum value',
          'MIN': 'Returns the minimum value'
        };

        const info = sqlKeywordInfo[word.word.toUpperCase()];
        if (info) {
          return {
            range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
            contents: [
              { value: `**${word.word.toUpperCase()}**` },
              { value: info }
            ]
          };
        }
        
        return null;
      }
    });
  }
}
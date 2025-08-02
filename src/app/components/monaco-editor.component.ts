import { Component, ElementRef, AfterViewInit, ViewChild, Inject, PLATFORM_ID, Renderer2, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
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
export class MonacoEditorComponent implements AfterViewInit, OnInit, OnChanges {
  @ViewChild('editorContainer', { static: true }) editorContainer!: ElementRef<HTMLDivElement>;
  @Input() selectedScriptIndex: number = 0;
  @Input() editorTheme: string = 'vs-dark';
  editor: any;

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
          // HTML dil desteğini kaydet
          window.monaco.languages.register({ id: 'html' });
          window.monaco.languages.setMonarchTokensProvider('html', {
            defaultToken: '',
            tokenPostfix: '.html',
            ignoreCase: true,
            tokenizer: {
              root: [
                [/<!DOCTYPE/, 'metatag'],
                [/<!--/, 'comment', '@comment'],
                [/(<)((?:[\w\-]+:)?[\w\-]+)(\s*)(\/>)/, ['delimiter', 'tag', '', 'delimiter']],
                [/(<)(script)/, ['delimiter', { token: 'tag', next: '@script' }]],
                [/(<)(style)/, ['delimiter', { token: 'tag', next: '@style' }]],
                [/(<)((?:[\w\-]+:)?[\w\-]+)/, ['delimiter', { token: 'tag', next: '@otherTag' }]],
                [/(<\/)((?:[\w\-]+:)?[\w\-]+)/, ['delimiter', { token: 'tag', next: '@otherTag' }]],
                [/</, 'delimiter'],
                [/[^<]+/, '']
              ],
              comment: [
                [/--/, 'comment'],
                [/-->/, 'comment', '@pop'],
                [/[^-]+/, 'comment']
              ],
              script: [
                [/type/, 'attribute.name', '@scriptAfterType'],
                [/"([^"]*)"/, 'attribute.value'],
                [/'([^']*)'/, 'attribute.value'],
                [/[\w\-]+/, 'attribute.name'],
                [/=/, 'delimiter'],
                [/>/, { token: 'delimiter', next: '@scriptEmbedded', nextEmbedded: 'text/javascript' }],
                [/[ \t\r\n]+/],
                [/(<\/)(script\s*)(>)/, ['delimiter', 'tag', { token: 'delimiter', next: '@pop' }]]
              ],
              scriptAfterType: [
                [/=/, 'delimiter', '@scriptAfterTypeEquals'],
                [/>/, { token: 'delimiter', next: '@scriptEmbedded', nextEmbedded: 'text/javascript' }],
                [/[ \t\r\n]+/],
                [/<\/script\s*>/, { token: '@rematch', next: '@pop' }]
              ],
              scriptAfterTypeEquals: [
                [/"([^"]*)"/, { token: 'attribute.value', switchTo: '@scriptWithCustomType.$1' }],
                [/'([^']*)'/, { token: 'attribute.value', switchTo: '@scriptWithCustomType.$1' }],
                [/>/, { token: 'delimiter', next: '@scriptEmbedded', nextEmbedded: 'text/javascript' }],
                [/[ \t\r\n]+/],
                [/<\/script\s*>/, { token: '@rematch', next: '@pop' }]
              ],
              scriptWithCustomType: [
                [/>/, { token: 'delimiter', next: '@scriptEmbedded.$S2', nextEmbedded: '$S2' }],
                [/"([^"]*)"/, 'attribute.value'],
                [/'([^']*)'/, 'attribute.value'],
                [/[\w\-]+/, 'attribute.name'],
                [/=/, 'delimiter'],
                [/[ \t\r\n]+/],
                [/<\/script\s*>/, { token: '@rematch', next: '@pop' }]
              ],
              scriptEmbedded: [
                [/<\/script/, { token: '@rematch', next: '@pop', nextEmbedded: '@pop' }],
                [/[^<]+/, '']
              ],
              style: [
                [/type/, 'attribute.name', '@styleAfterType'],
                [/"([^"]*)"/, 'attribute.value'],
                [/'([^']*)'/, 'attribute.value'],
                [/[\w\-]+/, 'attribute.name'],
                [/=/, 'delimiter'],
                [/>/, { token: 'delimiter', next: '@styleEmbedded', nextEmbedded: 'text/css' }],
                [/[ \t\r\n]+/],
                [/(<\/)(style\s*)(>)/, ['delimiter', 'tag', { token: 'delimiter', next: '@pop' }]]
              ],
              styleAfterType: [
                [/=/, 'delimiter', '@styleAfterTypeEquals'],
                [/>/, { token: 'delimiter', next: '@styleEmbedded', nextEmbedded: 'text/css' }],
                [/[ \t\r\n]+/],
                [/<\/style\s*>/, { token: '@rematch', next: '@pop' }]
              ],
              styleAfterTypeEquals: [
                [/"([^"]*)"/, { token: 'attribute.value', switchTo: '@styleWithCustomType.$1' }],
                [/'([^']*)'/, { token: 'attribute.value', switchTo: '@styleWithCustomType.$1' }],
                [/>/, { token: 'delimiter', next: '@styleEmbedded', nextEmbedded: 'text/css' }],
                [/[ \t\r\n]+/],
                [/<\/style\s*>/, { token: '@rematch', next: '@pop' }]
              ],
              styleWithCustomType: [
                [/>/, { token: 'delimiter', next: '@styleEmbedded.$S2', nextEmbedded: '$S2' }],
                [/"([^"]*)"/, 'attribute.value'],
                [/'([^']*)'/, 'attribute.value'],
                [/[\w\-]+/, 'attribute.name'],
                [/=/, 'delimiter'],
                [/[ \t\r\n]+/],
                [/<\/style\s*>/, { token: '@rematch', next: '@pop' }]
              ],
              styleEmbedded: [
                [/<\/style/, { token: '@rematch', next: '@pop', nextEmbedded: '@pop' }],
                [/[^<]+/, '']
              ],
              otherTag: [
                [/\/?>/, 'delimiter', '@pop'],
                [/"([^"]*)"/, 'attribute.value'],
                [/'([^']*)'/, 'attribute.value'],
                [/[\w\-]+/, 'attribute.name'],
                [/=/, 'delimiter'],
                [/[ \t\r\n]+/]
              ]
            }
          });

          // SQL dil desteğini kaydet
          window.monaco.languages.register({ id: 'sql' });
          window.monaco.languages.setMonarchTokensProvider('sql', {
            defaultToken: '',
            tokenPostfix: '.sql',
            ignoreCase: true,
            tokenizer: {
              root: [
                [/[a-zA-Z_]\w*/, {
                  cases: {
                    '@keywords': 'keyword',
                    '@default': 'identifier'
                  }
                }],
                [/[0-9]+/, 'number'],
                [/['"`]/, 'string', '@string'],
                [/--.*$/, 'comment'],
                [/\/\*/, 'comment', '@comment']
              ],
              comment: [
                [/[^*/]+/, 'comment'],
                [/\*\//, 'comment', '@pop'],
                [/./, 'comment']
              ],
              string: [
                [/[^'"]+/, 'string'],
                [/['"]/, 'string', '@pop']
              ]
            },
            keywords: [
              'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'TABLE', 'INDEX',
              'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'ORDER', 'BY', 'GROUP', 'HAVING', 'JOIN',
              'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'AS', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN'
            ]
          });
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
            // HTML için gelişmiş özellikler
            ...(language === 'html' && {
              formatOnPaste: true,
              formatOnType: true,
              suggestOnTriggerCharacters: true,
              quickSuggestions: {
                other: true,
                comments: false,
                strings: true
              }
            })
          });
          
          
          // Editor içeriği değiştiğinde script template'ini güncelle
          this.editor.onDidChangeModelContent(() => {
            this.scriptTemplates[this.selectedScriptIndex].code = this.editor.getValue();
            // Kod hatalarını otomatik kontrol et
            setTimeout(() => this.checkCodeErrors(), 500);
          });
          
          // Sadece intellisense provider fonksiyonunu çağır
          registerMonacoIntellisense(window.monaco);
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

  // Kod içeriğine göre dil tespit et
  detectLanguageFromCode(code: string): string {
    if (code.trim().startsWith('<!DOCTYPE html') || code.includes('<html')) {
      return 'html';
    }
    if (code.toLowerCase().startsWith('select') || code.toLowerCase().includes('from')) {
      return 'sql';
    }
    return 'javascript';
  }

  // HTML validation fonksiyonu
  validateHTML(code: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Basit HTML validation
    const openTags = code.match(/<([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g) || [];
    const closeTags = code.match(/<\/([a-zA-Z][a-zA-Z0-9]*)>/g) || [];
    
    const tagStack: string[] = [];
    const tagPositions: { tag: string; line: number; column: number }[] = [];
    
    // Self-closing tags
    const selfClosingTags = ['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'keygen', 'param', 'source', 'track', 'wbr'];
    
    // Her satırı kontrol et
    const lines = code.split('\n');
    lines.forEach((line, lineIndex) => {
      const openTagMatches = line.match(/<([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g);
      const closeTagMatches = line.match(/<\/([a-zA-Z][a-zA-Z0-9]*)>/g);
      
      if (openTagMatches) {
        openTagMatches.forEach(tag => {
          const tagName = tag.match(/<([a-zA-Z][a-zA-Z0-9]*)/)?.[1];
          if (tagName && !selfClosingTags.includes(tagName.toLowerCase())) {
            tagStack.push(tagName.toLowerCase());
            tagPositions.push({ tag: tagName.toLowerCase(), line: lineIndex + 1, column: line.indexOf(tag) + 1 });
          }
        });
      }
      
      if (closeTagMatches) {
        closeTagMatches.forEach(tag => {
          const tagName = tag.match(/<\/([a-zA-Z][a-zA-Z0-9]*)/)?.[1];
          if (tagName) {
            const expectedTag = tagStack.pop();
            if (expectedTag !== tagName.toLowerCase()) {
              errors.push(`Mismatched tag: expected </${expectedTag}> but found </${tagName}> at line ${lineIndex + 1}`);
            }
          }
        });
      }
    });
    
    if (tagStack.length > 0) {
      errors.push(`Unclosed tags: ${tagStack.join(', ')}`);
    }
    
    // DOCTYPE kontrolü
    if (code.includes('<html') && !code.includes('<!DOCTYPE')) {
      errors.push('Missing DOCTYPE declaration');
    }
    
    // Kapanmayan tag'ları kontrol et
    const unclosedPatterns = [
      { pattern: /<p[^>]*>(?!.*<\/p>)/g, message: 'Unclosed <p> tag' },
      { pattern: /<div[^>]*>(?!.*<\/div>)/g, message: 'Unclosed <div> tag' },
      { pattern: /<span[^>]*>(?!.*<\/span>)/g, message: 'Unclosed <span> tag' },
      { pattern: /<h[1-6][^>]*>(?!.*<\/h[1-6]>)/g, message: 'Unclosed heading tag' }
    ];
    
    unclosedPatterns.forEach(({ pattern, message }) => {
      if (pattern.test(code)) {
        errors.push(message);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // SQL validation fonksiyonu
  validateSQL(code: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // SQL syntax kontrolü
    const lines = code.split('\n');
    lines.forEach((line, lineIndex) => {
      const trimmedLine = line.trim().toLowerCase();
      
      // SELECT statement kontrolü
      if (trimmedLine.startsWith('select') && !trimmedLine.includes('from')) {
        errors.push(`Missing FROM clause at line ${lineIndex + 1}`);
      }
      
      // INSERT statement kontrolü
      if (trimmedLine.startsWith('insert') && !trimmedLine.includes('values')) {
        errors.push(`Missing VALUES clause at line ${lineIndex + 1}`);
      }
      
      // UPDATE statement kontrolü
      if (trimmedLine.startsWith('update') && !trimmedLine.includes('set')) {
        errors.push(`Missing SET clause at line ${lineIndex + 1}`);
      }
      
      // DELETE statement kontrolü
      if (trimmedLine.startsWith('delete') && !trimmedLine.includes('from')) {
        errors.push(`Missing FROM clause at line ${lineIndex + 1}`);
      }
      
      // WHERE clause kontrolü
      if (trimmedLine.includes('where') && !trimmedLine.includes('=') && !trimmedLine.includes('like') && !trimmedLine.includes('in')) {
        errors.push(`Incomplete WHERE clause at line ${lineIndex + 1}`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Kod hatalarını kontrol et ve göster
  checkCodeErrors() {
    if (isPlatformBrowser(this.platformId) && this.editor) {
      const code = this.editor.getValue();
      const language = this.detectLanguageFromCode(code);
      
      if (language === 'html') {
        const validation = this.validateHTML(code);
        if (!validation.isValid) {
          console.warn('HTML Validation Errors:', validation.errors);
          // Hataları Monaco Editor'da göstermek için markers ekle
          this.addValidationMarkers(validation.errors);
        } else {
          console.log('HTML is valid');
          this.clearValidationMarkers();
        }
      } else if (language === 'sql') {
        const validation = this.validateSQL(code);
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
        const markers = errors.map((error, index) => ({
          message: error,
          severity: window.monaco.MarkerSeverity.Error,
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: model.getLineCount(),
          endColumn: model.getLineMaxColumn(model.getLineCount())
        }));
        
        window.monaco.editor.setModelMarkers(model, 'html-validation', markers);
      }
    }
  }

  // Validation markers'ları temizle
  clearValidationMarkers() {
    if (window.monaco && this.editor) {
      const model = this.editor.getModel();
      if (model) {
        window.monaco.editor.setModelMarkers(model, 'html-validation', []);
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

  // Revert changes to original script template
  revertChanges() {
    if (isPlatformBrowser(this.platformId) && this.editor) {
      const script = this.scriptTemplates[this.selectedScriptIndex];
      this.editor.setValue(script.code);
    }
  }
}
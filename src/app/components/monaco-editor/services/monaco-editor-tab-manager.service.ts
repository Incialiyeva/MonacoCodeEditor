import { Injectable } from '@angular/core';

export interface EditorTab {
  name: string;
  code: string;
}

export interface OpenTab {
  lang: string;
  idx: number;
  name: string;
  code: string;
  language: string;
}

@Injectable({
  providedIn: 'root'
})
export class MonacoEditorTabManagerService {
  private tabsByLanguage: Record<string, EditorTab[]> = {
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

  private selectedTabIndexByLanguage: Record<string, number> = {
    javascript: 0,
    html: 0,
    sql: 0
  };

  private openTabs: OpenTab[] = [];
  private activeTab: { lang: string, idx: number } = { lang: 'javascript', idx: 0 };

  constructor() {
    this.initializeOpenTabs();
  }

  private initializeOpenTabs() {
    this.openTabs = [
      { 
        lang: 'javascript', 
        idx: 0, 
        name: this.getTabName('javascript', 0), 
        code: this.tabsByLanguage['javascript'][0].code, 
        language: 'javascript' 
      }
    ];
  }

  getTabName(langValue: string, idx: number): string {
    const languages = [
      { value: 'javascript', label: 'JavaScript' },
      { value: 'html', label: 'HTML' },
      { value: 'sql', label: 'SQL' }
    ];
    const lang = languages.find(l => l.value === langValue);
    return lang ? `${lang.label} ${idx + 1}` : `Tab ${idx + 1}`;
  }

  get allTabs(): OpenTab[] {
    return this.openTabs;
  }

  get currentActiveTab(): { lang: string, idx: number } {
    return this.activeTab;
  }

  get currentSelectedLanguage(): string {
    return this.activeTab.lang;
  }

  get currentSelectedTabIndex(): number {
    return this.selectedTabIndexByLanguage[this.activeTab.lang];
  }

  selectTab(lang: string, idx: number) {
    this.activeTab = { lang, idx };
    this.selectedTabIndexByLanguage[lang] = idx;
  }

  closeTab(lang: string, idx: number) {
    const tabIdx = this.openTabs.findIndex(t => t.lang === lang && t.idx === idx);
    if (tabIdx > -1) {
      this.openTabs.splice(tabIdx, 1);
      
      // Eğer kapatılan sekme aktifse, başka açık sekme varsa ona geç
      if (this.activeTab.lang === lang && this.activeTab.idx === idx) {
        if (this.openTabs.length > 0) {
          const next = this.openTabs[Math.max(0, tabIdx - 1)];
          this.selectTab(next.lang, next.idx);
        }
      }
    }
  }

  addTab(lang: string) {
    const idx = this.tabsByLanguage[lang].length;
    const contextHeader = '/** @type {MonacoContext} */\nconst self = this;\n';
    this.tabsByLanguage[lang].push({ name: this.getTabName(lang, idx), code: contextHeader });
    this.selectedTabIndexByLanguage[lang] = idx;
  }

  updateTabCode(lang: string, idx: number, code: string) {
    const tab = this.openTabs.find(t => t.lang === lang && t.idx === idx);
    if (tab) {
      tab.code = code;
    }
  }

  getTabCode(lang: string, idx: number): string {
    const tab = this.openTabs.find(t => t.lang === lang && t.idx === idx);
    return tab ? tab.code : '';
  }

  addLanguageTab(lang: string) {
    const sameLangTabs = this.openTabs.filter(t => t.lang === lang);
    const idx = sameLangTabs.length;
    const name = this.getTabName(lang, idx);
    const code = this.tabsByLanguage[lang][0]?.code || '';
    this.openTabs.push({ lang, idx, name, code, language: lang });
    this.selectTab(lang, idx);
  }
} 
import { Component, ElementRef, AfterViewInit, ViewChild, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface EditorTab {
  name: string;
  code: string;
}

@Component({
  selector: 'app-monaco-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './monaco-editor.component.html',
  styleUrls: ['./monaco-editor.component.scss']
})
export class MonacoEditorComponent implements AfterViewInit {
  @ViewChild('editorContainer', { static: true }) editorContainer!: ElementRef<HTMLDivElement>;
  editor: any;

  languages: { value: string, label: string, icon: SafeHtml }[];
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

  openTabs: { lang: string, idx: number, name: string, code: string }[];
  activeTab: { lang: string, idx: number };

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    @Inject(DomSanitizer) private sanitizer: DomSanitizer | null = null
  ) {
    // SSR ortamında DomSanitizer undefined olabilir, bu yüzden kontrol et
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
    this.openTabs = [
      { lang: 'javascript', idx: 0, name: this.getTabName('javascript', 0), code: this.tabsByLanguage['javascript'][0].code }
    ];
    this.activeTab = { lang: 'javascript', idx: 0 };
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
    if (this.editor) {
      this.editor.setModelLanguage(this.editor.getModel(), lang);
      this.editor.setValue(this.tabsByLanguage[lang][idx].code);
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
    if (isPlatformBrowser(this.platformId)) {
      // @ts-ignore
      window.require.config({ paths: { 'vs': 'assets/monaco/vs' } });
      // @ts-ignore
      window.require(['vs/editor/editor.main'], () => {
        // @ts-ignore
        this.editor = monaco.editor.create(this.editorContainer.nativeElement, {
          value: this.selectedTab.code,
          language: this.selectedLanguage,
          theme: this.selectedTheme,
          automaticLayout: true
        });
        this.editor.onDidChangeModelContent(() => {
          this.selectedTab.code = this.editor.getValue();
        });
      });
    }
  }

  // Dil seçilince sekme ekle veya mevcut sekmeye geç
  onLanguageChange(event: any) {
    const lang = this.selectedLanguage;
    let tabIdx = 0;
    // Eğer sekme zaten açıksa ona geç
    const existing = this.openTabs.find(t => t.lang === lang);
    if (existing) {
      this.selectTabUniversal(existing.lang, existing.idx);
      return;
    }
    // Yoksa yeni sekme ekle
    tabIdx = 0;
    this.openTabs.push({
      lang,
      idx: tabIdx,
      name: this.getTabName(lang, tabIdx),
      code: this.tabsByLanguage[lang][tabIdx].code
    });
    this.selectTabUniversal(lang, tabIdx);
  }

  onThemeChange(event: any) {
    if (isPlatformBrowser(this.platformId) && this.editor) {
      // @ts-ignore
      monaco.editor.setTheme(this.selectedTheme);
    }
  }

  selectTab(idx: number) {
    // Artık kullanılmıyor, universal fonksiyon var
  }

  formatDocument() {
    if (this.editor) {
      this.editor.getAction('editor.action.formatDocument').run();
    }
  }

  saveCode() {
    if (this.editor) {
      const code = this.editor.getValue();
      // Burada kodu kaydetme işlemi yapılabilir, örnek olarak console.log
      console.log('Saved code:', code);
    }
  }
} 
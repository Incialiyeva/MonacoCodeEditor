import { Component, ElementRef, AfterViewInit, ViewChild, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

  languages = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'html', label: 'HTML' },
    { value: 'sql', label: 'SQL' }
  ];
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

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  get selectedTab() {
    return this.tabsByLanguage[this.selectedLanguage][this.selectedTabIndexByLanguage[this.selectedLanguage]];
  }

  get selectedLanguageLabel(): string {
    const found = this.languages.find(l => l.value === this.selectedLanguage);
    return found ? found.label : '';
  }

  // Sekme ismini seçili dilin label'ı ile oluştur
  getTabName(langValue: string, idx: number): string {
    const lang = this.languages.find(l => l.value === langValue);
    return lang ? `${lang.label} ${idx + 1}` : `Tab ${idx + 1}`;
  }

  // Açık sekmeler (her dil için yalnızca bir sekme)
  openTabs: { lang: string, idx: number, name: string, code: string }[] = [
    { lang: 'javascript', idx: 0, name: this.getTabName('javascript', 0), code: this.tabsByLanguage['javascript'][0].code }
  ];

  // Aktif sekme bilgisi
  activeTab = { lang: 'javascript', idx: 0 };

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
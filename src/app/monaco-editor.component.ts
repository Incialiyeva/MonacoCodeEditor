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

  onLanguageChange(event: any) {
    if (this.editor) {
      // Tab index sıfırlanabilir veya mevcut index korunabilir
      const tabIndex = this.selectedTabIndexByLanguage[this.selectedLanguage];
      this.editor.setValue(this.tabsByLanguage[this.selectedLanguage][tabIndex].code);
      // Monaco dilini değiştir
      this.editor.setModelLanguage(this.editor.getModel(), this.selectedLanguage);
    }
  }

  onThemeChange(event: any) {
    if (isPlatformBrowser(this.platformId) && this.editor) {
      // @ts-ignore
      monaco.editor.setTheme(this.selectedTheme);
    }
  }

  selectTab(idx: number) {
    this.selectedTabIndexByLanguage[this.selectedLanguage] = idx;
    if (this.editor) {
      this.editor.setValue(this.selectedTab.code);
    }
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
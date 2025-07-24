import { Component, ElementRef, AfterViewInit, ViewChild, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-monaco-test',
  template: `<div #editorContainer style="width:100%;height:400px;border:1px solid #4f8cff;margin:2rem 0;"></div>`
})
export class MonacoTestComponent implements AfterViewInit {
  @ViewChild('editorContainer', { static: true }) editorContainer!: ElementRef<HTMLDivElement>;
  editor: any;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    // @ts-ignore
    if (typeof window.require === 'function') {
      // @ts-ignore
      window.require.config({ paths: { 'vs': 'assets/monaco/vs' } });
      // @ts-ignore
      window.require(['vs/editor/editor.main'], () => {
        // @ts-ignore
        this.editor = window.monaco.editor.create(this.editorContainer.nativeElement, {
          value: 'function hello() {\n  console.log("Hello, Monaco!");\n}',
          language: 'javascript',
          theme: 'vs-dark',
          automaticLayout: true
        });
        console.log('Monaco editor mounted!');
      });
    } else {
      console.error('Monaco loader.js (window.require) bulunamadı!');
    }
  }
} 
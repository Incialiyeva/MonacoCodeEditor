import { Component, signal } from '@angular/core';
import { MonacoEditorComponent } from './components/monaco-editor.component';

@Component({
  selector: 'app-root',
  imports: [MonacoEditorComponent],
  template: `<app-monaco-editor></app-monaco-editor>`
})
export class App {
  protected readonly title = signal('monaco-editor-app');
}

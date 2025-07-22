import { Component, signal } from '@angular/core';
import { MonacoEditorComponent } from './monaco-editor.component';

@Component({
  selector: 'app-root',
  imports: [MonacoEditorComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('monaco-editor-app');
}

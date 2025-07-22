import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-code-editor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './code-editor.html',
  styleUrl: './code-editor.scss'
})
export class CodeEditorComponent {
  selectedLang = 'js';
  editorValue = '';
}

import { Component, Inject, PLATFORM_ID, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MonacoEditorComponent } from '../components/monaco-editor/monaco-editor.component';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-landing-page',
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.scss'],
  standalone: true,
  imports: [CommonModule, MonacoEditorComponent]
})
export class LandingPageComponent {
  @ViewChild(MonacoEditorComponent) monacoEditor!: MonacoEditorComponent;
  
  isModalOpen = false;
  isScriptModalOpen = false;
  isBrowser = false;
  selectedScriptIndex = 0;
  editorTheme = 'vs-dark';
  showRunDebugPanel = false;

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
    }
  ];

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  openScriptSelectionModal() {
    if (this.isBrowser) {
      this.isScriptModalOpen = true;
      document.body.style.overflow = 'hidden';
    }
  }

  closeScriptSelectionModal() {
    this.isScriptModalOpen = false;
    if (this.isBrowser) {
      document.body.style.overflow = 'auto';
    }
  }

  selectScript(index: number) {
    this.selectedScriptIndex = index;
    this.closeScriptSelectionModal();
    this.openEditorModal();
  }

  openEditorModal() {
    if (this.isBrowser) {
      this.isModalOpen = true;
      document.body.style.overflow = 'hidden';
    }
  }

  closeEditorModal() {
    this.isModalOpen = false;
    if (this.isBrowser) {
      document.body.style.overflow = 'auto';
    }
  }

  toggleEditorTheme() {
    this.editorTheme = this.editorTheme === 'vs-dark' ? 'vs-light' : 'vs-dark';
  }

  toggleRunDebugPanel() {
    this.showRunDebugPanel = !this.showRunDebugPanel;
    if (this.monacoEditor) {
      if (this.showRunDebugPanel) {
        this.monacoEditor.toggleToolbar();
      }
    }
  }
} 
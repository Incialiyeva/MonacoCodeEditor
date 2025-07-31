import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MonacoEditorComponent } from '../components/monaco-editor.component';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-landing-page',
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.scss'],
  standalone: true,
  imports: [CommonModule, MonacoEditorComponent]
})
export class LandingPageComponent {
  isModalOpen = false;
  isScriptModalOpen = false;
  isBrowser = false;
  selectedScriptIndex = 0;
  editorTheme = 'vs-dark';

  scriptTemplates = [
    {
      name: 'onInit',
      description: 'Triggered when the page is first loaded.',
      code: `function onInit() {\n  // Write your code here\n}`
    },
    {
      name: 'onReady',
      description: 'Runs when the page is fully ready.',
      code: `function onReady() {\n  // Write your code here\n}`
    },
    {
      name: 'onSelect',
      description: 'Triggered when a user selects a record.',
      code: `function onSelect(record) {\n  // Write your code here\n}`
    },
    {
      name: 'onEdit',
      description: 'Triggered when the user enters edit mode.',
      code: `function onEdit(data) {\n  // Write your code here\n}`
    },
    {
      name: 'onValidate',
      description: 'Runs before saving a record. If false is returned, saving is prevented.',
      code: `function onValidate() {\n  // Write your code here\n  return true;\n}`
    },
    {
      name: 'onSave',
      description: 'Triggered when a record is about to be saved.',
      code: `function onSave(data) {\n  // Write your code here\n}`
    },
    {
      name: 'onClick',
      description: 'Runs when a custom button is clicked.',
      code: `function onClick(event) {\n  // Write your code here\n}`
    },
    {
      name: 'onVisible',
      description: 'Controls the visibility of the field.',
      code: `function onVisible() {\n  // Write your code here\n  return true;\n}`
    },
    {
      name: 'onEnabled',
      description: 'Controls whether the field is enabled.',
      code: `function onEnabled() {\n  // Write your code here\n  return true;\n}`
    },
    {
      name: 'onCalculate',
      description: 'Used to perform calculations.',
      code: `function onCalculate() {\n  // Write your code here\n}`
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
} 
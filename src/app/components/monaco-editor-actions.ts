import { isPlatformBrowser } from '@angular/common';
import { formatWithPrettier } from '../features/prettier/prettier-format.util';
import { showMonacoDiff } from '../features/diff/monaco-diff.util';
import { applyMonacoTheme } from '../features/theme/monaco-theme.util';
import { validateHTML } from '../features/language/html-validation.util';
import { validateSQL } from '../features/language/sql-validation.util';
import { MonacoEditorFileManagerService } from './monaco-editor-file-manager.service';

declare global {
  interface Window {
    monaco: any;
  }
}

export class MonacoEditorActions {
  constructor(
    private platformId: Object,
    private renderer: any,
    private hostRef: any,
    private fileManager: MonacoEditorFileManagerService,
    private lastSavedCodeByTab: Record<string, string> = {}
  ) {}

  // Kod hatalarını kontrol et ve göster
  checkCodeErrors(editor: any) {
    if (isPlatformBrowser(this.platformId) && editor) {
      const code = editor.getValue();
      const language = this.fileManager.detectLanguageFromCode(code);

      if (language === 'html') {
        const validation = validateHTML(code);
        if (!validation.isValid) {
          console.warn('HTML Validation Errors:', validation.errors);
          this.addValidationMarkers(editor, validation.errors);
        } else {
          console.log('HTML is valid');
          this.clearValidationMarkers(editor);
        }
      } else if (language === 'sql') {
        const validation = validateSQL(code);
        if (!validation.isValid) {
          console.warn('SQL Validation Errors:', validation.errors);
          this.addValidationMarkers(editor, validation.errors);
        } else {
          console.log('SQL is valid');
          this.clearValidationMarkers(editor);
        }
      }
    }
  }

  // Validation markers ekle
  addValidationMarkers(editor: any, errors: string[]) {
    if (window.monaco && editor) {
      const model = editor.getModel();
      if (model) {
        const language = this.fileManager.detectLanguageFromCode(editor.getValue());
        const namespace = language === 'html' ? 'html-validation' : 'sql-validation';

        const markers = errors.map((error, index) => ({
          message: error,
          severity: window.monaco.MarkerSeverity.Error,
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: model.getLineCount(),
          endColumn: model.getLineMaxColumn(model.getLineCount())
        }));

        window.monaco.editor.setModelMarkers(model, namespace, markers);
      }
    }
  }

  // Validation markers'ları temizle
  clearValidationMarkers(editor: any) {
    if (window.monaco && editor) {
      const model = editor.getModel();
      if (model) {
        const language = this.fileManager.detectLanguageFromCode(editor.getValue());
        const namespace = language === 'html' ? 'html-validation' : 'sql-validation';
        window.monaco.editor.setModelMarkers(model, namespace, []);
      }
    }
  }

  // Tema değiştirme
  toggleTheme(editor: any, currentTheme: string): string {
    const newTheme = currentTheme === 'vs-dark' ? 'vs-light' : 'vs-dark';
    if (isPlatformBrowser(this.platformId) && window.monaco && editor) {
      applyMonacoTheme({
        monaco: window.monaco,
        editor: editor,
        theme: newTheme,
        hostElement: this.hostRef.nativeElement,
        renderer: this.renderer
      });
    }
    return newTheme;
  }

  // Format document
  formatDocument(editor: any) {
    if (isPlatformBrowser(this.platformId) && editor) {
      editor.getAction('editor.action.formatDocument').run();
    }
  }

  // Format code using Prettier
  async formatCode(editor: any) {
    if (isPlatformBrowser(this.platformId) && editor) {
      try {
        const code = editor.getValue();
        const language = this.fileManager.detectLanguageFromCode(code);

        this.clearValidationMarkers(editor);

        const formatted = await formatWithPrettier(code, language);
        if (typeof formatted === 'string') {
          const model = editor.getModel();
          if (model) {
            setTimeout(() => {
              editor.setValue(formatted);
              setTimeout(() => this.checkCodeErrors(editor), 1000);
            }, 0);
          } else {
            alert('Monaco Editor modeli bulunamadı!');
          }
        } else {
          alert('Prettier kodu formatlayamadı!');
        }
      } catch (e: any) {
        alert('Prettier formatlama hatası: ' + (e?.message || JSON.stringify(e)));
        console.error('Prettier formatlama hatası:', e);
      }
    }
  }

  // Show diff view for save confirmation
  showDiffForSave(editor: any, selectedScriptIndex: number, selectedTheme: string) {
    if (isPlatformBrowser(this.platformId) && editor && window.monaco) {
      const script = this.fileManager.getScriptTemplate(selectedScriptIndex);
      const scriptKey = `script_${selectedScriptIndex}`;

      const original = this.getLastSavedCode(scriptKey) || script?.code || '';
      const modified = editor.getValue();
      const language = this.fileManager.detectLanguageFromCode(modified);

      console.log('Showing diff for save confirmation');

      showMonacoDiff({
        monaco: window.monaco,
        editor: editor,
        original,
        modified,
        language,
        theme: selectedTheme
      });
    }
  }

  // Show diff
  showDiff(editor: any, selectedScriptIndex: number, selectedTheme: string) {
    if (isPlatformBrowser(this.platformId) && editor && window.monaco) {
      const script = this.fileManager.getScriptTemplate(selectedScriptIndex);
      const scriptKey = `script_${selectedScriptIndex}`;

      const original = this.getLastSavedCode(scriptKey) || script?.code || '';
      const modified = editor.getValue();
      const language = this.fileManager.detectLanguageFromCode(modified);

      console.log('Showing diff between saved and current version');

      showMonacoDiff({
        monaco: window.monaco,
        editor: editor,
        original,
        modified,
        language,
        theme: selectedTheme
      });
    }
  }

  // Revert changes to original script template
  revertChanges(editor: any, selectedScriptIndex: number) {
    if (isPlatformBrowser(this.platformId) && editor) {
      const script = this.fileManager.getScriptTemplate(selectedScriptIndex);
      const scriptKey = `script_${selectedScriptIndex}`;

      const savedCode = this.getLastSavedCode(scriptKey) || script?.code || '';

      editor.setValue(savedCode);

      if (script) {
        this.fileManager.updateScriptTemplate(selectedScriptIndex, savedCode);
      }

      console.log('Changes reverted to last saved version');
      this.showRevertMessage();
    }
  }

  // Open in Live Server functionality
  openInLiveServer(editor: any) {
    if (isPlatformBrowser(this.platformId) && editor) {
      const code = editor.getValue();
      const language = this.fileManager.detectLanguageFromCode(code);

      try {
        this.fileManager.openInLiveServer(code, language);
      } catch (error: any) {
        alert(error.message);
      }
    }
  }

  // File upload functionality
  loadFileIntoEditor(editor: any, file: File, selectedScriptIndex: number) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const content = e.target.result;
      const language = this.fileManager.detectLanguageFromFile(file);

      if (editor) {
        editor.setValue(content);

        const model = editor.getModel();
        if (window.monaco && model) {
          window.monaco.editor.setModelLanguage(model, language);
        }

        const script = this.fileManager.getScriptTemplate(selectedScriptIndex);
        if (script) {
          this.fileManager.updateScriptTemplate(selectedScriptIndex, content);
        }

        console.log(`File loaded: ${file.name} with language: ${language}`);
      }
    };
    reader.readAsText(file);
  }

  // Download file with appropriate extension
  downloadFile(editor: any, selectedScriptIndex: number) {
    if (isPlatformBrowser(this.platformId) && editor) {
      const code = editor.getValue();
      const language = this.fileManager.detectLanguageFromCode(code);
      const script = this.fileManager.getScriptTemplate(selectedScriptIndex);

      if (script) {
        this.fileManager.downloadFile(code, language, script.name);
      }
    }
  }

  // Download all open tabs as ZIP
  async downloadAsZip(editor: any, selectedScriptIndex: number) {
    if (isPlatformBrowser(this.platformId) && editor) {
      try {
        const code = editor.getValue();
        const language = this.fileManager.detectLanguageFromCode(code);
        const script = this.fileManager.getScriptTemplate(selectedScriptIndex);

        if (script) {
          const tabs = [{ name: script.name, code }];
          await this.fileManager.downloadAsZip(tabs);
        }
      } catch (error) {
        console.error('Error creating ZIP:', error);
        alert('ZIP oluşturulurken hata oluştu. Lütfen tekrar deneyin.');
      }
    }
  }

  // Show cancel message
  showCancelMessage() {
    const message = document.createElement('div');
    message.textContent = 'Save cancelled';
    message.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff6b6b;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 600;
      z-index: 10000;
      box-shadow: 0 4px 16px rgba(255, 107, 107, 0.3);
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(message);

    setTimeout(() => {
      if (message.parentNode) {
        message.parentNode.removeChild(message);
      }
    }, 3000);
  }

  // Show save success message
  showSaveSuccessMessage() {
    const message = document.createElement('div');
    message.textContent = 'Code saved successfully!';
    message.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #3fb950;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 600;
      z-index: 10000;
      box-shadow: 0 4px 16px rgba(63, 185, 80, 0.3);
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(message);

    setTimeout(() => {
      if (message.parentNode) {
        message.parentNode.removeChild(message);
      }
    }, 3000);
  }

  // Show revert message
  showRevertMessage() {
    const message = document.createElement('div');
    message.textContent = 'Changes reverted!';
    message.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ffb300;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 600;
      z-index: 10000;
      box-shadow: 0 4px 16px rgba(255, 179, 0, 0.3);
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(message);

    setTimeout(() => {
      if (message.parentNode) {
        message.parentNode.removeChild(message);
      }
    }, 3000);
  }

  // Helper method to get last saved code
  private getLastSavedCode(scriptKey: string): string {
    return this.lastSavedCodeByTab[scriptKey] || '';
  }

  // Update last saved code reference
  updateLastSavedCodeReference(lastSavedCodeByTab: Record<string, string>) {
    this.lastSavedCodeByTab = lastSavedCodeByTab;
  }
} 
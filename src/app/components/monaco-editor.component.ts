import { Component, ElementRef, AfterViewInit, ViewChild, Inject, PLATFORM_ID, Renderer2, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

// Feature importları
import { initializeMonacoIntelliSense, MonacoIntelliSenseProvider } from '../features/intellisense/monaco-intellisense.provider';
import { formatWithPrettier } from '../features/prettier/prettier-format.util';
import { showMonacoDiff } from '../features/diff/monaco-diff.util';
import { applyMonacoTheme } from '../features/theme/monaco-theme.util';
import { validateHTML } from '../features/language/html-validation.util';
import { validateSQL } from '../features/language/sql-validation.util';
import { SQLExecutorService, SQLResult } from '../services/sql-executor.service';
import { MonacoLanguageRegistryService } from '../services/monaco-language-registry.service';
import { EnhancedSQLLanguageService } from '../services/enhanced-sql-language.service';

// Yeni servisler
import { MonacoEditorTabManagerService } from './monaco-editor-tab-manager.service';
import { MonacoEditorCodeExecutorService } from './monaco-editor-code-executor.service';
import { MonacoEditorFileManagerService } from './monaco-editor-file-manager.service';
import { MonacoEditorHoverService } from './monaco-editor-hover.service';

declare global {
  interface Window {
    require: any;
    monaco: any;
    MonacoEnvironment?: any;
  }
}

@Component({
  selector: 'app-monaco-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './monaco-editor.component.html',
  styleUrls: ['./monaco-editor.component.scss'],
})
export class MonacoEditorComponent implements AfterViewInit, OnInit, OnChanges {
  @ViewChild('editorContainer', { static: true }) editorContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef<HTMLInputElement>;
  @Input() selectedScriptIndex: number = 0;
  @Input() editorTheme: string = 'vs-dark';
  
  editor: any;
  intelliSenseProvider: MonacoIntelliSenseProvider | null = null;

  languages: { value: string, label: string, icon: SafeHtml }[] = [];
  selectedLanguage = 'javascript';
  selectedTheme = 'vs-dark';

  // Son kaydedilen kodu saklamak için
  lastSavedCodeByTab: Record<string, string> = {};

  // Diff için orijinal kodları sakla
  originalCodeByTab: Record<string, string> = {};

  // Download menu için
  showDownloadMenu = false;

  // Save confirmation modal için
  showSaveConfirmation = false;

  // Run/Debug için
  showRunOutput = false;
  runOutput: string = '';
  isRunning = false;
  isDebugging = false;
  debugOutput: string = '';
  executionTime: number = 0;

  // Toolbar visibility control
  showToolbar = false;

  // Debug panel visibility
  showVariablesPanel = false;
  showCallStackPanel = false;
  debugCallStack: any[] = [];
  debugVariables: Record<string, any> = {};

  // Breakpoint management
  breakpoints: Set<number> = new Set();
  breakpointDecorations: string[] = [];
  hoverProvider: any = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    @Inject(DomSanitizer) private sanitizer: DomSanitizer | null = null,
    private renderer: Renderer2,
    private hostRef: ElementRef,
    private sqlExecutor: SQLExecutorService,
    private monacoLanguageRegistry: MonacoLanguageRegistryService,
    private enhancedSQLService: EnhancedSQLLanguageService,
    private tabManager: MonacoEditorTabManagerService,
    private codeExecutor: MonacoEditorCodeExecutorService,
    private fileManager: MonacoEditorFileManagerService,
    private hoverService: MonacoEditorHoverService
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeSavedCodes();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedScriptIndex'] && this.editor && isPlatformBrowser(this.platformId)) {
      const newScriptIndex = changes['selectedScriptIndex'].currentValue;
      const selectedScript = this.fileManager.getScriptTemplate(newScriptIndex);
      if (selectedScript) {
        const language = this.fileManager.detectLanguageFromCode(selectedScript.code);
        const model = this.editor.getModel();
        if (window.monaco && model) {
          window.monaco.editor.setModelLanguage(model, language);
        }
        this.editor.setValue(selectedScript.code);
        
        const scriptKey = `script_${newScriptIndex}`;
        if (!this.lastSavedCodeByTab[scriptKey]) {
          this.lastSavedCodeByTab[scriptKey] = selectedScript.code;
          this.originalCodeByTab[scriptKey] = selectedScript.code;
        }
        
        console.log('Script changed to:', selectedScript.name);
      }
    }
    
    if (changes['editorTheme'] && this.editor && isPlatformBrowser(this.platformId)) {
      const newTheme = changes['editorTheme'].currentValue;
      if (window.monaco) {
        window.monaco.editor.setTheme(newTheme);
        console.log('Theme changed to:', newTheme);
      }
    }
  }

  get selectedLanguageLabel(): string {
    const found = this.languages.find(l => l.value === this.selectedLanguage);
    return found ? found.label : '';
  }

  getLanguageIcon(lang: string): SafeHtml | null {
    const found = this.languages.find(l => l.value === lang);
    return found ? found.icon : null;
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    
    if (typeof window.require === 'function') {
      window.require.config({ paths: { 'vs': '/assets/monaco/vs' } });
      (window as any).MonacoEnvironment = {
        getWorkerUrl: function (workerId: string, label: string) {
          const baseUrl = window.location.origin + '/assets/monaco';
          return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
            self.MonacoEnvironment = {
              baseUrl: '${baseUrl}'
            };
            importScripts('${baseUrl}/vs/base/worker/workerMain.js');
          `)}`;
        }
      };
      
      window.require(['vs/editor/editor.main'], () => {
        this.configureMonacoLanguages();
        this.monacoLanguageRegistry.initializeLanguageServices(window.monaco);
        this.enhancedSQLService.registerSQLLanguageService(window.monaco);
        this.intelliSenseProvider = initializeMonacoIntelliSense(window.monaco);

        const selectedScript = this.fileManager.getScriptTemplate(this.selectedScriptIndex);
        if (selectedScript) {
          const language = this.fileManager.detectLanguageFromCode(selectedScript.code);
          this.editor = window.monaco.editor.create(this.editorContainer.nativeElement, {
            value: selectedScript.code,
            language: language,
            theme: this.editorTheme,
            automaticLayout: true,
            glyphMargin: true,
            suggestOnTriggerCharacters: true,
            quickSuggestions: {
              other: true,
              comments: true,
              strings: true
            },
            acceptSuggestionOnCommitCharacter: true,
            acceptSuggestionOnEnter: 'on',
            tabCompletion: 'on',
            wordBasedSuggestions: 'currentDocument',
            parameterHints: {
              enabled: true,
              cycle: true
            },
            suggest: {
              localityBonus: true,
              snippetsPreventQuickSuggestions: false,
              showIcons: true,
              maxVisibleSuggestions: 12,
              insertMode: 'replace',
              filterGraceful: true,
              showKeywords: true,
              showSnippets: true,
              showWords: true,
              showClasses: true,
              showFunctions: true,
              showConstructors: true,
              showFields: true,
              showVariables: true,
              showInterfaces: true,
              showModules: true,
              showProperties: true,
              showEvents: true,
              showOperators: true,
              showUnits: true,
              showValues: true,
              showConstants: true,
              showEnums: true,
              showEnumMembers: true,
              showReferences: true,
              showFolders: true,
              showTypeParameters: true,
              showIssues: true,
              showUsers: true,
              showColors: true
            },
            typescript: {
              suggest: {
                includeCompletionsForModuleExports: true,
                includeCompletionsWithSnippetText: true,
                includeCompletionsWithInsertText: true
              }
            },
            javascript: {
              suggest: {
                includeCompletionsForModuleExports: true,
                includeCompletionsWithSnippetText: true,
                includeCompletionsWithInsertText: true
              }
            },
            folding: true,
            foldingStrategy: 'auto',
            showFoldingControls: 'always',
            unfoldOnClickAfterEndOfLine: false,
            foldingHighlight: true,
            foldingImportsByDefault: false,
            links: true,
            colorDecorators: true,
            lightbulb: {
              enabled: true
            },
            codeActionsOnSave: {
              'source.organizeImports': true
            },
            formatOnPaste: true,
            formatOnType: true,
            autoIndent: 'full',
            bracketPairColorization: {
              enabled: true
            },
            guides: {
              bracketPairs: 'active',
              bracketPairsHorizontal: 'active',
              highlightActiveBracketPair: true,
              indentation: true,
              highlightActiveIndentation: true
            },
            unicodeHighlight: {
              ambiguousCharacters: true,
              invisibleCharacters: true
            },
            inlineSuggest: {
              enabled: true
            },
            stickyScroll: {
              enabled: true
            }
          });
          
          this.initializeBreakpointSupport();
          this.initializeHoverProvider();
          
          this.editor.onDidChangeModelContent(() => {
            this.fileManager.updateScriptTemplate(this.selectedScriptIndex, this.editor.getValue());
            setTimeout(() => this.checkCodeErrors(), 500);
          });
          
          this.addContextMenuActions();
          
          console.log('Monaco editor mounted with script:', selectedScript.name, 'and theme:', this.editorTheme);
        } else {
          console.error('Script template not found for index:', this.selectedScriptIndex);
        }
      });
    } else {
      console.error('Monaco loader.js (window.require) bulunamadı!');
    }
  }

  private addContextMenuActions() {
    if (!this.editor || !window.monaco) return;

    this.editor.addAction({
      id: 'format-document',
      label: 'Format Document',
      keybindings: [window.monaco.KeyMod.Alt | window.monaco.KeyCode.KeyF],
      contextMenuGroupId: '1_modification',
      contextMenuOrder: 1.5,
      run: async (ed: any) => {
        await this.formatCode();
      }
    });
    
    this.editor.addAction({
      id: 'run-code',
      label: 'Run Code',
      keybindings: [window.monaco.KeyMod.Ctrl | window.monaco.KeyCode.F5],
      contextMenuGroupId: '9_cutcopypaste',
      contextMenuOrder: 1.0,
      run: async (ed: any) => {
        await this.runCode();
      }
    });
    
    this.editor.addAction({
      id: 'debug-code',
      label: 'Debug Code',
      keybindings: [window.monaco.KeyCode.F5],
      contextMenuGroupId: '9_cutcopypaste',
      contextMenuOrder: 1.1,
      run: async (ed: any) => {
        await this.debugCode();
      }
    });
    
    this.editor.addAction({
      id: 'open-in-live-server',
      label: 'Open in Live Server',
      contextMenuGroupId: '9_cutcopypaste',
      contextMenuOrder: 1.5,
      run: (ed: any) => {
        this.openInLiveServer();
      }
    });
  }

  // Kod hatalarını kontrol et ve göster
  checkCodeErrors() {
    if (isPlatformBrowser(this.platformId) && this.editor) {
      const code = this.editor.getValue();
      const language = this.fileManager.detectLanguageFromCode(code);
      
      if (language === 'html') {
        const validation = validateHTML(code);
        if (!validation.isValid) {
          console.warn('HTML Validation Errors:', validation.errors);
          this.addValidationMarkers(validation.errors);
        } else {
          console.log('HTML is valid');
          this.clearValidationMarkers();
        }
      } else if (language === 'sql') {
        const validation = validateSQL(code);
        if (!validation.isValid) {
          console.warn('SQL Validation Errors:', validation.errors);
          this.addValidationMarkers(validation.errors);
        } else {
          console.log('SQL is valid');
          this.clearValidationMarkers();
        }
      }
    }
  }

  // Validation markers ekle
  addValidationMarkers(errors: string[]) {
    if (window.monaco && this.editor) {
      const model = this.editor.getModel();
      if (model) {
        const language = this.fileManager.detectLanguageFromCode(this.editor.getValue());
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
  clearValidationMarkers() {
    if (window.monaco && this.editor) {
      const model = this.editor.getModel();
      if (model) {
        const language = this.fileManager.detectLanguageFromCode(this.editor.getValue());
        const namespace = language === 'html' ? 'html-validation' : 'sql-validation';
        window.monaco.editor.setModelMarkers(model, namespace, []);
      }
    }
  }

  onThemeChange(event: any) {
    if (isPlatformBrowser(this.platformId) && this.editor) {
      // @ts-ignore
      monaco.editor.setTheme(this.selectedTheme);
    }
  }

  toggleTheme() {
    this.selectedTheme = this.selectedTheme === 'vs-dark' ? 'vs-light' : 'vs-dark';
    if (isPlatformBrowser(this.platformId) && window.monaco && this.editor) {
      applyMonacoTheme({
        monaco: window.monaco,
        editor: this.editor,
        theme: this.selectedTheme,
        hostElement: this.hostRef.nativeElement,
        renderer: this.renderer
      });
    }
  }

  formatDocument() {
    if (isPlatformBrowser(this.platformId) && this.editor) {
      this.editor.getAction('editor.action.formatDocument').run();
    }
  }

  saveCode() {
    if (isPlatformBrowser(this.platformId) && this.editor) {
      this.showDiffForSave();
    }
  }

  // Show diff view for save confirmation
  showDiffForSave() {
    if (isPlatformBrowser(this.platformId) && this.editor && window.monaco) {
      const script = this.fileManager.getScriptTemplate(this.selectedScriptIndex);
      const scriptKey = `script_${this.selectedScriptIndex}`;
      
      const original = this.lastSavedCodeByTab[scriptKey] || script?.code || '';
      const modified = this.editor.getValue();
      const language = this.fileManager.detectLanguageFromCode(modified);
      
      console.log('Showing diff for save confirmation');
      
      showMonacoDiff({
        monaco: window.monaco,
        editor: this.editor,
        original,
        modified,
        language,
        theme: this.selectedTheme
      });
      
      setTimeout(() => {
        this.showSaveConfirmationModal();
      }, 1000);
    }
  }

  // Confirm save after user reviews diff
  confirmSave() {
    if (isPlatformBrowser(this.platformId) && this.editor) {
      const code = this.editor.getValue();
      const script = this.fileManager.getScriptTemplate(this.selectedScriptIndex);
      
      if (script) {
        this.fileManager.updateScriptTemplate(this.selectedScriptIndex, code);
        
        const scriptKey = `script_${this.selectedScriptIndex}`;
        this.lastSavedCodeByTab[scriptKey] = code;
        this.originalCodeByTab[scriptKey] = code;
        
        console.log('Code saved successfully after diff confirmation:', script.name);
        this.showSaveSuccessMessage();
        this.showSaveConfirmation = false;
      }
    }
  }

  // Cancel save after diff review
  cancelSave() {
    console.log('Save cancelled by user');
    this.showSaveConfirmation = false;
    this.showCancelMessage();
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

  // Show diff
  showDiff() {
    if (isPlatformBrowser(this.platformId) && this.editor && window.monaco) {
      const script = this.fileManager.getScriptTemplate(this.selectedScriptIndex);
      const scriptKey = `script_${this.selectedScriptIndex}`;
      
      const original = this.lastSavedCodeByTab[scriptKey] || script?.code || '';
      const modified = this.editor.getValue();
      const language = this.fileManager.detectLanguageFromCode(modified);
      
      console.log('Showing diff between saved and current version');
      
      showMonacoDiff({
        monaco: window.monaco,
        editor: this.editor,
        original,
        modified,
        language,
        theme: this.selectedTheme
      });
    }
  }

  // Format code using Prettier
  async formatCode() {
    if (isPlatformBrowser(this.platformId) && this.editor) {
      try {
        const code = this.editor.getValue();
        const language = this.fileManager.detectLanguageFromCode(code);
        
        this.clearValidationMarkers();
        
        const formatted = await formatWithPrettier(code, language);
        if (typeof formatted === 'string') {
          const model = this.editor.getModel();
          if (model) {
            setTimeout(() => {
              this.editor.setValue(formatted);
              setTimeout(() => this.checkCodeErrors(), 1000);
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

  // Revert changes to original script template
  revertChanges() {
    if (isPlatformBrowser(this.platformId) && this.editor) {
      const script = this.fileManager.getScriptTemplate(this.selectedScriptIndex);
      const scriptKey = `script_${this.selectedScriptIndex}`;
      
      const savedCode = this.lastSavedCodeByTab[scriptKey] || script?.code || '';
      
      this.editor.setValue(savedCode);
      
      if (script) {
        this.fileManager.updateScriptTemplate(this.selectedScriptIndex, savedCode);
      }
      
      console.log('Changes reverted to last saved version');
      this.showRevertMessage();
    }
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

  // Open in Live Server functionality
  openInLiveServer() {
    if (isPlatformBrowser(this.platformId) && this.editor) {
      const code = this.editor.getValue();
      const language = this.fileManager.detectLanguageFromCode(code);
      
      try {
        this.fileManager.openInLiveServer(code, language);
      } catch (error: any) {
        alert(error.message);
      }
    }
  }

  // File upload functionality
  triggerFileUpload() {
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.click();
    }
    this.showDownloadMenu = false;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.loadFileIntoEditor(file);
    }
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  loadFileIntoEditor(file: File) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const content = e.target.result;
      const language = this.fileManager.detectLanguageFromFile(file);
      
      if (this.editor) {
        this.editor.setValue(content);
        
        const model = this.editor.getModel();
        if (window.monaco && model) {
          window.monaco.editor.setModelLanguage(model, language);
        }
        
        const script = this.fileManager.getScriptTemplate(this.selectedScriptIndex);
        if (script) {
          this.fileManager.updateScriptTemplate(this.selectedScriptIndex, content);
        }
        
        console.log(`File loaded: ${file.name} with language: ${language}`);
      }
    };
    reader.readAsText(file);
  }

  // Download menu toggle
  toggleDownloadMenu() {
    this.showDownloadMenu = !this.showDownloadMenu;
  }

  // Close download menu
  closeDownloadMenu() {
    this.showDownloadMenu = false;
  }

  // Download file with appropriate extension
  downloadFile() {
    if (isPlatformBrowser(this.platformId) && this.editor) {
      const code = this.editor.getValue();
      const language = this.fileManager.detectLanguageFromCode(code);
      const script = this.fileManager.getScriptTemplate(this.selectedScriptIndex);
      
      if (script) {
        this.fileManager.downloadFile(code, language, script.name);
        this.showDownloadMenu = false;
      }
    }
  }

  // Download all open tabs as ZIP
  async downloadAsZip() {
    if (isPlatformBrowser(this.platformId) && this.editor) {
      try {
        const code = this.editor.getValue();
        const language = this.fileManager.detectLanguageFromCode(code);
        const script = this.fileManager.getScriptTemplate(this.selectedScriptIndex);
        
        if (script) {
          const tabs = [{ name: script.name, code }];
          await this.fileManager.downloadAsZip(tabs);
          this.showDownloadMenu = false;
        }
      } catch (error) {
        console.error('Error creating ZIP:', error);
        alert('ZIP oluşturulurken hata oluştu. Lütfen tekrar deneyin.');
      }
    }
  }

  // Initialize saved codes for all scripts
  initializeSavedCodes() {
    const scripts = this.fileManager.allScriptTemplates;
    scripts.forEach((script, index) => {
      const scriptKey = `script_${index}`;
      this.lastSavedCodeByTab[scriptKey] = script.code;
      this.originalCodeByTab[scriptKey] = script.code;
    });
  }

  // Show save confirmation modal
  showSaveConfirmationModal() {
    this.showSaveConfirmation = true;
  }

  // Run Code
  async runCode() {
    if (isPlatformBrowser(this.platformId) && this.editor) {
      const code = this.editor.getValue();
      const language = this.fileManager.detectLanguageFromCode(code);
      
      this.isRunning = true;
      this.showRunOutput = true;
      this.runOutput = 'Running...\n';
      
      try {
        const result = await this.codeExecutor.runCode(code, language);
        this.runOutput = result.output;
        this.executionTime = result.executionTime;
      } catch (error: any) {
        this.runOutput += `\nError: ${error.message || error}\n`;
      } finally {
        this.isRunning = false;
      }
    }
  }

  // Debug Code
  async debugCode() {
    if (isPlatformBrowser(this.platformId) && this.editor) {
      const code = this.editor.getValue();
      const language = this.fileManager.detectLanguageFromCode(code);
      
      this.isDebugging = true;
      this.showRunOutput = true;
      this.debugOutput = 'Starting debug session...\n';
      this.runOutput = this.debugOutput;
      
      if (this.breakpoints.size > 0) {
        this.debugOutput += `Found ${this.breakpoints.size} breakpoint(s) at lines: ${Array.from(this.breakpoints).join(', ')}\n`;
        this.runOutput += this.debugOutput;
        
        this.showVariablesPanel = true;
        this.showCallStackPanel = true;
        this.updateDebugVariables();
        this.updateDebugCallStack();
      }
      
      try {
        const result = await this.codeExecutor.debugCode(code, language, this.breakpoints);
        this.runOutput = result.output;
        this.executionTime = result.executionTime;
      } catch (error: any) {
        this.runOutput += `\nDebug Error: ${error.message || error}\n`;
      } finally {
        this.isDebugging = false;
        
        setTimeout(() => {
          this.showVariablesPanel = false;
          this.showCallStackPanel = false;
        }, 3000);
      }
    }
  }

  // Close run output panel
  closeRunOutput() {
    this.showRunOutput = false;
    this.runOutput = '';
    this.isRunning = false;
    this.isDebugging = false;
  }

  // Clear run output
  clearRunOutput() {
    this.runOutput = '';
    this.debugOutput = '';
  }

  // Toggle toolbar visibility
  toggleToolbar() {
    this.showToolbar = !this.showToolbar;
  }

  // Close toolbar
  closeToolbar() {
    this.showToolbar = false;
  }

  // Breakpoint yönetimi metodları
  private initializeBreakpointSupport() {
    if (!isPlatformBrowser(this.platformId) || !this.editor) return;

    this.editor.onMouseDown((e: any) => {
      if (e.target && e.target.type === window.monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        const lineNumber = e.target.position.lineNumber;
        this.toggleBreakpoint(lineNumber);
      }
    });

    this.updateBreakpointDecorations();
  }

  // Breakpoint toggle işlemi
  toggleBreakpoint(lineNumber: number) {
    if (this.breakpoints.has(lineNumber)) {
      this.breakpoints.delete(lineNumber);
    } else {
      this.breakpoints.add(lineNumber);
    }
    this.updateBreakpointDecorations();
  }

  // Breakpoint decorasyonlarını güncelle
  private updateBreakpointDecorations() {
    if (!this.editor || !window.monaco) return;

    const decorations = Array.from(this.breakpoints).map(lineNumber => ({
      range: new window.monaco.Range(lineNumber, 1, lineNumber, 1),
      options: {
        isWholeLine: false,
        glyphMarginClassName: 'my-breakpoint-glyph',
        glyphMarginHoverMessage: { value: `Breakpoint on line ${lineNumber}` },
      }
    }));

    this.breakpointDecorations = this.editor.deltaDecorations(
      this.breakpointDecorations,
      decorations
    );
  }

  // Hover provider'ı initialize et  
  private initializeHoverProvider() {
    if (!isPlatformBrowser(this.platformId) || !window.monaco) return;

    // TypeScript/JavaScript için hover provider
    this.hoverProvider = window.monaco.languages.registerHoverProvider('typescript', {
      provideHover: (model: any, position: any) => {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const wordText = word.word;
        const lineContent = model.getLineContent(position.lineNumber);
        const fullCode = model.getValue();
        
        const hoverInfo = this.hoverService.getDetailedHoverInfo(wordText, lineContent, fullCode, position.lineNumber);
        
        if (hoverInfo) {
          return {
            range: new window.monaco.Range(
              position.lineNumber,
              word.startColumn,
              position.lineNumber,
              word.endColumn
            ),
            contents: hoverInfo.contents
          };
        }
        return null;
      }
    });

    // JavaScript için de aynı provider'ı kaydet
    window.monaco.languages.registerHoverProvider('javascript', {
      provideHover: (model: any, position: any) => {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const wordText = word.word;
        const lineContent = model.getLineContent(position.lineNumber);
        const fullCode = model.getValue();
        
        const hoverInfo = this.hoverService.getDetailedHoverInfo(wordText, lineContent, fullCode, position.lineNumber);
        
        if (hoverInfo) {
          return {
            range: new window.monaco.Range(
              position.lineNumber,
              word.startColumn,
              position.lineNumber,
              word.endColumn
            ),
            contents: hoverInfo.contents
          };
        }
        return null;
      }
    });

    // HTML için hover provider
    window.monaco.languages.registerHoverProvider('html', {
      provideHover: (model: any, position: any) => {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const wordText = word.word;
        const lineContent = model.getLineContent(position.lineNumber);
        
        const htmlInfo = this.hoverService.getHTMLHoverInfo(wordText, lineContent);
        
        if (htmlInfo) {
          return {
            range: new window.monaco.Range(
              position.lineNumber,
              word.startColumn,
              position.lineNumber,
              word.endColumn
            ),
            contents: htmlInfo.contents
          };
        }
        return null;
      }
    });

    // SQL için hover provider
    window.monaco.languages.registerHoverProvider('sql', {
      provideHover: (model: any, position: any) => {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const wordText = word.word.toUpperCase();
        const lineContent = model.getLineContent(position.lineNumber);
        
        const sqlInfo = this.hoverService.getSQLHoverInfo(wordText, lineContent);
        
        if (sqlInfo) {
          return {
            range: new window.monaco.Range(
              position.lineNumber,
              word.startColumn,
              position.lineNumber,
              word.endColumn
            ),
            contents: sqlInfo.contents
          };
        }
        return null;
      }
    });
  }

  // Debug panelleri için toggle metodları
  toggleVariablesPanel() {
    this.showVariablesPanel = !this.showVariablesPanel;
    if (this.showVariablesPanel && this.isDebugging) {
      this.updateDebugVariables();
    }
  }

  toggleCallStackPanel() {
    this.showCallStackPanel = !this.showCallStackPanel;
    if (this.showCallStackPanel && this.isDebugging) {
      this.updateDebugCallStack();
    }
  }

  // Debug değişkenlerini güncelle
  private updateDebugVariables() {
    this.debugVariables = {
      'localVar': 'string: "Hello World"',
      'counter': 'number: 42',
      'isActive': 'boolean: true',
      'userData': 'object: { name: "John", age: 30 }'
    };
  }

  // Debug call stack'ini güncelle
  private updateDebugCallStack() {
    const callStack = [
      { name: 'main()', file: 'script.js', line: 15 },
      { name: 'processData()', file: 'script.js', line: 8 },
      { name: 'validateInput()', file: 'script.js', line: 3 }
    ];
    this.debugCallStack = callStack;
  }

  // Monaco Editor dil yapılandırması
  private configureMonacoLanguages(): void {
    if (!window.monaco) return;

    this.configureHTMLSupport();
    this.configureSQLSupport();
  }

  private configureHTMLSupport(): void {
    const monaco = window.monaco;
    
    monaco.languages.registerCompletionItemProvider('html', {
      provideCompletionItems: (model: any, position: any) => {
        const suggestions = [
          {
            label: 'div',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '<div>\n\t$0\n</div>',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'HTML div element'
          },
          {
            label: 'span',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '<span>$0</span>',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'HTML span element'
          },
          {
            label: 'h1',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '<h1>$0</h1>',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'HTML h1 element'
          },
          {
            label: 'p',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '<p>$0</p>',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'HTML paragraph element'
          }
        ];
        
        return { suggestions };
      }
    });
  }

  private configureSQLSupport(): void {
    const monaco = window.monaco;
    
    monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: (model: any, position: any) => {
        const suggestions = [
          {
            label: 'SELECT',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'SELECT $0',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'SQL SELECT statement'
          },
          {
            label: 'FROM',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'FROM $0',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'SQL FROM clause'
          },
          {
            label: 'WHERE',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'WHERE $0',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'SQL WHERE clause'
          },
          {
            label: 'INSERT',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'INSERT INTO $0',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'SQL INSERT statement'
          }
        ];
        
        return { suggestions };
      }
    });
  }
} 
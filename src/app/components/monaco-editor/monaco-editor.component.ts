import { Component, ElementRef, AfterViewInit, ViewChild, Inject, PLATFORM_ID, Renderer2, OnInit, Input, OnChanges, SimpleChanges, Optional } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import type { Environment } from 'monaco-editor';

// Feature importları
import { SQLExecutorService, SQLResult } from '../../services/sql-executor.service';
import { MonacoLanguageRegistryService } from '../../services/monaco-language-registry.service';
import { EnhancedSQLLanguageService } from '../../services/enhanced-sql-language.service';

// Yeni servisler
import { MonacoEditorTabManagerService } from './services/monaco-editor-tab-manager.service';
import { MonacoEditorCodeExecutorService } from './services/monaco-editor-code-executor.service';
import { MonacoEditorFileManagerService } from './services/monaco-editor-file-manager.service';
import { MonacoEditorHoverService } from './services/monaco-editor-hover.service';

// Yeni modüler sınıflar
import { MonacoEditorCore } from './core/monaco-editor-core';
import { MonacoEditorActions } from './actions/monaco-editor-actions';
import { MonacoEditorDebug } from './debug/monaco-editor-debug';
import { MonacoEditorUI } from './ui/monaco-editor-ui';

// DI imports
import { THIS_GLOBALS } from '../../core/intellisense/di/this-globals.token';

declare global {
  interface Window {
    require: any;
    monaco: any;
    MonacoEnvironment?: Environment | undefined;
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

  // Modüler sınıflar
  private editorCore: MonacoEditorCore;
  private editorActions: MonacoEditorActions;
  private editorDebug: MonacoEditorDebug;
  private editorUI: MonacoEditorUI;

  // Editor instance
  editor: any;

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
    private hoverService: MonacoEditorHoverService,
    @Optional() @Inject(THIS_GLOBALS) private thisGlobals: any
  ) {
    // Modüler sınıfları başlat - sıralama önemli
    this.editorUI = new MonacoEditorUI(
      this.platformId,
      this.sanitizer
    );

    this.editorCore = new MonacoEditorCore(
      this.platformId,
      this.monacoLanguageRegistry,
      this.enhancedSQLService,
      this.fileManager,
      this.hoverService,
      this.thisGlobals
    );

    this.editorActions = new MonacoEditorActions(
      this.platformId,
      this.renderer,
      this.hostRef,
      this.fileManager,
      this.editorUI.lastSavedCodeByTab
    );

    this.editorDebug = new MonacoEditorDebug(
      this.platformId,
      this.codeExecutor
    );
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.editorUI.initializeSavedCodes(this.fileManager.allScriptTemplates);
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
        if (!this.editorUI.getLastSavedCode(scriptKey)) {
          this.editorUI.setLastSavedCode(scriptKey, selectedScript.code);
          this.editorUI.setOriginalCode(scriptKey, selectedScript.code);
        }

        // editorActions'a güncellenmiş referansı geç
        this.editorActions.updateLastSavedCodeReference(this.editorUI.lastSavedCodeByTab);

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

  // UI getter methods
  get selectedLanguageLabel(): string {
    return this.editorUI.selectedLanguageLabel;
  }

  getLanguageIcon(lang: string): SafeHtml | null {
    return this.editorUI.getLanguageIcon(lang);
  }

  get showDownloadMenu() { return this.editorUI.showDownloadMenu; }
  get showSaveConfirmation() { return this.editorUI.showSaveConfirmation; }
  get showRunOutput() { return this.editorUI.showRunOutput; }
  get runOutput() { return this.editorUI.runOutput; }
  get isRunning() { return this.editorUI.isRunning; }
  get isDebugging() { return this.editorUI.isDebugging; }
  get debugOutput() { return this.editorUI.debugOutput; }
  get executionTime() { return this.editorUI.executionTime; }
  get showToolbar() { return this.editorUI.showToolbar; }
  get showVariablesPanel() { return this.editorDebug.showVariablesPanel; }
  get showCallStackPanel() { return this.editorDebug.showCallStackPanel; }
  get debugCallStack() { return this.editorDebug.debugCallStack; }
  get debugVariables() { return this.editorDebug.debugVariables; }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.editorCore.initializeMonaco(
      this.editorContainer.nativeElement,
      this.selectedScriptIndex,
      this.editorTheme
    ).then((editor) => {
      this.editor = editor;
      this.editorDebug.initializeBreakpointSupport(editor);

      this.editor.onDidChangeModelContent(() => {
        this.fileManager.updateScriptTemplate(this.selectedScriptIndex, this.editor.getValue());
        setTimeout(() => this.editorActions.checkCodeErrors(this.editor), 500);
      });

      console.log('Monaco editor initialized successfully');
    }).catch((error) => {
      console.error('Failed to initialize Monaco editor:', error);
    });
  }

  // Theme methods
  onThemeChange(event: any) {
    if (isPlatformBrowser(this.platformId) && this.editor) {
      window.monaco.editor.setTheme(this.editorUI.selectedTheme);
    }
  }

  toggleTheme() {
    this.editorUI.selectedTheme = this.editorActions.toggleTheme(this.editor, this.editorUI.selectedTheme);
  }

  // Format methods
  formatDocument() {
    this.editorActions.formatDocument(this.editor);
  }

  async formatCode() {
    await this.editorActions.formatCode(this.editor);
  }

  // Save methods
  saveCode() {
    if (isPlatformBrowser(this.platformId) && this.editor) {
      this.editorActions.showDiffForSave(this.editor, this.selectedScriptIndex, this.editorUI.selectedTheme);
      setTimeout(() => {
        this.editorUI.showSaveConfirmationModal();
      }, 1000);
    }
  }

  confirmSave() {
    if (isPlatformBrowser(this.platformId) && this.editor) {
      const code = this.editor.getValue();
      const script = this.fileManager.getScriptTemplate(this.selectedScriptIndex);

      if (script) {
        this.fileManager.updateScriptTemplate(this.selectedScriptIndex, code);

        const scriptKey = `script_${this.selectedScriptIndex}`;
        this.editorUI.setLastSavedCode(scriptKey, code);
        this.editorUI.setOriginalCode(scriptKey, code);

        console.log('Code saved successfully after diff confirmation:', script.name);
        this.editorActions.showSaveSuccessMessage();
        this.editorUI.showSaveConfirmation = false;
      }
    }
  }

  cancelSave() {
    console.log('Save cancelled by user');
    this.editorUI.showSaveConfirmation = false;
    this.editorActions.showCancelMessage();
  }

  // Diff methods
  showDiff() {
    this.editorActions.showDiff(this.editor, this.selectedScriptIndex, this.editorUI.selectedTheme);
  }

  // Revert methods
  revertChanges() {
    this.editorActions.revertChanges(this.editor, this.selectedScriptIndex);
  }

  // Live Server methods
  openInLiveServer() {
    this.editorActions.openInLiveServer(this.editor);
  }

  // File methods
  triggerFileUpload() {
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.click();
    }
    this.editorUI.closeDownloadMenu();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.editorActions.loadFileIntoEditor(this.editor, file, this.selectedScriptIndex);
    }
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  // Download methods
  toggleDownloadMenu() {
    this.editorUI.toggleDownloadMenu();
  }

  closeDownloadMenu() {
    this.editorUI.closeDownloadMenu();
  }

  downloadFile() {
    this.editorActions.downloadFile(this.editor, this.selectedScriptIndex);
    this.editorUI.closeDownloadMenu();
  }

  async downloadAsZip() {
    await this.editorActions.downloadAsZip(this.editor, this.selectedScriptIndex);
    this.editorUI.closeDownloadMenu();
  }

  // Run/Debug methods
  async runCode() {
    this.editorUI.setRunningState(true);
    this.editorUI.updateRunOutput('Running...\n');

    try {
      const result = await this.editorDebug.runCode(this.editor);
      this.editorUI.updateRunOutput(result.output, result.executionTime);
    } catch (error: any) {
      this.editorUI.updateRunOutput(`\nError: ${error.message || error}\n`);
    } finally {
      this.editorUI.setRunningState(false);
    }
  }

  async debugCode() {
    this.editorUI.setDebuggingState(true);
    this.editorUI.updateRunOutput('Starting debug session...\n');

    try {
      const result = await this.editorDebug.debugCode(this.editor);
      this.editorUI.updateRunOutput(result.output, result.executionTime);
    } catch (error: any) {
      this.editorUI.updateRunOutput(`\nDebug Error: ${error.message || error}\n`);
    } finally {
      this.editorUI.setDebuggingState(false);

      setTimeout(() => {
        this.editorDebug.showVariablesPanel = false;
        this.editorDebug.showCallStackPanel = false;
      }, 3000);
    }
  }

  closeRunOutput() {
    this.editorUI.closeRunOutput();
  }

  clearRunOutput() {
    this.editorUI.clearRunOutput();
  }

  // Toolbar methods
  toggleToolbar() {
    this.editorUI.toggleToolbar();
  }

  closeToolbar() {
    this.editorUI.closeToolbar();
  }

  // Debug panel methods
  toggleVariablesPanel() {
    this.editorDebug.toggleVariablesPanel();
  }

  toggleCallStackPanel() {
    this.editorDebug.toggleCallStackPanel();
  }

  // Breakpoint methods
  toggleBreakpoint(lineNumber: number) {
    this.editorDebug.toggleBreakpoint(lineNumber, this.editor);
  }

  // Panel toggle methods
  toggleRunOutput() {
    this.editorUI.toggleRunOutput();
  }

  closeVariablesPanel() {
    this.editorDebug.showVariablesPanel = false;
  }

  closeCallStackPanel() {
    this.editorDebug.showCallStackPanel = false;
  }

  // Cleanup
  ngOnDestroy() {
    if (this.editorCore) {
      this.editorCore.destroy();
    }
  }
} 
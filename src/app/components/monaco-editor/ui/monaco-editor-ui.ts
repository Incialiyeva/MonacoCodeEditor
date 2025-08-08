import { isPlatformBrowser } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export class MonacoEditorUI {
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

  constructor(
    private platformId: Object,
    private sanitizer: DomSanitizer | null = null
  ) {}

  get selectedLanguageLabel(): string {
    const found = this.languages.find(l => l.value === this.selectedLanguage);
    return found ? found.label : '';
  }

  getLanguageIcon(lang: string): SafeHtml | null {
    const found = this.languages.find(l => l.value === lang);
    return found ? found.icon : null;
  }

  // Download menu toggle
  toggleDownloadMenu() {
    this.showDownloadMenu = !this.showDownloadMenu;
  }

  // Close download menu
  closeDownloadMenu() {
    this.showDownloadMenu = false;
  }

  // Show save confirmation modal
  showSaveConfirmationModal() {
    this.showSaveConfirmation = true;
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

  // Toggle run output panel
  toggleRunOutput() {
    this.showRunOutput = !this.showRunOutput;
  }

  // Initialize saved codes for all scripts
  initializeSavedCodes(scripts: any[]) {
    scripts.forEach((script, index) => {
      const scriptKey = `script_${index}`;
      this.lastSavedCodeByTab[scriptKey] = script.code;
      this.originalCodeByTab[scriptKey] = script.code;
    });
  }

  // Get last saved code for a script
  getLastSavedCode(scriptKey: string): string {
    return this.lastSavedCodeByTab[scriptKey] || '';
  }

  // Set last saved code for a script
  setLastSavedCode(scriptKey: string, code: string) {
    this.lastSavedCodeByTab[scriptKey] = code;
  }

  // Get original code for a script
  getOriginalCode(scriptKey: string): string {
    return this.originalCodeByTab[scriptKey] || '';
  }

  // Set original code for a script
  setOriginalCode(scriptKey: string, code: string) {
    this.originalCodeByTab[scriptKey] = code;
  }

  // Update run output
  updateRunOutput(output: string, executionTime: number = 0) {
    this.runOutput = output;
    this.executionTime = executionTime;
    this.showRunOutput = true;
  }

  // Set running state
  setRunningState(isRunning: boolean) {
    this.isRunning = isRunning;
  }

  // Set debugging state
  setDebuggingState(isDebugging: boolean) {
    this.isDebugging = isDebugging;
  }

  // Update debug output
  updateDebugOutput(output: string) {
    this.debugOutput = output;
    this.runOutput = output;
  }

  // Check if code has unsaved changes
  hasUnsavedChanges(scriptKey: string, currentCode: string): boolean {
    const savedCode = this.getLastSavedCode(scriptKey);
    return savedCode !== currentCode;
  }

  // Get all script keys
  getAllScriptKeys(): string[] {
    return Object.keys(this.lastSavedCodeByTab);
  }

  // Clear all saved codes
  clearAllSavedCodes() {
    this.lastSavedCodeByTab = {};
    this.originalCodeByTab = {};
  }

  // Get script info
  getScriptInfo(scriptKey: string): { savedCode: string; originalCode: string; hasChanges: boolean } {
    const savedCode = this.getLastSavedCode(scriptKey);
    const originalCode = this.getOriginalCode(scriptKey);
    const hasChanges = savedCode !== originalCode;

    return {
      savedCode,
      originalCode,
      hasChanges
    };
  }

  // Save current state
  saveCurrentState(scriptKey: string, code: string) {
    this.setLastSavedCode(scriptKey, code);
    this.setOriginalCode(scriptKey, code);
  }

  // Reset to original state
  resetToOriginal(scriptKey: string): string {
    const originalCode = this.getOriginalCode(scriptKey);
    this.setLastSavedCode(scriptKey, originalCode);
    return originalCode;
  }

  // Get UI state summary
  getUIStateSummary() {
    return {
      showDownloadMenu: this.showDownloadMenu,
      showSaveConfirmation: this.showSaveConfirmation,
      showRunOutput: this.showRunOutput,
      showToolbar: this.showToolbar,
      isRunning: this.isRunning,
      isDebugging: this.isDebugging,
      selectedLanguage: this.selectedLanguage,
      selectedTheme: this.selectedTheme,
      savedScriptsCount: Object.keys(this.lastSavedCodeByTab).length
    };
  }

  // Reset UI state
  resetUIState() {
    this.showDownloadMenu = false;
    this.showSaveConfirmation = false;
    this.showRunOutput = false;
    this.showToolbar = false;
    this.isRunning = false;
    this.isDebugging = false;
    this.runOutput = '';
    this.debugOutput = '';
    this.executionTime = 0;
  }
} 
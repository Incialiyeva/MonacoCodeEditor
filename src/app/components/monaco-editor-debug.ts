import { isPlatformBrowser } from '@angular/common';
import { MonacoEditorCodeExecutorService } from './monaco-editor-code-executor.service';

declare global {
  interface Window {
    monaco: any;
  }
}

export class MonacoEditorDebug {
  // Breakpoint management
  breakpoints: Set<number> = new Set();
  breakpointDecorations: string[] = [];

  // Debug panel visibility
  showVariablesPanel = false;
  showCallStackPanel = false;
  debugCallStack: any[] = [];
  debugVariables: Record<string, any> = {};

  constructor(
    private platformId: Object,
    private codeExecutor: MonacoEditorCodeExecutorService
  ) {}

  // Breakpoint yönetimi metodları
  initializeBreakpointSupport(editor: any) {
    if (!isPlatformBrowser(this.platformId) || !editor) return;

    editor.onMouseDown((e: any) => {
      if (e.target && e.target.type === window.monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        const lineNumber = e.target.position.lineNumber;
        this.toggleBreakpoint(lineNumber, editor);
      }
    });

    this.updateBreakpointDecorations(editor);
  }

  // Breakpoint toggle işlemi
  toggleBreakpoint(lineNumber: number, editor: any) {
    if (this.breakpoints.has(lineNumber)) {
      this.breakpoints.delete(lineNumber);
    } else {
      this.breakpoints.add(lineNumber);
    }
    this.updateBreakpointDecorations(editor);
  }

  // Breakpoint decorasyonlarını güncelle
  updateBreakpointDecorations(editor: any) {
    if (!editor || !window.monaco) return;

    const decorations = Array.from(this.breakpoints).map(lineNumber => ({
      range: new window.monaco.Range(lineNumber, 1, lineNumber, 1),
      options: {
        isWholeLine: false,
        glyphMarginClassName: 'my-breakpoint-glyph',
        glyphMarginHoverMessage: { value: `Breakpoint on line ${lineNumber}` },
      }
    }));

    this.breakpointDecorations = editor.deltaDecorations(
      this.breakpointDecorations,
      decorations
    );
  }

  // Debug panelleri için toggle metodları
  toggleVariablesPanel() {
    this.showVariablesPanel = !this.showVariablesPanel;
    if (this.showVariablesPanel) {
      this.updateDebugVariables();
    }
  }

  toggleCallStackPanel() {
    this.showCallStackPanel = !this.showCallStackPanel;
    if (this.showCallStackPanel) {
      this.updateDebugCallStack();
    }
  }

  // Debug değişkenlerini güncelle
  updateDebugVariables() {
    this.debugVariables = {
      'localVar': 'string: "Hello World"',
      'counter': 'number: 42',
      'isActive': 'boolean: true',
      'userData': 'object: { name: "John", age: 30 }'
    };
  }

  // Debug call stack'ini güncelle
  updateDebugCallStack() {
    const callStack = [
      { name: 'main()', file: 'script.js', line: 15 },
      { name: 'processData()', file: 'script.js', line: 8 },
      { name: 'validateInput()', file: 'script.js', line: 3 }
    ];
    this.debugCallStack = callStack;
  }

  // Run Code
  async runCode(editor: any): Promise<{ output: string; executionTime: number }> {
    if (isPlatformBrowser(this.platformId) && editor) {
      const code = editor.getValue();
      const language = this.detectLanguageFromCode(code);

      try {
        const result = await this.codeExecutor.runCode(code, language);
        return result;
      } catch (error: any) {
        return {
          output: `Error: ${error.message || error}`,
          executionTime: 0
        };
      }
    }
    return { output: '', executionTime: 0 };
  }

  // Debug Code
  async debugCode(editor: any): Promise<{ output: string; executionTime: number }> {
    if (isPlatformBrowser(this.platformId) && editor) {
      const code = editor.getValue();
      const language = this.detectLanguageFromCode(code);

      let debugOutput = 'Starting debug session...\n';

      if (this.breakpoints.size > 0) {
        debugOutput += `Found ${this.breakpoints.size} breakpoint(s) at lines: ${Array.from(this.breakpoints).join(', ')}\n`;
        this.showVariablesPanel = true;
        this.showCallStackPanel = true;
        this.updateDebugVariables();
        this.updateDebugCallStack();
      }

      try {
        const result = await this.codeExecutor.debugCode(code, language, this.breakpoints);
        return {
          output: debugOutput + result.output,
          executionTime: result.executionTime
        };
      } catch (error: any) {
        return {
          output: debugOutput + `\nDebug Error: ${error.message || error}`,
          executionTime: 0
        };
      }
    }
    return { output: '', executionTime: 0 };
  }

  // Helper method to detect language from code
  private detectLanguageFromCode(code: string): string {
    if (code.includes('<!DOCTYPE html>') || code.includes('<html>')) {
      return 'html';
    } else if (code.includes('SELECT') || code.includes('INSERT') || code.includes('UPDATE') || code.includes('DELETE')) {
      return 'sql';
    } else if (code.includes('function') || code.includes('const') || code.includes('let') || code.includes('var')) {
      return 'javascript';
    } else {
      return 'javascript';
    }
  }

  // Clear breakpoints
  clearBreakpoints(editor: any) {
    this.breakpoints.clear();
    this.updateBreakpointDecorations(editor);
  }

  // Get breakpoint count
  getBreakpointCount(): number {
    return this.breakpoints.size;
  }

  // Get breakpoint lines
  getBreakpointLines(): number[] {
    return Array.from(this.breakpoints);
  }

  // Check if line has breakpoint
  hasBreakpoint(lineNumber: number): boolean {
    return this.breakpoints.has(lineNumber);
  }

  // Remove breakpoint at specific line
  removeBreakpoint(lineNumber: number, editor: any) {
    if (this.breakpoints.has(lineNumber)) {
      this.breakpoints.delete(lineNumber);
      this.updateBreakpointDecorations(editor);
    }
  }

  // Add breakpoint at specific line
  addBreakpoint(lineNumber: number, editor: any) {
    this.breakpoints.add(lineNumber);
    this.updateBreakpointDecorations(editor);
  }

  // Reset debug state
  resetDebugState() {
    this.showVariablesPanel = false;
    this.showCallStackPanel = false;
    this.debugCallStack = [];
    this.debugVariables = {};
  }
} 
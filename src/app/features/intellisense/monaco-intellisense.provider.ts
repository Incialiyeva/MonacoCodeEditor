/**
 * Monaco IntelliSense Provider
 * Provides advanced IntelliSense and type checking for JavaScript/TypeScript
 * WITHOUT custom suggestions - uses Monaco's built-in autocomplete
 */

export interface ExtraLibDefinition {
  content: string;
  targetFileSrc: string;
}

export class MonacoIntelliSenseProvider {
  private monaco: any;
  private extraLibList: ExtraLibDefinition[] = [];
  private loadedLibs: Set<string> = new Set();

  constructor(monaco: any) {
    this.monaco = monaco;
    this.initializeDefaultLibs();
  }

  /**
   * Initialize default type definitions
   */
  private initializeDefaultLibs(): void {
    // Core context definitions
    this.addLib({
      content: `
declare global {
  /**
   * Main context interface for this. object
   */
  interface ThisContext {
    /**
     * Get a value from context
     * @param key - The key to retrieve
     * @returns The value associated with the key
     */
    get(key: string): any;
    
    /**
     * Set a value in context
     * @param key - The key to set
     * @param value - The value to set
     */
    set(key: string, value: any): void;
    
    /**
     * Record object with nested properties
     */
    record: {
      /**
       * Record ID
       */
      id: string | number;
      
      /**
       * Record status
       */
      status: 'active' | 'inactive' | 'pending';
      
      /**
       * Record name
       */
      name: string;
      
      /**
       * Record email
       */
      email: string;
      
      /**
       * Record creation date
       */
      createdAt: Date;
      
      /**
       * Record update date
       */
      updatedAt: Date;
    };
    
    /**
     * Form object for form operations
     */
    form: {
      /**
       * Get form field value
       * @param field - Field name
       * @returns Field value
       */
      getValue(field: string): any;
      
      /**
       * Set form field value
       * @param field - Field name
       * @param value - Value to set
       */
      setValue(field: string, value: any): void;
      
      /**
       * Validate form
       * @returns Validation result
       */
      validate(): boolean;
      
      /**
       * Submit form
       */
      submit(): void;
    };
    
    /**
     * Dialog object for user interactions
     */
    dialog: {
      /**
       * Show alert dialog
       * @param message - Message to display
       */
      alert(message: string): void;
      
      /**
       * Show confirmation dialog
       * @param message - Message to display
       * @returns User confirmation result
       */
      confirm(message: string): boolean;
      
      /**
       * Show prompt dialog
       * @param message - Message to display
       * @param defaultValue - Default value
       * @returns User input or null
       */
      prompt(message: string, defaultValue?: string): string | null;
    };
    
    /**
     * Navigation object for page navigation
     */
    navigation: {
      /**
       * Navigate to a path
       * @param path - Path to navigate to
       */
      go(path: string): void;
      
      /**
       * Go back to previous page
       */
      back(): void;
      
      /**
       * Navigate to a specific page
       * @param page - Page name or ID
       */
      navigate(page: string | number): void;
    };
    
    /**
     * Record service for data operations
     */
    recordService: {
      /**
       * Get current record
       * @returns Current record object
       */
      getCurrentRecord(): any;
      
      /**
       * Save record
       * @param record - Record to save
       * @returns Success status
       */
      saveRecord(record: any): boolean;
      
      /**
       * Delete record
       * @param id - Record ID to delete
       * @returns Success status
       */
      deleteRecord(id: string | number): boolean;
      
      /**
       * Find records by criteria
       * @param criteria - Search criteria
       * @returns Array of matching records
       */
      findRecords(criteria: any): any[];
    };
    
    /**
     * Page object for page operations
     */
    page: {
      /**
       * Get page title
       * @returns Current page title
       */
      getTitle(): string;
      
      /**
       * Set page title
       * @param title - New page title
       */
      setTitle(title: string): void;
      
      /**
       * Get current page URL
       * @returns Current page URL
       */
      getUrl(): string;
      
      /**
       * Refresh current page
       */
      refresh(): void;
    };
    
    /**
     * Utils object for utility functions
     */
    utils: {
      /**
       * Format date
       * @param date - Date to format
       * @param format - Format string
       * @returns Formatted date string
       */
      formatDate(date: Date | string, format?: string): string;
      
      /**
       * Generate unique ID
       * @returns Generated ID
       */
      generateId(): string;
      
      /**
       * Deep clone object
       * @param obj - Object to clone
       * @returns Cloned object
       */
      clone<T>(obj: T): T;
      
      /**
       * Merge objects
       * @param target - Target object
       * @param sources - Source objects
       * @returns Merged object
       */
      merge(target: any, ...sources: any[]): any;
    };
    
    /**
     * HTTP object for API calls
     */
    http: {
      /**
       * Make GET request
       * @param url - Request URL
       * @param params - Query parameters
       * @returns Promise with response
       */
      get(url: string, params?: any): Promise<any>;
      
      /**
       * Make POST request
       * @param url - Request URL
       * @param data - Request data
       * @returns Promise with response
       */
      post(url: string, data?: any): Promise<any>;
      
      /**
       * Make PUT request
       * @param url - Request URL
       * @param data - Request data
       * @returns Promise with response
       */
      put(url: string, data?: any): Promise<any>;
      
      /**
       * Make DELETE request
       * @param url - Request URL
       * @returns Promise with response
       */
      delete(url: string): Promise<any>;
    };
    
    /**
     * Storage object for data persistence
     */
    storage: {
      /**
       * Get stored value
       * @param key - Storage key
       * @returns Stored value
       */
      get(key: string): any;
      
      /**
       * Set stored value
       * @param key - Storage key
       * @param value - Value to store
       */
      set(key: string, value: any): void;
      
      /**
       * Remove stored value
       * @param key - Storage key
       */
      remove(key: string): void;
      
      /**
       * Clear all stored values
       */
      clear(): void;
    };
    
    /**
     * Events object for event handling
     */
    events: {
      /**
       * Add event listener
       * @param event - Event name
       * @param handler - Event handler function
       */
      on(event: string, handler: Function): void;
      
      /**
       * Remove event listener
       * @param event - Event name
       * @param handler - Event handler function
       */
      off(event: string, handler: Function): void;
      
      /**
       * Emit event
       * @param event - Event name
       * @param args - Event arguments
       */
      emit(event: string, ...args: any[]): void;
    };
  }

  /**
   * Global this context variable
   */
  var this: ThisContext;
  
  /**
   * Short alias for this context
   */
  var s: ThisContext;
  
  /**
   * Context alias
   */
  var context: ThisContext;
  
  /**
   * Context alias
   */
  var ctx: ThisContext;
  
  /**
   * Self reference
   */
  var self: ThisContext;
}

export {};
`,
      targetFileSrc: 'context-types.d.ts'
    });

    // Global functions and variables
    this.addLib({
      content: `
declare global {
  /**
   * Global record service
   */
  var recordService: ThisContext['recordService'];
  
  /**
   * Global form object
   */
  var form: ThisContext['form'];
  
  /**
   * Global dialog object
   */
  var dialog: ThisContext['dialog'];
  
  /**
   * Global navigation object
   */
  var navigation: ThisContext['navigation'];
  
  /**
   * Global page object
   */
  var page: ThisContext['page'];
  
  /**
   * Global utils object
   */
  var utils: ThisContext['utils'];
  
  /**
   * Global HTTP object
   */
  var http: ThisContext['http'];
  
  /**
   * Global storage object
   */
  var storage: ThisContext['storage'];
  
  /**
   * Global events object
   */
  var events: ThisContext['events'];
  
  /**
   * Open a new window or tab
   * @param url - URL to open
   * @param target - Target window name
   * @param features - Window features
   * @returns Window object or null
   */
  function open(url: string, target?: string, features?: string): Window | null;
  
  /**
   * Navigate to a new location
   * @param url - URL to navigate to
   */
  function navigate(url: string): void;
  
  /**
   * Show confirmation dialog
   * @param message - Message to display
   * @returns User confirmation result
   */
  function confirm(message: string): boolean;
  
  /**
   * Show alert dialog
   * @param message - Message to display
   */
  function alert(message: string): void;
  
  /**
   * Show prompt dialog
   * @param message - Message to display
   * @param defaultValue - Default value
   * @returns User input or null
   */
  function prompt(message: string, defaultValue?: string): string | null;
  
  /**
   * Parse JSON string
   * @param text - JSON string to parse
   * @param reviver - Optional reviver function
   * @returns Parsed object
   */
  function JSONParse(text: string, reviver?: (key: string, value: any) => any): any;
  
  /**
   * Stringify object to JSON
   * @param value - Value to stringify
   * @param replacer - Optional replacer function
   * @param space - Optional space parameter
   * @returns JSON string
   */
  function JSONStringify(value: any, replacer?: (key: string, value: any) => any, space?: string | number): string;
}

export {};
`,
      targetFileSrc: 'global-functions.d.ts'
    });

    // Window object extensions
    this.addLib({
      content: `
declare global {
  interface Window {
    /**
     * Custom window property x
     */
    x: any;
    
    /**
     * Custom window function
     * @param param - Function parameter
     * @returns Function result
     */
    myFunction(param: any): any;
    
    /**
     * Custom window property
     */
    customProperty: string;
    
    /**
     * Custom window method
     * @param data - Method data
     */
    customMethod(data: any): void;
  }
}

export {};
`,
      targetFileSrc: 'window-extensions.d.ts'
    });
  }

  /**
   * Add a new library definition
   * @param lib - Library definition
   */
  addLib(lib: ExtraLibDefinition): void {
    this.extraLibList.push(lib);
  }

  /**
   * Load all libraries to Monaco
   */
  loadAllLibs(): void {
    this.extraLibList.forEach(lib => {
      if (!this.loadedLibs.has(lib.targetFileSrc)) {
        this.monaco.languages.typescript.javascriptDefaults.addExtraLib(
          lib.content,
          lib.targetFileSrc
        );
        this.monaco.languages.typescript.typescriptDefaults.addExtraLib(
          lib.content,
          lib.targetFileSrc
        );
        this.loadedLibs.add(lib.targetFileSrc);
        console.log(`Loaded extra lib: ${lib.targetFileSrc}`);
      }
    });
  }

  /**
   * Load specific library by target file
   * @param targetFileSrc - Target file source
   */
  loadLib(targetFileSrc: string): void {
    const lib = this.extraLibList.find(l => l.targetFileSrc === targetFileSrc);
    if (lib && !this.loadedLibs.has(targetFileSrc)) {
      this.monaco.languages.typescript.javascriptDefaults.addExtraLib(
        lib.content,
        lib.targetFileSrc
      );
      this.monaco.languages.typescript.typescriptDefaults.addExtraLib(
        lib.content,
        lib.targetFileSrc
      );
      this.loadedLibs.add(targetFileSrc);
      console.log(`Loaded extra lib: ${targetFileSrc}`);
    }
  }

  /**
   * Remove library by target file
   * @param targetFileSrc - Target file source
   */
  removeLib(targetFileSrc: string): void {
    const lib = this.extraLibList.find(l => l.targetFileSrc === targetFileSrc);
    if (lib && this.loadedLibs.has(targetFileSrc)) {
      this.monaco.languages.typescript.javascriptDefaults.removeExtraLib(targetFileSrc);
      this.monaco.languages.typescript.typescriptDefaults.removeExtraLib(targetFileSrc);
      this.loadedLibs.delete(targetFileSrc);
      console.log(`Removed extra lib: ${targetFileSrc}`);
    }
  }

  /**
   * Get list of loaded libraries
   * @returns Array of loaded library names
   */
  getLoadedLibs(): string[] {
    return Array.from(this.loadedLibs);
  }

  /**
   * Get list of all available libraries
   * @returns Array of all library definitions
   */
  getAllLibs(): ExtraLibDefinition[] {
    return [...this.extraLibList];
  }

  /**
   * Clear all loaded libraries
   */
  clearAllLibs(): void {
    this.loadedLibs.forEach(targetFileSrc => {
      this.monaco.languages.typescript.javascriptDefaults.removeExtraLib(targetFileSrc);
      this.monaco.languages.typescript.typescriptDefaults.removeExtraLib(targetFileSrc);
    });
    this.loadedLibs.clear();
    console.log('Cleared all extra libs');
  }

  /**
   * Update TypeScript compiler options
   * @param options - Compiler options
   */
  updateTypeScriptSettings(options: any): void {
    this.monaco.languages.typescript.typescriptDefaults.setCompilerOptions(options);
  }

  /**
   * Update JavaScript compiler options
   * @param options - Compiler options
   */
  updateJavaScriptSettings(options: any): void {
    this.monaco.languages.typescript.javascriptDefaults.setCompilerOptions(options);
  }
}

/**
 * Initialize Monaco IntelliSense
 * @param monaco - Monaco instance
 * @returns MonacoIntelliSenseProvider instance
 */
export function initializeMonacoIntelliSense(monaco: any): MonacoIntelliSenseProvider {
  const provider = new MonacoIntelliSenseProvider(monaco);
  
  // Update compiler settings for better IntelliSense
  provider.updateTypeScriptSettings({
    allowJs: true,
    checkJs: true,
    jsx: monaco.languages.typescript.JsxEmit.React,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    forceConsistentCasingInFileNames: true,
    noImplicitAny: false,
    noImplicitReturns: true,
    noUnusedLocals: false,
    noUnusedParameters: false,
    strict: false,
    strictNullChecks: false,
    suppressImplicitAnyIndexErrors: true,
    useDefineForClassFields: true,
    experimentalDecorators: true,
    emitDecoratorMetadata: true,
    allowNonTsExtensions: true,
    allowArbitraryExtensions: true,
    noEmit: true,
    skipLibCheck: true,
    resolveJsonModule: true
  });
  
  provider.updateJavaScriptSettings({
    allowJs: true,
    checkJs: true,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    forceConsistentCasingInFileNames: true,
    noImplicitAny: false,
    noImplicitReturns: true,
    noUnusedLocals: false,
    noUnusedParameters: false,
    strict: false,
    strictNullChecks: false,
    suppressImplicitAnyIndexErrors: true,
    useDefineForClassFields: true,
    experimentalDecorators: true,
    emitDecoratorMetadata: true,
    allowNonTsExtensions: true,
    allowArbitraryExtensions: true,
    noEmit: true,
    skipLibCheck: true,
    resolveJsonModule: true
  });
  
  // Load all libraries
  provider.loadAllLibs();
  
  // Register completion providers for JavaScript and TypeScript
  registerCompletionProviders(monaco);
  
  return provider;
}

/**
 * Register completion providers for Monaco
 * @param monaco - Monaco instance
 */
function registerCompletionProviders(monaco: any): void {
  // JavaScript completion provider
  monaco.languages.registerCompletionItemProvider('javascript', {
    triggerCharacters: ['.', ' '],
    provideCompletionItems: (model: any, position: any) => {
      const suggestions = [
        // this. context suggestions
        {
          label: 'this',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: 'this',
          detail: 'Context object',
          documentation: 'Ana context nesnesi',
          sortText: '01'
        },
        {
          label: 's',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: 's',
          detail: 'Context object (short)',
          documentation: 'Kısa context nesnesi',
          sortText: '02'
        },
        {
          label: 'context',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: 'context',
          detail: 'Context object',
          documentation: 'Context nesnesi',
          sortText: '03'
        },
        {
          label: 'ctx',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: 'ctx',
          detail: 'Context object (short)',
          documentation: 'Kısa context nesnesi',
          sortText: '04'
        },
        {
          label: 'self',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: 'self',
          detail: 'Self reference',
          documentation: 'Kendine referans',
          sortText: '05'
        },
        // Global variables
        {
          label: 'recordService',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: 'recordService',
          detail: 'Record Service',
          documentation: 'Kayıt işlemleri için servis',
          sortText: '06'
        },
        {
          label: 'form',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: 'form',
          detail: 'Form API',
          documentation: 'Form işlemleri için API',
          sortText: '07'
        },
        {
          label: 'dialog',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: 'dialog',
          detail: 'Dialog API',
          documentation: 'Dialog işlemleri için API',
          sortText: '08'
        },
        {
          label: 'navigation',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: 'navigation',
          detail: 'Navigation API',
          documentation: 'Sayfa geçiş işlemleri için API',
          sortText: '09'
        },
        {
          label: 'page',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: 'page',
          detail: 'Page API',
          documentation: 'Sayfa işlemleri için API',
          sortText: '10'
        },
        {
          label: 'utils',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: 'utils',
          detail: 'Utils API',
          documentation: 'Yardımcı fonksiyonlar',
          sortText: '11'
        },
        {
          label: 'http',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: 'http',
          detail: 'HTTP API',
          documentation: 'HTTP istekleri için API',
          sortText: '12'
        },
        {
          label: 'storage',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: 'storage',
          detail: 'Storage API',
          documentation: 'Depolama işlemleri için API',
          sortText: '13'
        },
        {
          label: 'events',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: 'events',
          detail: 'Events API',
          documentation: 'Olay yönetimi için API',
          sortText: '14'
        },
        // Global functions
        {
          label: 'open',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: 'open(${1:url})',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'Open window/tab',
          documentation: 'Yeni pencere veya sekme açar',
          sortText: '15'
        },
        {
          label: 'navigate',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: 'navigate(${1:url})',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'Navigate to URL',
          documentation: 'Belirtilen URL\'ye gider',
          sortText: '16'
        },
        {
          label: 'confirm',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: 'confirm(${1:message})',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'Show confirmation dialog',
          documentation: 'Onay dialogu gösterir',
          sortText: '17'
        },
        {
          label: 'alert',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: 'alert(${1:message})',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'Show alert dialog',
          documentation: 'Uyarı dialogu gösterir',
          sortText: '18'
        },
        {
          label: 'prompt',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: 'prompt(${1:message}, ${2:defaultValue})',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'Show prompt dialog',
          documentation: 'Girdi dialogu gösterir',
          sortText: '19'
        }
      ];
      
      return { suggestions };
    }
  });

  // TypeScript completion provider (same as JavaScript)
  monaco.languages.registerCompletionItemProvider('typescript', {
    triggerCharacters: ['.', ' '],
    provideCompletionItems: (model: any, position: any) => {
      const suggestions = [
        // this. context suggestions
        {
          label: 'this',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: 'this',
          detail: 'Context object',
          documentation: 'Ana context nesnesi',
          sortText: '01'
        },
        {
          label: 's',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: 's',
          detail: 'Context object (short)',
          documentation: 'Kısa context nesnesi',
          sortText: '02'
        },
        {
          label: 'context',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: 'context',
          detail: 'Context object',
          documentation: 'Context nesnesi',
          sortText: '03'
        },
        {
          label: 'ctx',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: 'ctx',
          detail: 'Context object (short)',
          documentation: 'Kısa context nesnesi',
          sortText: '04'
        },
        {
          label: 'self',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: 'self',
          detail: 'Self reference',
          documentation: 'Kendine referans',
          sortText: '05'
        },
        // Global variables
        {
          label: 'recordService',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: 'recordService',
          detail: 'Record Service',
          documentation: 'Kayıt işlemleri için servis',
          sortText: '06'
        },
        {
          label: 'form',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: 'form',
          detail: 'Form API',
          documentation: 'Form işlemleri için API',
          sortText: '07'
        },
        {
          label: 'dialog',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: 'dialog',
          detail: 'Dialog API',
          documentation: 'Dialog işlemleri için API',
          sortText: '08'
        },
        {
          label: 'navigation',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: 'navigation',
          detail: 'Navigation API',
          documentation: 'Sayfa geçiş işlemleri için API',
          sortText: '09'
        },
        {
          label: 'page',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: 'page',
          detail: 'Page API',
          documentation: 'Sayfa işlemleri için API',
          sortText: '10'
        },
        {
          label: 'utils',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: 'utils',
          detail: 'Utils API',
          documentation: 'Yardımcı fonksiyonlar',
          sortText: '11'
        },
        {
          label: 'http',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: 'http',
          detail: 'HTTP API',
          documentation: 'HTTP istekleri için API',
          sortText: '12'
        },
        {
          label: 'storage',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: 'storage',
          detail: 'Storage API',
          documentation: 'Depolama işlemleri için API',
          sortText: '13'
        },
        {
          label: 'events',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: 'events',
          detail: 'Events API',
          documentation: 'Olay yönetimi için API',
          sortText: '14'
        },
        // Global functions
        {
          label: 'open',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: 'open(${1:url})',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'Open window/tab',
          documentation: 'Yeni pencere veya sekme açar',
          sortText: '15'
        },
        {
          label: 'navigate',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: 'navigate(${1:url})',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'Navigate to URL',
          documentation: 'Belirtilen URL\'ye gider',
          sortText: '16'
        },
        {
          label: 'confirm',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: 'confirm(${1:message})',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'Show confirmation dialog',
          documentation: 'Onay dialogu gösterir',
          sortText: '17'
        },
        {
          label: 'alert',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: 'alert(${1:message})',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'Show alert dialog',
          documentation: 'Uyarı dialogu gösterir',
          sortText: '18'
        },
        {
          label: 'prompt',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: 'prompt(${1:message}, ${2:defaultValue})',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'Show prompt dialog',
          documentation: 'Girdi dialogu gösterir',
          sortText: '19'
        }
      ];
      
      return { suggestions };
    }
  });

  // Register method completion providers
  registerMethodCompletions(monaco);
}

/**
 * Register method completion providers
 * @param monaco - Monaco instance
 */
function registerMethodCompletions(monaco: any): void {
  // this. methods
  monaco.languages.registerCompletionItemProvider(['javascript', 'typescript'], {
    triggerCharacters: ['.'],
    provideCompletionItems: (model: any, position: any) => {
      const lineContent = model.getLineContent(position.lineNumber);
      const textUntilPosition = lineContent.substring(0, position.column - 1);
      
      // Check if we're after "this."
      if (textUntilPosition.endsWith('this.')) {
        return {
          suggestions: [
            {
              label: 'get',
              kind: monaco.languages.CompletionItemKind.Method,
              insertText: 'get(${1:key})',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              detail: 'Get value from context',
              documentation: 'Context\'ten değer alır'
            },
            {
              label: 'set',
              kind: monaco.languages.CompletionItemKind.Method,
              insertText: 'set(${1:key}, ${2:value})',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              detail: 'Set value in context',
              documentation: 'Context\'e değer atar'
            },
            {
              label: 'record',
              kind: monaco.languages.CompletionItemKind.Property,
              insertText: 'record',
              detail: 'Record object',
              documentation: 'Kayıt nesnesi'
            },
            {
              label: 'form',
              kind: monaco.languages.CompletionItemKind.Property,
              insertText: 'form',
              detail: 'Form object',
              documentation: 'Form nesnesi'
            },
            {
              label: 'dialog',
              kind: monaco.languages.CompletionItemKind.Property,
              insertText: 'dialog',
              detail: 'Dialog object',
              documentation: 'Dialog nesnesi'
            },
            {
              label: 'navigation',
              kind: monaco.languages.CompletionItemKind.Property,
              insertText: 'navigation',
              detail: 'Navigation object',
              documentation: 'Navigation nesnesi'
            },
            {
              label: 'recordService',
              kind: monaco.languages.CompletionItemKind.Property,
              insertText: 'recordService',
              detail: 'Record service',
              documentation: 'Kayıt servisi'
            },
            {
              label: 'page',
              kind: monaco.languages.CompletionItemKind.Property,
              insertText: 'page',
              detail: 'Page object',
              documentation: 'Sayfa nesnesi'
            },
            {
              label: 'utils',
              kind: monaco.languages.CompletionItemKind.Property,
              insertText: 'utils',
              detail: 'Utils object',
              documentation: 'Yardımcı nesne'
            },
            {
              label: 'http',
              kind: monaco.languages.CompletionItemKind.Property,
              insertText: 'http',
              detail: 'HTTP object',
              documentation: 'HTTP nesnesi'
            },
            {
              label: 'storage',
              kind: monaco.languages.CompletionItemKind.Property,
              insertText: 'storage',
              detail: 'Storage object',
              documentation: 'Depolama nesnesi'
            },
            {
              label: 'events',
              kind: monaco.languages.CompletionItemKind.Property,
              insertText: 'events',
              detail: 'Events object',
              documentation: 'Olay nesnesi'
            }
          ]
        };
      }
      
      // Check if we're after "this.record."
      if (textUntilPosition.endsWith('this.record.')) {
        return {
          suggestions: [
            {
              label: 'id',
              kind: monaco.languages.CompletionItemKind.Property,
              insertText: 'id',
              detail: 'Record ID',
              documentation: 'Kayıt ID\'si'
            },
            {
              label: 'status',
              kind: monaco.languages.CompletionItemKind.Property,
              insertText: 'status',
              detail: 'Record status',
              documentation: 'Kayıt durumu'
            },
            {
              label: 'name',
              kind: monaco.languages.CompletionItemKind.Property,
              insertText: 'name',
              detail: 'Record name',
              documentation: 'Kayıt adı'
            },
            {
              label: 'email',
              kind: monaco.languages.CompletionItemKind.Property,
              insertText: 'email',
              detail: 'Record email',
              documentation: 'Kayıt e-postası'
            },
            {
              label: 'createdAt',
              kind: monaco.languages.CompletionItemKind.Property,
              insertText: 'createdAt',
              detail: 'Creation date',
              documentation: 'Oluşturulma tarihi'
            },
            {
              label: 'updatedAt',
              kind: monaco.languages.CompletionItemKind.Property,
              insertText: 'updatedAt',
              detail: 'Update date',
              documentation: 'Güncellenme tarihi'
            }
          ]
        };
      }
      
      // Check if we're after "form."
      if (textUntilPosition.endsWith('form.')) {
        return {
          suggestions: [
            {
              label: 'getValue',
              kind: monaco.languages.CompletionItemKind.Method,
              insertText: 'getValue(${1:field})',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              detail: 'Get form field value',
              documentation: 'Form alanının değerini alır'
            },
            {
              label: 'setValue',
              kind: monaco.languages.CompletionItemKind.Method,
              insertText: 'setValue(${1:field}, ${2:value})',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              detail: 'Set form field value',
              documentation: 'Form alanının değerini ayarlar'
            },
            {
              label: 'validate',
              kind: monaco.languages.CompletionItemKind.Method,
              insertText: 'validate()',
              detail: 'Validate form',
              documentation: 'Formu doğrular'
            },
            {
              label: 'submit',
              kind: monaco.languages.CompletionItemKind.Method,
              insertText: 'submit()',
              detail: 'Submit form',
              documentation: 'Formu gönderir'
            }
          ]
        };
      }
      
      // Check if we're after "dialog."
      if (textUntilPosition.endsWith('dialog.')) {
        return {
          suggestions: [
            {
              label: 'alert',
              kind: monaco.languages.CompletionItemKind.Method,
              insertText: 'alert(${1:message})',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              detail: 'Show alert dialog',
              documentation: 'Uyarı dialogu gösterir'
            },
            {
              label: 'confirm',
              kind: monaco.languages.CompletionItemKind.Method,
              insertText: 'confirm(${1:message})',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              detail: 'Show confirmation dialog',
              documentation: 'Onay dialogu gösterir'
            },
            {
              label: 'prompt',
              kind: monaco.languages.CompletionItemKind.Method,
              insertText: 'prompt(${1:message}, ${2:defaultValue})',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              detail: 'Show prompt dialog',
              documentation: 'Girdi dialogu gösterir'
            }
          ]
        };
      }
      
      // Check if we're after "navigation."
      if (textUntilPosition.endsWith('navigation.')) {
        return {
          suggestions: [
            {
              label: 'go',
              kind: monaco.languages.CompletionItemKind.Method,
              insertText: 'go(${1:path})',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              detail: 'Navigate to path',
              documentation: 'Belirtilen yola gider'
            },
            {
              label: 'back',
              kind: monaco.languages.CompletionItemKind.Method,
              insertText: 'back()',
              detail: 'Go back',
              documentation: 'Önceki sayfaya döner'
            },
            {
              label: 'navigate',
              kind: monaco.languages.CompletionItemKind.Method,
              insertText: 'navigate(${1:page})',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              detail: 'Navigate to page',
              documentation: 'Belirtilen sayfaya gider'
            }
          ]
        };
      }
      
      // Check if we're after "recordService."
      if (textUntilPosition.endsWith('recordService.')) {
        return {
          suggestions: [
            {
              label: 'getCurrentRecord',
              kind: monaco.languages.CompletionItemKind.Method,
              insertText: 'getCurrentRecord()',
              detail: 'Get current record',
              documentation: 'Mevcut kaydı alır'
            },
            {
              label: 'saveRecord',
              kind: monaco.languages.CompletionItemKind.Method,
              insertText: 'saveRecord(${1:record})',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              detail: 'Save record',
              documentation: 'Kaydı kaydeder'
            },
            {
              label: 'deleteRecord',
              kind: monaco.languages.CompletionItemKind.Method,
              insertText: 'deleteRecord(${1:id})',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              detail: 'Delete record',
              documentation: 'Kaydı siler'
            },
            {
              label: 'findRecords',
              kind: monaco.languages.CompletionItemKind.Method,
              insertText: 'findRecords(${1:criteria})',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              detail: 'Find records',
              documentation: 'Kayıtları arar'
            }
          ]
        };
      }
      
      return { suggestions: [] };
    }
  });
} 
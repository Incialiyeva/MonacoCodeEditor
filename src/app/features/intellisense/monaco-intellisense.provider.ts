// --- MonacoContextRegistry.ts ---

export interface MonacoContextRegistryOptions {
  monaco: any;
  /** Optional folder to load static .d.ts files from */
  staticDefinitionsPath?: string;
}

export interface GlobalBinding<T = any> {
  /** Global name (e.g. 'recordService') */
  name: string;
  /** Runtime value for internal use */
  value: T;
  /** Explicit .d.ts content for strong typing */
  definition: string;
}

export interface ThisContext {
  [key: string]: any;
}

export class MonacoContextRegistry {
  private monaco: any;
  private registered: Set<string> = new Set();
  private bindings: GlobalBinding[] = [];
  private thisContext: ThisContext = {};

  constructor(options: MonacoContextRegistryOptions) {
    this.monaco = options.monaco;
    // Load static definitions if provided
    if (options.staticDefinitionsPath) {
      this.loadStaticDefinitions(options.staticDefinitionsPath);
    }
  }

  /**
   * Load all .d.ts files in a folder for static typings
   */
  private loadStaticDefinitions(folder: string): void {
    try {
      // Note: fs is not available in browser, so we'll skip this for now
      console.log(`[MonacoContextRegistry] Static definitions path provided: ${folder}`);
    } catch (err) {
      console.error(`[MonacoContextRegistry] Failed to load static definitions:`, err);
    }
  }

  /**
   * Set the this context object (what shows up when typing 'this.')
   */
  setThisContext(context: ThisContext): void {
    this.thisContext = context;
    this.updateThisContextDefinition();
  }

  /**
   * Update the this context definition in Monaco
   */
  private updateThisContextDefinition(): void {
    const definition = this.generateThisContextDefinition();
    this.registerBinding({ 
      name: '__THIS__', 
      value: this.thisContext, 
      definition 
    });
  }

  /**
   * Generate .d.ts for this context
   */
  private generateThisContextDefinition(): string {
    const lines: string[] = [];
    for (const key of Object.keys(this.thisContext)) {
      const val = this.thisContext[key];
      if (typeof val === 'function') {
        const argCount = Math.max(val.length, 0);
        const args = Array.from({ length: argCount }, (_, i) => `arg${i}: any`).join(', ');
        lines.push(`  ${key}(${args}): any;`);
      } else {
        lines.push(`  ${key}: any;`);
      }
    }

    return `
declare global {
  interface ThisContext {
${lines.join('\n')}
  }
  declare const __THIS__: ThisContext;
}
export {};`;
  }

  /**
   * Register a binding with explicit definition
   */
  registerBinding<T>(binding: GlobalBinding<T>): void {
    const { name, definition } = binding;
    if (this.registered.has(name)) return;
    this.monaco.languages.typescript.javascriptDefaults.addExtraLib(definition, `${name}.d.ts`);
    this.monaco.languages.typescript.typescriptDefaults.addExtraLib(definition, `${name}.d.ts`);
    this.registered.add(name);
    this.bindings.push(binding);
    console.log(`[MonacoContextRegistry] Registered: ${name}`);
  }

  /**
   * Shorthand: supply runtime object and fallback definition generator
   */
  register(name: string, obj: object, definition?: string): void {
    if (definition) {
      this.registerBinding({ name, value: obj, definition });
    } else {
      const autoDef = this.generateTypeDefinition(name, obj);
      this.registerBinding({ name, value: obj, definition: autoDef });
    }
  }

  /**
   * Generate a .d.ts for object shape. For deep shapes, use static .d.ts files.
   */
  private generateTypeDefinition(name: string, obj: object): string {
    const fields = Object.keys(obj)
      .map(key => `  ${key}: any; // inferred placeholder`)
      .join("\n");

    return `
declare global {
  var ${name}: {
${fields}
  };
}
export {};`;
  }

  /**
   * List of all registered global names
   */
  getRegisteredBindings(): string[] {
    return [...this.registered];
  }

  /**
   * Get this context object
   */
  getThisContext(): ThisContext {
    return this.thisContext;
  }

  /**
   * Remove a previously registered lib
   */
  deregister(name: string): void {
    if (!this.registered.has(name)) return;
    const fileName = `${name}.d.ts`;
    this.monaco.languages.typescript.javascriptDefaults.removeExtraLib(fileName);
    this.monaco.languages.typescript.typescriptDefaults.removeExtraLib(fileName);
    this.registered.delete(name);
    this.bindings = this.bindings.filter(b => b.name !== name);
    console.log(`[MonacoContextRegistry] Deregistered: ${name}`);
  }
}

// --- MonacoIntelliSenseProvider.ts ---

export class MonacoIntelliSenseProvider {
  private monaco: any;
  private registry: MonacoContextRegistry;
  private loadedLibs: Map<string, GlobalBinding> = new Map();
  private completionDisposable: any;

  constructor(monaco: any, staticDefsPath?: string) {
    this.monaco = monaco;
    this.registry = new MonacoContextRegistry({ monaco, staticDefinitionsPath: staticDefsPath });
  }

  private configureCompiler(): void {
    const tsDefaults = this.monaco.languages.typescript.typescriptDefaults;
    const jsDefaults = this.monaco.languages.typescript.javascriptDefaults;
    
    // Critical: Disable default libraries to show only our custom APIs
    const commonOpts = {
      allowNonTsExtensions: true,
      noEmit: true,
      skipLibCheck: true,
      noLib: true, // <-- Critical: Only our ExtraLibs will be used
      target: this.monaco.languages.typescript.ScriptTarget.Latest,
      moduleResolution: this.monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      allowJs: true,
      checkJs: false,
    };
    
    tsDefaults.setCompilerOptions(commonOpts as any);
    jsDefaults.setCompilerOptions(commonOpts as any);
    jsDefaults.setEagerModelSync(true);
  }

  private setupCustomCompletionProvider(): void {
    // Register custom completion provider for 'this.' context
    this.completionDisposable = this.monaco.languages.registerCompletionItemProvider('javascript', {
      triggerCharacters: ['.'],
      provideCompletionItems: (model: any, position: any) => {
        const text = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        });

        // Only provide suggestions for 'this.'
        if (!text.endsWith('this.')) {
          return { suggestions: [] };
        }

        // Return this context members
        const thisContext = this.registry.getThisContext();
        const items = this.buildThisContextCompletions(thisContext);
        return { suggestions: items };
      }
    });
  }

  private buildThisContextCompletions(ctx: Record<string, any>) {
    return Object.keys(ctx).map(k => {
      const isFn = typeof ctx[k] === 'function';
      return {
        label: k,
        kind: isFn ? this.monaco.languages.CompletionItemKind.Function
                   : this.monaco.languages.CompletionItemKind.Property,
        insertText: k,
        sortText: '000' + k, // Our items appear first
        range: undefined as any
      };
    });
  }

  initialize(): void {
    this.configureCompiler();
    this.setupCustomCompletionProvider();

    // Example services - these will be the only APIs available
    const recordService = {
      getById: (id: number) => ({ id, name: 'Example' }),
      save: (dto: any) => true,
      delete: (id: number) => true,
      getAll: () => []
    };

    const formApi = {
      open: (code: string) => {},
      close: () => {},
      getValue: (field: string) => '',
      setValue: (field: string, value: any) => {}
    };

    const dialogApi = {
      alert: (message: string) => {},
      confirm: (message: string) => true,
      prompt: (message: string) => ''
    };

    // Register global APIs
    this.registry.register('recordService', recordService,
      `declare global {
        var recordService: {
          getById(id: number): any;
          save(dto: any): boolean;
          delete(id: number): boolean;
          getAll(): any[];
        };
      } export {};`
    );

    this.registry.register('form', formApi,
      `declare global {
        var form: {
          open(code: string): void;
          close(): void;
          getValue(field: string): any;
          setValue(field: string, value: any): void;
        };
      } export {};`
    );

    this.registry.register('dialog', dialogApi,
      `declare global {
        var dialog: {
          alert(message: string): void;
          confirm(message: string): boolean;
          prompt(message: string): string;
        };
      } export {};`
    );

    // Set this context - what appears when typing 'this.'
    const thisContext = {
      userName: 'User',
      hasPermission: (perm: string) => true,
      recordService: recordService,
      form: formApi,
      dialog: dialogApi,
      currentRecord: null,
      isEditing: false
    };

    this.registry.setThisContext(thisContext);

    console.log('[MonacoIntelliSenseProvider] Initialized with controlled API suggestions only');
  }

  /**
   * Configure editor to disable default suggestions
   */
  configureEditor(editor: any): void {
    editor.updateOptions({
      // Disable default suggestion behaviors
      quickSuggestions: false,
      wordBasedSuggestions: 'off',
      snippetSuggestions: 'none',
      suggestOnTriggerCharacters: true, // Only our custom provider will trigger
      suggest: {
        showWords: false,   // No word-based suggestions
        showSnippets: false // No snippet suggestions
      }
    });
  }

  /**
   * Add a new lib at runtime
   */
  addLib(binding: GlobalBinding): void {
    this.registry.registerBinding(binding);
    this.loadedLibs.set(binding.name, binding);
  }

  // Backward compatibility method
  addLibOld(lib: { content: string; targetFileSrc: string }): void {
    const binding: GlobalBinding = {
      name: lib.targetFileSrc.replace('.d.ts', ''),
      value: {},
      definition: lib.content
    };
    this.registry.registerBinding(binding);
    this.loadedLibs.set(binding.name, binding);
  }

  loadLib(targetFileSrc: string): void {
    const lib = this.loadedLibs.get(targetFileSrc.replace('.d.ts', ''));
    if (lib) {
      try {
        this.monaco.languages.typescript.javascriptDefaults.addExtraLib(lib.definition, targetFileSrc);
        this.monaco.languages.typescript.typescriptDefaults.addExtraLib(lib.definition, targetFileSrc);
        console.log(`[MonacoIntelliSenseProvider] Loaded lib: ${targetFileSrc}`);
      } catch (error) {
        console.error(`[MonacoIntelliSenseProvider] Error loading lib: ${targetFileSrc}`, error);
      }
    }
  }

  /**
   * Remove a loaded lib
   */
  removeLib(name: string): void {
    this.registry.deregister(name);
    this.loadedLibs.delete(name);
  }

  getLoadedLibs(): string[] {
    return [...this.loadedLibs.keys()];
  }

  getAllLibs(): any[] {
    return Array.from(this.loadedLibs.values());
  }

  clearAllLibs(): void {
    this.loadedLibs.forEach((_, name) => this.registry.deregister(name));
    this.loadedLibs.clear();
    console.log('[MonacoIntelliSenseProvider] Cleared all libs');
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.completionDisposable) {
      this.completionDisposable.dispose();
    }
  }
}

// --- initializeMonacoIntelliSense.ts ---

/**
 * Initialize with optional path to static .d.ts definitions
 */
export function initializeMonacoIntelliSense(monaco: any, staticDefsPath?: string): MonacoIntelliSenseProvider {
  const provider = new MonacoIntelliSenseProvider(monaco, staticDefsPath);
  provider.initialize();
  return provider;
}
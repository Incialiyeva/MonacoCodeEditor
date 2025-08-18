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

export class MonacoContextRegistry {
  private monaco: any;
  private registered: Set<string> = new Set();
  private bindings: GlobalBinding[] = [];

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

    if (name === 'this') {
      return `
declare global {
  var this: any; // preserved global context
}
export {};`;
    }

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
  private staticDefsPath?: string;

  constructor(monaco: any, staticDefsPath?: string) {
    this.monaco = monaco;
    this.registry = new MonacoContextRegistry({ monaco, staticDefinitionsPath: staticDefsPath });
    this.staticDefsPath = staticDefsPath;
  }

  private configureCompiler(): void {
    const tsDefaults = this.monaco.languages.typescript.typescriptDefaults;
    const jsDefaults = this.monaco.languages.typescript.javascriptDefaults;
    const commonOpts = {
      allowNonTsExtensions: true,
      noEmit: true,
      skipLibCheck: true,
      target: this.monaco.languages.typescript.ScriptTarget.Latest,
      moduleResolution: this.monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      allowJs: true,
      checkJs: false,
    };
    tsDefaults.setCompilerOptions(commonOpts as any);
    jsDefaults.setCompilerOptions(commonOpts as any);
    jsDefaults.setEagerModelSync(true);
  }

  initialize(): void {
    // Sadece SQL ve HTML için provider kaydet (JavaScript için ThisContextRegistry kullanılacak)
    this.monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: (model: any, position: any) => {
        const suggestions = [
          {
            label: 'SELECT',
            kind: this.monaco.languages.CompletionItemKind.Keyword,
            insertText: 'SELECT',
            documentation: 'SQL SELECT statement'
          },
          {
            label: 'FROM',
            kind: this.monaco.languages.CompletionItemKind.Keyword,
            insertText: 'FROM',
            documentation: 'SQL FROM clause'
          },
          {
            label: 'WHERE',
            kind: this.monaco.languages.CompletionItemKind.Keyword,
            insertText: 'WHERE',
            documentation: 'SQL WHERE clause'
          },
          {
            label: 'INSERT',
            kind: this.monaco.languages.CompletionItemKind.Keyword,
            insertText: 'INSERT',
            documentation: 'SQL INSERT statement'
          },
          {
            label: 'UPDATE',
            kind: this.monaco.languages.CompletionItemKind.Keyword,
            insertText: 'UPDATE',
            documentation: 'SQL UPDATE statement'
          },
          {
            label: 'DELETE',
            kind: this.monaco.languages.CompletionItemKind.Keyword,
            insertText: 'DELETE',
            documentation: 'SQL DELETE statement'
          }
        ];
        return { suggestions };
      }
    });

    this.monaco.languages.registerCompletionItemProvider('html', {
      provideCompletionItems: (model: any, position: any) => {
        const suggestions = [
          {
            label: 'div',
            kind: this.monaco.languages.CompletionItemKind.Class,
            insertText: '<div>',
            insertTextRules: this.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'HTML div element'
          },
          {
            label: 'span',
            kind: this.monaco.languages.CompletionItemKind.Class,
            insertText: '<span>',
            insertTextRules: this.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'HTML span element'
          },
          {
            label: 'button',
            kind: this.monaco.languages.CompletionItemKind.Class,
            insertText: '<button>',
            insertTextRules: this.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'HTML button element'
          }
        ];
        return { suggestions };
      }
    });

    // JavaScript için provider kaydetmiyoruz - ThisContextRegistry kullanılacak
    console.log('[MonacoIntelliSenseProvider] Initialized for SQL and HTML only (JavaScript uses ThisContextRegistry)');

    // Global bindings kaydet (JavaScript dışında)
    this.registry.register('sql',
      {
        query: (sql: string) => [],
        execute: (sql: string) => true,
        transaction: (callback: Function) => {}
      },
      `declare global {
        var sql: {
          query(sql: string): any[];
          execute(sql: string): boolean;
          transaction(callback: () => void): void;
        };
      } export {};`
    );

    // Preserve special 'this' global (JavaScript için ThisContextRegistry kullanılacak)
    // this.registry.registerBinding({ name: 'this', value: (globalThis as any), definition: `declare global { var this: any; } export {};` });

    console.log('[MonacoIntelliSenseProvider] Initialized with static and dynamic global bindings (excluding JavaScript)');
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
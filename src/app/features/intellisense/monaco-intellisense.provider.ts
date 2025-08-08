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

  constructor(monaco: any, staticDefsPath?: string) {
    this.monaco = monaco;
    this.registry = new MonacoContextRegistry({ monaco, staticDefinitionsPath: staticDefsPath });
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
    this.configureCompiler();

    // HTML için global tanımlar ekle
    this.registry.register('document',
      { 
        getElementById: (id: string) => null,
        querySelector: (selector: string) => null,
        querySelectorAll: (selector: string) => [],
        createElement: (tagName: string) => null,
        addEventListener: (event: string, callback: Function) => {}
      },
      `declare global { 
        var document: {
          getElementById(id: string): HTMLElement | null;
          querySelector(selector: string): Element | null;
          querySelectorAll(selector: string): NodeList;
          createElement(tagName: string): HTMLElement;
          addEventListener(event: string, callback: EventListener): void;
          body: HTMLBodyElement;
          head: HTMLHeadElement;
          title: string;
        }; 
      } export {};`
    );

    // HTML DOM elements için tip tanımları
    this.registry.register('HTMLElement',
      {},
      `declare global {
        interface HTMLElement {
          innerHTML: string;
          textContent: string;
          className: string;
          id: string;
          style: CSSStyleDeclaration;
          addEventListener(type: string, listener: EventListener): void;
          removeEventListener(type: string, listener: EventListener): void;
          click(): void;
          focus(): void;
          blur(): void;
        }
        interface HTMLInputElement extends HTMLElement {
          value: string;
          checked: boolean;
          disabled: boolean;
          placeholder: string;
          type: string;
        }
        interface HTMLButtonElement extends HTMLElement {
          disabled: boolean;
          type: string;
        }
      } export {};`
    );

    // SQL için global tanımlar
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

    // --- MonacoIntelliSenseProvider.ts içinde, initialize() metodunun sonuna ekleyin ---
this.registry.register(
  'newObject',
  {
    foo: (x: number) => x * 2,
    bar: (s: string) => s.toUpperCase(),
  },
  `declare global {
     var newObject: {
       foo(x: number): number;
       bar(s: string): string;
     };
   }
   export {};`
);

    

    // Example of registering core globals with static definitions
    this.registry.register('recordService',
      { id: 1, name: 'RecordService', getRecords: () => [] },
      // Hint: content can be moved to a file under staticDefsPath
      `declare global { var recordService: { id: number; name: string; getRecords(): any[]; }; } export {};`
    );

    this.registry.register('form',
      { getValue: (f: string) => '', setValue: (f: string, v: any) => {} },
      `declare global { var form: { getValue(field: string): any; setValue(field: string, value: any): void; }; } export {};`
    );

    this.registry.register('dialog',
      { alert: (m: string) => {}, confirm: (m: string) => true },
      `declare global { var dialog: { alert(msg: string): void; confirm(msg: string): boolean; }; } export {};`
    );

    this.registry.register('myService',
      { fetchData: async (u: string) => [], clearCache: () => {} },
      `declare global { var myService: { fetchData(url: string): Promise<any>; clearCache(): void; }; } export {};`
    );
   // --- inside initialize() ---
this.registry.register(
  'yeniService',
  {
    fetchData: async (url: string) => { /* … */ return []; },
    clearCache: () => { /* … */ }
  },
  // Tip tanımını buraya yazıyoruz
  `declare global {
     var yeniService: {
       fetchData(url: string): Promise<any[]>;
       clearCache(): void;
     };
   }
   export {};`
);


    // Preserve special 'this' global
    this.registry.registerBinding({ name: 'this', value: (globalThis as any), definition: `declare global { var this: any; } export {};` });

    console.log('[MonacoIntelliSenseProvider] Initialized with static and dynamic global bindings');
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
// --- MonacoContextRegistry.ts ---

export interface ThisContext {
  recordService: {
    id: number;
    name: string;
    getRecords: () => any[];
  };
  form: {
    getValue: (field: string) => any;
    setValue: (field: string, value: any) => void;
  };
  dialog: {
    alert: (msg: string) => void;
    confirm: (msg: string) => boolean;
  };

  myService: {
    fetchData: (url: string) => Promise<any>;
    clearCache: () => void;
  };
}

export interface MonacoContextRegistryOptions {
  monaco: any;
}

export class MonacoContextRegistry {
  private monaco: any;
  private registered: Set<string> = new Set();

  constructor(options: MonacoContextRegistryOptions) {
    this.monaco = options.monaco;
  }

  /**
   * Register a global variable with Monaco IntelliSense
   */
  register(name: string, obj: object): void {
    if (this.registered.has(name)) return;
    const typeDef = this.generateTypeDefinition(name, obj);
    this.monaco.languages.typescript.javascriptDefaults.addExtraLib(typeDef, `${name}.d.ts`);
    this.monaco.languages.typescript.typescriptDefaults.addExtraLib(typeDef, `${name}.d.ts`);
    this.registered.add(name);
    console.log(`[MonacoContextRegistry] Registered: ${name}`);
  }

  /**
   * Dynamically generate a global variable declaration for the given object
   */
  private generateTypeDefinition(name: string, obj: object): string {
    const fields = Object.entries(obj).map(([key, value]) => {
      const type = this.inferType(value);
      return `  ${key}: ${type};`;
    });

    if (name === 'this') {
      return `
declare global {
  var this: {
    recordService: {
      id: number;
      name: string;
      getRecords: () => any[];
    };
    form: {
      getValue: (field: string) => any;
      setValue: (field: string, value: any) => void;
    };
    dialog: {
      alert: (msg: string) => void;
      confirm: (msg: string) => boolean;
    };
  };
}
export {};`;
    }

    return `
declare global {
  var ${name}: {
${fields.join('\n')}
  };
}
export {};`;
  }

  /**
   * Very basic JS to TS type inference
   */
  private inferType(value: any): string {
    const rawType = typeof value;
    if (rawType === 'function') {
      return value.length > 0 ? '(...args: any[]) => any' : '() => any';
    }
    if (rawType === 'number') return 'number';
    if (rawType === 'boolean') return 'boolean';
    if (rawType === 'string') return 'string';
    if (rawType === 'object') {
      if (Array.isArray(value)) return 'any[]';
      if (value === null) return 'any';
      // Nested object için daha detaylı analiz
      if (value && typeof value === 'object') {
        const fields = Object.entries(value).map(([key, val]) => {
          const type = this.inferType(val);
          return `${key}: ${type}`;
        });
        return `{ ${fields.join('; ')} }`;
      }
      return '{ [key: string]: any }';
    }
    return 'any';
  }

  /**
   * Register multiple globals at once
   */
  registerMany(entries: Record<string, object>): void {
    Object.entries(entries).forEach(([name, obj]) => this.register(name, obj));
  }
}

// --- MonacoIntelliSenseProvider.ts ---

export class MonacoIntelliSenseProvider {
  private monaco: any;
  private registry: MonacoContextRegistry;
  private loadedLibs: Map<string, any> = new Map();
  private allLibs: any[] = [];

  constructor(monaco: any) {
    this.monaco = monaco;
    this.registry = new MonacoContextRegistry({ monaco });
  }

  /**
   * Configure TS/JS defaults for better IntelliSense
   */
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

  /**
   * Initialize IntelliSense with default globals and compiler settings
   */
  initialize(): void {
    this.configureCompiler();

    // Core global bindings
    this.registry.register('myService', {
      fetchData: async (url: string) => { /*…*/ },
      clearCache: () => { /*…*/ },
    });

    this.registry.register('recordService', {
      id: 1,
      name: 'RecordService',
      getRecords: () => [] as any[],
    });

    // Form service
    this.registry.register('form', {
      getValue: (field: string) => '',
      setValue: (field: string, value: any) => {},
    });

    // Dialog service
    this.registry.register('dialog', {
      alert: (msg: string) => {},
      confirm: (msg: string) => true,
    });

    this.registry.register('this', {
      recordService: { id: 1, name: 'RecordService', getRecords: () => [] as any[] },
      form: { getValue: (field: string) => '', setValue: (field: string, value: any) => {} },
      dialog: { alert: (msg: string) => {}, confirm: (msg: string) => true },
      myService: { fetchData: async (u) => [], clearCache: () => {}
    });

    console.log('[MonacoIntelliSenseProvider] Initialized with global bindings');
  }

  /**
   * Expose registry for custom globals
   */
  registerGlobals(globals: Record<string, object>): void {
    this.registry.registerMany(globals);
  }

  registerGlobal(name: string, obj: object): void {
    this.registry.register(name, obj);
  }

  getRegistry(): MonacoContextRegistry {
    return this.registry;
  }

  addLib(lib: { content: string; targetFileSrc: string }): void {
    try {
      this.monaco.languages.typescript.javascriptDefaults.addExtraLib(lib.content, lib.targetFileSrc);
      this.monaco.languages.typescript.typescriptDefaults.addExtraLib(lib.content, lib.targetFileSrc);
      this.loadedLibs.set(lib.targetFileSrc, lib);
      this.allLibs.push(lib);
      console.log(`[MonacoIntelliSenseProvider] Added lib: ${lib.targetFileSrc}`);
    } catch (error) {
      console.error(`[MonacoIntelliSenseProvider] Error adding lib: ${lib.targetFileSrc}`, error);
    }
  }

  loadLib(targetFileSrc: string): void {
    const lib = this.loadedLibs.get(targetFileSrc);
    if (lib) {
      try {
        this.monaco.languages.typescript.javascriptDefaults.addExtraLib(lib.content, targetFileSrc);
        this.monaco.languages.typescript.typescriptDefaults.addExtraLib(lib.content, targetFileSrc);
        console.log(`[MonacoIntelliSenseProvider] Loaded lib: ${targetFileSrc}`);
      } catch (error) {
        console.error(`[MonacoIntelliSenseProvider] Error loading lib: ${targetFileSrc}`, error);
      }
    }
  }

  removeLib(targetFileSrc: string): void {
    try {
      this.monaco.languages.typescript.javascriptDefaults.removeExtraLib(targetFileSrc);
      this.monaco.languages.typescript.typescriptDefaults.removeExtraLib(targetFileSrc);
      this.loadedLibs.delete(targetFileSrc);
      this.allLibs = this.allLibs.filter(lib => lib.targetFileSrc !== targetFileSrc);
      console.log(`[MonacoIntelliSenseProvider] Removed lib: ${targetFileSrc}`);
    } catch (error) {
      console.error(`[MonacoIntelliSenseProvider] Error removing lib: ${targetFileSrc}`, error);
    }
  }

  getLoadedLibs(): string[] {
    return Array.from(this.loadedLibs.keys());
  }

  getAllLibs(): any[] {
    return [...this.allLibs];
  }

  clearAllLibs(): void {
    this.loadedLibs.forEach((_, src) => {
      this.monaco.languages.typescript.javascriptDefaults.removeExtraLib(src);
      this.monaco.languages.typescript.typescriptDefaults.removeExtraLib(src);
    });
    this.loadedLibs.clear();
    this.allLibs = [];
    console.log('[MonacoIntelliSenseProvider] Cleared all libs');
  }
}

// --- initializeMonacoIntelliSense.ts ---

export function initializeMonacoIntelliSense(monaco: any): MonacoIntelliSenseProvider {
  const provider = new MonacoIntelliSenseProvider(monaco);
  provider.initialize();
  return provider;
}

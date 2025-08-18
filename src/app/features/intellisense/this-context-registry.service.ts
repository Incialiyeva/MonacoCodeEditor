import { Injectable } from '@angular/core';

type MethodSig = string;  // "(id: number) => Promise<Record>"
type PropType  = string;  // "string" | "number" | "Record"

export interface ThisObjectDef {
  methods?: Record<string, MethodSig>;
  props?:   Record<string, PropType>;
  doc?: string;
}

@Injectable({ providedIn: 'root' })
export class ThisContextRegistry {
  private monaco!: typeof import('monaco-editor');
  private thisObjects = new Map<string, ThisObjectDef>();

  // suggestion cache
  private rootSuggestions: any[] = [];
  private memberSuggestions = new Map<string, any[]>();

  // disposables
  private extraLibDisposable?: { dispose(): void };
  private providerDisposable?: { dispose(): void };

  /** Bir kere çağır: Monaco referansını al, provider'ı kaydet */
  init(monacoRef: typeof import('monaco-editor')) {
    console.log('[ThisContextRegistry] Initializing...');
    this.monaco = monacoRef;
    
    // Test objesi ekle
    this.addThisObject('test', {
      doc: 'Test object',
      methods: { 
        hello: '(name: string) => string' 
      }
    });
    
    this.rebuildDts();

    // önceki provider varsa kapat
    this.providerDisposable?.dispose();

    console.log('[ThisContextRegistry] Registering completion provider for JavaScript...');

    // Sadece JS için provider (tetiklemeyi component yapacak)
    try {
      this.providerDisposable = this.monaco.languages.registerCompletionItemProvider('javascript', {
        provideCompletionItems: (model, position) => {
          const line = model.getLineContent(position.lineNumber).slice(0, position.column - 1);
          console.log('[ThisContextRegistry] Completion requested for line:', line);
          console.log('[ThisContextRegistry] Root suggestions:', this.rootSuggestions);
          console.log('[ThisContextRegistry] Member suggestions:', this.memberSuggestions);
          
          // Test: Her durumda öneri döndür
          if (/\bthis\.$/.test(line)) {
            console.log('[ThisContextRegistry] Returning root suggestions:', this.rootSuggestions);
            return { suggestions: this.rootSuggestions };
          }
          const m = line.match(/\bthis\.([A-Za-z_]\w*)\.$/);
          if (m) {
            const memberSuggestions = this.memberSuggestions.get(m[1]) || [];
            console.log('[ThisContextRegistry] Returning member suggestions for', m[1], ':', memberSuggestions);
            return { suggestions: memberSuggestions };
          }
          
          // Test: Eğer this. ile başlıyorsa ama tam eşleşmiyorsa da öneri döndür
          if (line.includes('this.')) {
            console.log('[ThisContextRegistry] Partial this. match, returning test suggestions');
            return { 
              suggestions: [
                {
                  label: 'test',
                  kind: this.monaco.languages.CompletionItemKind.Property,
                  insertText: 'test',
                  documentation: 'Test object'
                }
              ] 
            };
          }
          
          console.log('[ThisContextRegistry] No suggestions for this context');
          return { suggestions: [] };
        },
        triggerCharacters: ['.'] // . tuşunda otomatik tetikle
      });
      
      console.log('[ThisContextRegistry] Provider registered successfully');
    } catch (error) {
      console.error('[ThisContextRegistry] Error registering provider:', error);
    }
  }

  /** Tek satırla obje ekleme API'si */
  addThisObject(name: string, def: ThisObjectDef) {
    console.log('[ThisContextRegistry] Adding object:', name, def);
    this.thisObjects.set(name, def);
    this.rebuildSuggestions();
    this.rebuildDts();
    console.log('[ThisContextRegistry] Object added. Total objects:', this.thisObjects.size);
  }

  /** Test metodu - provider'ın çalışıp çalışmadığını kontrol et */
  testProvider() {
    console.log('[ThisContextRegistry] Testing provider...');
    console.log('[ThisContextRegistry] Monaco available:', !!this.monaco);
    console.log('[ThisContextRegistry] Provider disposable:', !!this.providerDisposable);
    console.log('[ThisContextRegistry] Root suggestions:', this.rootSuggestions);
    console.log('[ThisContextRegistry] Member suggestions:', this.memberSuggestions);
    console.log('[ThisContextRegistry] This objects:', Array.from(this.thisObjects.keys()));
  }

  clear() {
    this.thisObjects.clear();
    this.rebuildSuggestions();
    this.rebuildDts();
  }

  // ---------------- private ----------------
  private rebuildSuggestions() {
    if (!this.monaco) {
      console.log('[ThisContextRegistry] rebuildSuggestions: Monaco not available');
      return;
    }
    const m = this.monaco;

    console.log('[ThisContextRegistry] rebuildSuggestions: Building suggestions for', this.thisObjects.size, 'objects');

    // root: this.{obj}
    this.rootSuggestions = Array.from(this.thisObjects.keys()).map(label => ({
      label,
      kind: m.languages.CompletionItemKind.Property,
      insertText: label,
      documentation: this.thisObjects.get(label)?.doc,
      sortText: '0' + label, // Öncelik için
      filterText: label
    }));

    console.log('[ThisContextRegistry] Root suggestions built:', this.rootSuggestions);

    // members: this.obj.{...}
    this.memberSuggestions.clear();
    for (const [obj, def] of this.thisObjects) {
      const items: any[] = [];

      for (const [k, sig] of Object.entries(def.methods || {})) {
        items.push({
          label: k,
          kind: m.languages.CompletionItemKind.Method,
          insertText: `${k}($0)`,
          insertTextRules: m.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: `method ${k}${sig}`,
          sortText: '0' + k,
          filterText: k
        });
      }
      for (const [k, t] of Object.entries(def.props || {})) {
        items.push({
          label: k,
          kind: m.languages.CompletionItemKind.Field,
          insertText: k,
          documentation: `property ${k}: ${t}`,
          sortText: '1' + k,
          filterText: k
        });
      }

      this.memberSuggestions.set(obj, items);
      console.log('[ThisContextRegistry] Member suggestions for', obj, ':', items);
    }
  }

  private rebuildDts() {
    if (!this.monaco) return;
    const dts = this.generateThisContextDts();
    this.extraLibDisposable?.dispose();
    this.extraLibDisposable = this.monaco.languages.typescript.javascriptDefaults.addExtraLib(
      dts,
      'inmemory://model/this-context.d.ts'
    );
  }

  private generateThisContextDts(): string {
    const lines: string[] = ['declare interface ThisContext {'];
    for (const [obj, def] of this.thisObjects) {
      const segs: string[] = [];
      for (const [k, t] of Object.entries(def.props || {}))   segs.push(`${k}: ${t};`);
      for (const [k, sig] of Object.entries(def.methods || {})) segs.push(`${k}: ${sig};`);
      lines.push(`  ${obj}: { ${segs.join(' ')} };`);
    }
    lines.push('}');
    lines.push('declare interface Record { id: number; }'); // örnek tip
    return lines.join('\n');
  }
} 
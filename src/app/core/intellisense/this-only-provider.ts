import type * as monaco from 'monaco-editor';
import { ThisApiRegistry } from './this-api-registry.service';

export function registerThisOnlyProvider(
  monacoRef: typeof monaco,
  registry: ThisApiRegistry
): monaco.IDisposable {
  return monacoRef.languages.registerCompletionItemProvider('javascript', {
    // Trigger characters kaldırıldı - her zaman kontrol et
    provideCompletionItems(model, position) {
      const line = model.getLineContent(position.lineNumber).slice(0, position.column);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: position.column,
        endColumn: position.column
      };

      // this.<prefix>  (kök obje listesi)
      const root = line.match(/\bthis\.(\w*)$/);
      if (root) {
        const prefix = root[1] ?? '';
        const roots = registry.getRootNames();
        console.log('🔍 this. provider triggered:', { line, prefix, roots });
        
        // Filtreleme işlemi
        const labels = prefix ? roots.filter(r => r.startsWith(prefix)) : roots;
        
        // Tüm öğeleri döndür - Monaco'nun filtrelemesini bypass et
        const suggestions = labels.map((name, index) => ({
          label: name,
          kind: registry.inferRootKind(name, monacoRef), // ✅ dinamik
          insertText: name,
          detail: 'this.' + name,
          sortText: `0000_${index.toString().padStart(3, '0')}`, // Her öğe için unique sortText
          filterText: name, // Sadece isim - Monaco'nun filtrelemesini bypass et
          preselect: index === 0, // Sadece ilk öğe preselect
          range: range,
          command: undefined, // Force no command
          additionalTextEdits: undefined // Force no additional edits
        }));
        
        console.log('📝 Suggestions:', suggestions);
        return { 
          suggestions,
          incomplete: false // Tamamlandı, Monaco filtreleme yapmasın
        };
      }

      // this.obj.<prefix>  (üyeler)
      const mem = line.match(/\bthis\.(\w+)\.(\w*)$/);
      if (mem) {
        const [, obj, prefix = ''] = mem;
        // UI donmasın diye microtask'e bırak
        return new Promise<monaco.languages.CompletionList>(resolve => {
          setTimeout(() => {
            const items = prefix
              ? registry.getMembersByPrefix(obj, prefix, monacoRef)
              : registry.getMembers(obj, monacoRef).slice(0, 100);
            resolve({ 
              suggestions: items.map(item => ({ ...item, range })),
              incomplete: false // Tamamlandı, Monaco filtreleme yapmasın
            });
          }, 0);
        });
      }

      // Diğer tüm bağlamlarda öneri YOK
      return { suggestions: [] };
    }
  });
} 
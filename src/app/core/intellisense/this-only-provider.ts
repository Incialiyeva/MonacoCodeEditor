import type * as monaco from 'monaco-editor';
import { ThisApiRegistry } from './this-api-registry.service';

export function registerThisOnlyProvider(
  monacoRef: typeof monaco,
  registry: ThisApiRegistry
): monaco.IDisposable {
  // JavaScript için provider
  const jsProvider = monacoRef.languages.registerCompletionItemProvider('javascript', {
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
        console.log('🔍 this. provider triggered:', { line, prefix, roots, rootCount: roots.length });
        const labels = prefix ? roots.filter(r => r.startsWith(prefix)) : roots;
        console.log('🔍 Filtered labels:', labels);
        const suggestions = labels.slice(0, 50).map(name => ({
          label: name,
          kind: monacoRef.languages.CompletionItemKind.Class, // mavi C ikonu
          insertText: name,
          detail: 'this.' + name,
          sortText: '0000',           // bizimkileri en üste taşı
          filterText: 'this.' + name, // bağlamı netleştir, dedup'a yardım et
          preselect: true,            // otomatik seç
          range: range
        }));
        console.log('📝 Suggestions:', suggestions);
        return { suggestions };
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
            resolve({ suggestions: items.map(item => ({ ...item, range })) });
          }, 0);
        });
      }

      // Diğer tüm bağlamlarda öneri YOK
      return { suggestions: [] };
    }
  });

  // TypeScript için aynı provider
  const tsProvider = monacoRef.languages.registerCompletionItemProvider('typescript', {
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
        console.log('🔍 this. provider triggered (TS):', { line, prefix, roots, rootCount: roots.length });
        const labels = prefix ? roots.filter(r => r.startsWith(prefix)) : roots;
        console.log('🔍 Filtered labels (TS):', labels);
        const suggestions = labels.slice(0, 50).map(name => ({
          label: name,
          kind: monacoRef.languages.CompletionItemKind.Class, // mavi C ikonu
          insertText: name,
          detail: 'this.' + name,
          sortText: '0000',           // bizimkileri en üste taşı
          filterText: 'this.' + name, // bağlamı netleştir, dedup'a yardım et
          preselect: true,            // otomatik seç
          range: range
        }));
        console.log('📝 Suggestions (TS):', suggestions);
        return { suggestions };
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
            resolve({ suggestions: items.map(item => ({ ...item, range })) });
          }, 0);
        });
      }

      // Diğer tüm bağlamlarda öneri YOK
      return { suggestions: [] };
    }
  });

  // Her iki provider'ı da dispose edebilmek için
  return {
    dispose: () => {
      jsProvider.dispose();
      tsProvider.dispose();
    }
  };
} 
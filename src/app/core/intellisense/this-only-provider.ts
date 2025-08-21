import type * as monaco from 'monaco-editor';
import { ThisApiRegistry } from './this-api-registry.service';

/**
 * RegExp için özel karakterleri escape et
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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

      // this.<prefix>  (kökler)
      const root = line.match(/\bthis\.(\w*)$/);
      if (root) {
        const [, prefix = ''] = root;
        console.log('🔍 this. provider triggered:', { line, prefix, roots: registry.getRootNames() });

        // UI donmasın diye microtask'e bırak
        return new Promise<monaco.languages.CompletionList>(resolve => {
          setTimeout(() => {
            const labels = registry.getRootNames();
            
            // Local symbols'ları filtrele - sadece global kökler kalsın
            const filteredLabels = labels.filter(name => {
              // Dosya içi fonksiyon/değişken adlarını filtrele
              const model = monacoRef.editor.getModels()[0]; // Aktif model
              if (model) {
                const text = model.getValue();
                // function onInit, const testVar gibi local tanımları kontrol et
                const localPatterns = [
                  new RegExp(`\\bfunction\\s+${escapeRegExp(name)}\\s*\\(`, 'g'),
                  new RegExp(`\\b(?:const|let|var)\\s+${escapeRegExp(name)}\\b`, 'g'),
                  new RegExp(`\\bclass\\s+${escapeRegExp(name)}\\b`, 'g')
                ];
                
                for (const pattern of localPatterns) {
                  if (pattern.test(text)) {
                    console.log(`🔍 Filtering out local symbol: ${name}`);
                    return false; // Local symbol, filtrele
                  }
                }
              }
              return true; // Global symbol, tut
            });

            const suggestions = filteredLabels.map((name, index) => ({
              label: name,
              kind: registry.inferRootKind(name, monacoRef), // ✅ dinamik
              insertText: name,
              detail: 'this.' + name,
              sortText: `0000_${index.toString().padStart(3, '0')}`, // Her öğe için unique sortText
              filterText: name, // Sadece isim - Monaco'nun filtrelemesini bypass et
              preselect: index === 0, // İlk öğe preselect
              range: range,
              command: undefined, // Force no command
              additionalTextEdits: undefined // Force no additional edits
            }));
            
            console.log('📝 Suggestions:', suggestions);
            resolve({ 
              suggestions,
              incomplete: false // Tamamlandı, Monaco filtreleme yapmasın
            });
          }, 0);
        });
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
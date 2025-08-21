import type * as monaco from 'monaco-editor';
import { ThisApiRegistry } from './this-api-registry.service';

export function registerRootOnlyProvider(
  monacoRef: typeof monaco,
  registry: ThisApiRegistry,
  opts?: { maxItems?: number }
): monaco.IDisposable {
  const maxItems = opts?.maxItems ?? 100;

  return monacoRef.languages.registerCompletionItemProvider('javascript', {
    triggerCharacters: ['.'],
    provideCompletionItems(model, position) {
      const lineText = model.getLineContent(position.lineNumber).slice(0, position.column);
      
      // this.* kalıplarını bu provider'ın işi değil - this-only-provider'a bırak
      const thisDot = /\bthis\.[A-Za-z_$][\w$]*\.$/;
      if (thisDot.test(lineText)) {
        return { suggestions: [] };
      }

      // x.<prefix> kalıbını yakala
      const bareDot = /\b([A-Za-z_$][\w$]*)\.(\w*)$/;
      const match = lineText.match(bareDot);
      if (!match) {
        return { suggestions: [] };
      }

      const [, rootName, prefix = ''] = match;
      
      // Registry'de bu kök isim var mı kontrol et
      const rootNames = registry.getRootNames();
      const rootSet = new Set(rootNames);
      if (!rootSet.has(rootName)) {
        return { suggestions: [] };
      }

      // Lokal değişken gölgelemesi kontrolü
      const before = model.getValueInRange(new monacoRef.Range(1, 1, position.lineNumber, position.column));
      if (hasLocalDeclaration(before, rootName)) {
        return { suggestions: [] };
      }

      console.log('🔍 root-only provider triggered:', { rootName, prefix, lineText });

      // UI donmasın diye microtask'e bırak
      return new Promise<monaco.languages.CompletionList>(resolve => {
        setTimeout(() => {
          const items = prefix
            ? registry.getMembersByPrefix(rootName, prefix, monacoRef)
            : registry.getMembers(rootName, monacoRef).slice(0, maxItems);

          const range = new monacoRef.Range(
            position.lineNumber, 
            position.column - prefix.length, 
            position.lineNumber, 
            position.column
          );

          const suggestions = items.map((item, index) => ({
            ...item,
            range,
            sortText: `0000_${index.toString().padStart(3, '0')}` // Her öğe için unique sortText
          }));

          console.log('📝 Root suggestions:', suggestions);
          resolve({ 
            suggestions,
            incomplete: false // Tamamlandı, Monaco filtreleme yapmasın
          });
        }, 0);
      });
    }
  });
}

/**
 * Basit lokal değişken gölgelemesi kontrolü
 * Satır başından pozisyona kadar olan kodda, verilen isimde bir lokal tanım var mı?
 */
function hasLocalDeclaration(code: string, name: string): boolean {
  // const/let/var tanımları
  const varPattern = new RegExp(`\\b(const|let|var)\\s+${escapeRegExp(name)}\\b`, 'g');
  if (varPattern.test(code)) {
    return true;
  }

  // function tanımları
  const funcPattern = new RegExp(`\\bfunction\\s+${escapeRegExp(name)}\\b`, 'g');
  if (funcPattern.test(code)) {
    return true;
  }

  // Arrow function parametreleri (basit kontrol)
  const arrowPattern = new RegExp(`\\([^)]*\\b${escapeRegExp(name)}\\b[^)]*\\)\\s*=>`, 'g');
  if (arrowPattern.test(code)) {
    return true;
  }

  // Destructuring pattern'ları (basit kontrol)
  const destructurePattern = new RegExp(`\\{[^}]*\\b${escapeRegExp(name)}\\b[^}]*\\}`, 'g');
  if (destructurePattern.test(code)) {
    return true;
  }

  return false;
}

/**
 * RegExp için özel karakterleri escape et
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
} 
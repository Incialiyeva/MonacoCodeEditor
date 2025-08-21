import type * as monaco from 'monaco-editor';

type Kind = number; // monaco.languages.CompletionItemKind

export function registerLocalSymbolsProvider(
  monacoRef: typeof monaco,
  opts?: { maxItems?: number }
): monaco.IDisposable {
  const maxItems = opts?.maxItems ?? 100;

  // Basit cache: model versionId değişince yeniden çıkar
  const cache = new WeakMap<monaco.editor.ITextModel, { versionId: number, symbols: Map<string, Kind> }>();

  const collect = (model: monaco.editor.ITextModel) => {
    const ver = model.getVersionId();
    const hit = cache.get(model);
    if (hit && hit.versionId === ver) return hit.symbols;

    const text = model.getValue();
    console.log('🔍 Local symbols provider - collecting from text:', text.substring(0, 200) + '...');

    // Ad yakalama (function/var/let/const/class/arrow/fn expr)
    const symbols = new Map<string, Kind>();
    const K = monacoRef.languages.CompletionItemKind;

    // function foo() {…}
    for (const m of text.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)) {
      symbols.set(m[1], K.Function);
    }
    // const foo = () => {…}
    for (const m of text.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\(?.*?\)\s*=>/g)) {
      symbols.set(m[1], K.Function);
    }
    // const foo = function (…) {…}
    for (const m of text.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*function\b/g)) {
      symbols.set(m[1], K.Function);
    }
    // class Foo {…}
    for (const m of text.matchAll(/\bclass\s+([A-Za-z_$][\w$]*)\b/g)) {
      symbols.set(m[1], K.Class);
    }
    // const/let/var foo = …
    for (const m of text.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\b/g)) {
      if (!symbols.has(m[1])) symbols.set(m[1], K.Variable);
    }

    console.log('🔍 Local symbols found:', Array.from(symbols.entries()));
    cache.set(model, { versionId: ver, symbols });
    return symbols;
  };

  // Bu provider yalnızca "kelime tamamlama" içindir; this.* / root.* bağlamına karışmaz
  return monacoRef.languages.registerCompletionItemProvider('javascript', {
    triggerCharacters: [], // otomatik açmayı biz onDidType ile tetikleyeceğiz
    provideCompletionItems(model, position) {
      const line = model.getLineContent(position.lineNumber).slice(0, position.column);

      // 1) this.* ve root.* bağlamlarını pas geç (diğer provider'lar baksın)
      if (/\bthis\.[A-Za-z_$\w$]*\.?$/.test(line)) {
        console.log('🔍 Local provider: this.* context detected, skipping');
        return { suggestions: [] };
      }
      if (/\b([A-Za-z_$][\w$]*)\.[A-Za-z_$\w$]*$/.test(line)) {
        console.log('🔍 Local provider: root.* context detected, skipping');
        return { suggestions: [] };
      }

      // 2) Şu anki prefix (kelimenin sol kısmı)
      const m = line.match(/([A-Za-z_$][\w$]*)$/);
      const prefix = m ? m[1] : '';
      if (!prefix) return { suggestions: [] };

      // 3) Sembolleri topla ve prefix'e göre filtrele
      const syms = collect(model);
      const items: monaco.languages.CompletionItem[] = [];
      let i = 0;
      for (const [name, kind] of syms) {
        if (name === prefix) continue;
        if (!name.toLowerCase().startsWith(prefix.toLowerCase())) continue;
        items.push({
          label: name,
          kind,
          insertText: name,
          filterText: name,
          sortText: `1000_${String(i++).padStart(3, '0')}`,
          range: new monacoRef.Range(
            position.lineNumber,
            position.column - prefix.length,
            position.lineNumber,
            position.column
          )
        });
        if (items.length >= maxItems) break;
      }

      console.log('🔍 Local symbols provider triggered:', { prefix, itemsCount: items.length });
      
      // Öğe bulunamadıysa hiçbir şey döndürme (no suggestion gösterme)
      if (items.length === 0) {
        return { suggestions: [] };
      }
      
      return { suggestions: items, incomplete: false };
    }
  });
} 
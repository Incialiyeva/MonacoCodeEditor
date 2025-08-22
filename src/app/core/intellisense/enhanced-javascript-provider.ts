import type * as monaco from 'monaco-editor';
import { ThisApiRegistry } from './this-api-registry.service';

export interface JavaScriptCompletionItem {
  label: string;
  kind: monaco.languages.CompletionItemKind;
  insertText: string;
  insertTextRules?: monaco.languages.CompletionItemInsertTextRule;
  detail?: string;
  documentation?: string;
  sortText?: string;
  filterText?: string;
  range?: monaco.IRange;
}

export class EnhancedJavaScriptProvider {
  private monaco: any;
  private registry: ThisApiRegistry;
  private disposables: any[] = [];

  constructor(monaco: any, registry: ThisApiRegistry) {
    this.monaco = monaco;
    this.registry = registry;
  }

  register(): any {
    const provider = this.monaco.languages.registerCompletionItemProvider('javascript', {
      triggerCharacters: [' '], // Sadece boşluk karakteri ile tetikle
      provideCompletionItems: (model: any, position: any) => {
        return this.provideCompletions(model, position);
      }
    });

    this.disposables.push(provider);
    return provider;
  }

  private async provideCompletions(model: any, position: any): Promise<any> {
    const suggestions: JavaScriptCompletionItem[] = [];
    const lineText = model.getLineContent(position.lineNumber);
    const textUntilPosition = lineText.slice(0, position.column - 1);
    const fullText = model.getValue();

    // 1. this. ile başlayan öneriler - BU KISMI KALDIRIYORUZ (this-only-provider zaten yapıyor)
    // const thisSuggestions = this.getThisSuggestions(textUntilPosition, position);
    // suggestions.push(...thisSuggestions);

    // 2. Dosya içi fonksiyon tanımları - BU KISMI KALDIRIYORUZ (Monaco JS dili zaten yapıyor)
    // const functionSuggestions = this.getFunctionSuggestions(fullText, textUntilPosition, position);
    // suggestions.push(...functionSuggestions);

    // 3. Dosya içi değişken tanımları - BU KISMI KALDIRIYORUZ (Monaco JS dili zaten yapıyor)
    // const variableSuggestions = this.getVariableSuggestions(fullText, textUntilPosition, position);
    // suggestions.push(...variableSuggestions);

    // 4. JavaScript anahtar kelimeleri - BU KALIYOR
    const keywordSuggestions = this.getKeywordSuggestions(textUntilPosition, position);
    suggestions.push(...keywordSuggestions);

    // 5. Genel JavaScript API'leri - BU KALIYOR
    const generalSuggestions = this.getGeneralSuggestions(textUntilPosition, position);
    suggestions.push(...generalSuggestions);

    return {
      suggestions: suggestions.map(suggestion => ({
        ...suggestion,
        range: suggestion.range || new this.monaco.Range(
          position.lineNumber,
          position.column - (suggestion.insertText.length || 0),
          position.lineNumber,
          position.column
        )
      })),
      incomplete: false
    };
  }

  private getKeywordSuggestions(textUntilPosition: string, position: any): JavaScriptCompletionItem[] {
    const suggestions: JavaScriptCompletionItem[] = [];
    
    // JavaScript anahtar kelimeleri
    const keywords = [
      'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default',
      'break', 'continue', 'return', 'throw', 'try', 'catch', 'finally',
      'function', 'class', 'const', 'let', 'var', 'import', 'export',
      'new', 'delete', 'typeof', 'instanceof', 'in', 'of', 'this', 'super',
      'true', 'false', 'null', 'undefined', 'NaN', 'Infinity'
    ];

    // Sadece kelime başında öner (boşluk sonrası veya satır başında)
    const wordStart = /(?:^|\s)(\w*)$/;
    const match = textUntilPosition.match(wordStart);
    if (match) {
      const [, prefix = ''] = match;
      
      keywords.forEach(keyword => {
        if (keyword.toLowerCase().startsWith(prefix.toLowerCase())) {
          suggestions.push({
            label: keyword,
            kind: this.monaco.languages.CompletionItemKind.Keyword,
            insertText: keyword,
            detail: 'JavaScript Keyword',
            sortText: `3000_${keyword}`
          });
        }
      });
    }

    return suggestions;
  }

  private getGeneralSuggestions(textUntilPosition: string, position: any): JavaScriptCompletionItem[] {
    const suggestions: JavaScriptCompletionItem[] = [];
    
    // Genel JavaScript API'leri
    const globalAPIs = [
      'console', 'Math', 'Date', 'Array', 'Object', 'String', 'Number',
      'Boolean', 'RegExp', 'JSON', 'Promise', 'Set', 'Map', 'WeakMap',
      'WeakSet', 'Symbol', 'Proxy', 'Reflect', 'Intl', 'URL', 'URLSearchParams'
    ];

    // Sadece kelime başında öner (boşluk sonrası veya satır başında)
    const wordStart = /(?:^|\s)(\w*)$/;
    const match = textUntilPosition.match(wordStart);
    if (match) {
      const [, prefix = ''] = match;
      
      globalAPIs.forEach(api => {
        if (api.toLowerCase().startsWith(prefix.toLowerCase())) {
          suggestions.push({
            label: api,
            kind: this.monaco.languages.CompletionItemKind.Class,
            insertText: api,
            detail: 'Global API',
            documentation: `Global JavaScript API`,
            sortText: `4000_${api}`
          });
        }
      });
    }

    return suggestions;
  }

  dispose(): void {
    this.disposables.forEach(disposable => disposable.dispose());
    this.disposables = [];
  }
}

export function registerEnhancedJavaScriptProvider(
  monaco: any,
  registry: ThisApiRegistry
): any {
  const provider = new EnhancedJavaScriptProvider(monaco, registry);
  return provider.register();
} 
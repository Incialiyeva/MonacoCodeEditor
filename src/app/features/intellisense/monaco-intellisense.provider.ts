// Custom Monaco Intellisense Provider
export function registerMonacoIntellisense(monaco: any) {
  monaco.languages.registerCompletionItemProvider('javascript', {
    triggerCharacters: ['.'],
    provideCompletionItems: function(model: any, position: any) {
      const textUntilPosition = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column
      });
      const ctxNames = ['self', 'this', 'context', 'ctx', 'page', 'env'];
      const contextRegex = new RegExp('\\b(' + ctxNames.join('|') + ')\\.$');
      if (contextRegex.test(textUntilPosition)) {
        return {
          suggestions: [
            { label: 'form', kind: monaco.languages.CompletionItemKind.Property, insertText: 'form', detail: 'Form API', documentation: 'Form işlemleri için API' },
            { label: 'dialog', kind: monaco.languages.CompletionItemKind.Property, insertText: 'dialog', detail: 'Dialog API', documentation: 'Uyarı, onay, pencere açma' },
            { label: 'navigation', kind: monaco.languages.CompletionItemKind.Property, insertText: 'navigation', detail: 'Navigation API', documentation: 'Sayfa geçiş ve yenileme' },
            { label: 'record', kind: monaco.languages.CompletionItemKind.Property, insertText: 'record', detail: 'Aktif form verileri', documentation: 'Formdaki mevcut kayıt verileri' },
            { label: 'isEditMode', kind: monaco.languages.CompletionItemKind.Property, insertText: 'isEditMode', detail: 'Düzenleme modu', documentation: 'Sayfa şu an düzenleme modunda mı?' }
          ]
        };
      }
      const formRegex = new RegExp('\\b(' + ctxNames.join('|') + ')\\.form\\.$');
      if (formRegex.test(textUntilPosition)) {
        return {
          suggestions: [
            { label: 'getValue', kind: monaco.languages.CompletionItemKind.Method, insertText: 'getValue($1)', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Alan değeri al', documentation: 'form.getValue(field: string): any' },
            { label: 'setValue', kind: monaco.languages.CompletionItemKind.Method, insertText: 'setValue($1, $2)', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Alan değeri ata', documentation: 'form.setValue(field: string, value: any): void' },
            { label: 'setVisible', kind: monaco.languages.CompletionItemKind.Method, insertText: 'setVisible($1, $2)', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Alan görünürlüğü', documentation: 'form.setVisible(field: string, visible: boolean): void' },
            { label: 'setEnabled', kind: monaco.languages.CompletionItemKind.Method, insertText: 'setEnabled($1, $2)', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Alan aktifliği', documentation: 'form.setEnabled(field: string, enabled: boolean): void' },
            { label: 'showError', kind: monaco.languages.CompletionItemKind.Method, insertText: 'showError($1, $2)', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Alan hata mesajı', documentation: 'form.showError(field: string, message: string): void' }
          ]
        };
      }
      const dialogRegex = new RegExp('\\b(' + ctxNames.join('|') + ')\\.dialog\\.$');
      if (dialogRegex.test(textUntilPosition)) {
        return {
          suggestions: [
            { label: 'alert', kind: monaco.languages.CompletionItemKind.Method, insertText: 'alert($1)', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Uyarı göster', documentation: 'dialog.alert(message: string): void' },
            { label: 'confirm', kind: monaco.languages.CompletionItemKind.Method, insertText: 'confirm($1)', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Onay iste', documentation: 'dialog.confirm(message: string): Promise<boolean>' },
            { label: 'open', kind: monaco.languages.CompletionItemKind.Method, insertText: 'open($1, $2)', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Pencere aç', documentation: 'dialog.open(path: string, params?: Record<string, any>): void' }
          ]
        };
      }
      const navigationRegex = new RegExp('\\b(' + ctxNames.join('|') + ')\\.navigation\\.$');
      if (navigationRegex.test(textUntilPosition)) {
        return {
          suggestions: [
            { label: 'go', kind: monaco.languages.CompletionItemKind.Method, insertText: 'go($1, $2)', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Sayfa geçişi', documentation: 'navigation.go(path: string, params?: Record<string, any>): void' },
            { label: 'reload', kind: monaco.languages.CompletionItemKind.Method, insertText: 'reload()', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Sayfayı yenile', documentation: 'navigation.reload(): void' }
          ]
        };
      }
      return { suggestions: [] };
    }
  });
} 
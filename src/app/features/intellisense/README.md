# Monaco IntelliSense Provider - Genişletme Rehberi

Bu dosya, yeni objeler ve fonksiyonlar eklemek için rehber içerir.

## 🚀 Hızlı Başlangıç

### 1. Yeni Obje Ekleme

`monaco-intellisense.provider.ts` dosyasında şu bölümleri bulun:

#### A. Global Obje Ekleme
```typescript
// Global variables bölümüne ekleyin (satır ~150)
{
  label: 'yeniObje',
  kind: monaco.languages.CompletionItemKind.Variable,
  insertText: 'yeniObje',
  detail: 'Yeni Obje API',
  documentation: 'Yeni obje için API',
  sortText: '20' // Sıralama için benzersiz numara
},
```

#### B. Type Tanımı Ekleme
```typescript
// initializeDefaultLibs() metodunda ekleyin
this.addLib({
  content: `
declare global {
  /**
   * Yeni Obje API
   */
  var yeniObje: {
    /**
     * Metod açıklaması
     * @param param - Parametre açıklaması
     * @returns Dönüş değeri
     */
    metodAdi(param: string): any;
    
    /**
     * Başka metod
     */
    baskaMetod(): void;
  };
}

export {};
`,
  targetFileSrc: 'yeni-obje-types.d.ts'
});
```

#### C. Metod Completion Ekleme
```typescript
// registerMethodCompletions() fonksiyonunda ekleyin
// Check if we're after "yeniObje."
if (textUntilPosition.endsWith('yeniObje.')) {
  return {
    suggestions: [
      {
        label: 'metodAdi',
        kind: monaco.languages.CompletionItemKind.Method,
        insertText: 'metodAdi(${1:param})',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        detail: 'Metod açıklaması',
        documentation: 'Metod detaylı açıklaması'
      },
      {
        label: 'baskaMetod',
        kind: monaco.languages.CompletionItemKind.Method,
        insertText: 'baskaMetod()',
        detail: 'Başka metod',
        documentation: 'Başka metod açıklaması'
      }
    ]
  };
}
```

## 📝 Örnek: "api" Objesi Ekleme

### 1. Global Obje Ekle
```typescript
{
  label: 'api',
  kind: monaco.languages.CompletionItemKind.Variable,
  insertText: 'api',
  detail: 'API Service',
  documentation: 'API işlemleri için servis',
  sortText: '15'
},
```

### 2. Type Tanımı Ekle
```typescript
this.addLib({
  content: `
declare global {
  var api: {
    get(endpoint: string): Promise<any>;
    post(endpoint: string, data?: any): Promise<any>;
    put(endpoint: string, data?: any): Promise<any>;
    delete(endpoint: string): Promise<any>;
  };
}

export {};
`,
  targetFileSrc: 'api-types.d.ts'
});
```

### 3. Metod Completion Ekle
```typescript
if (textUntilPosition.endsWith('api.')) {
  return {
    suggestions: [
      {
        label: 'get',
        kind: monaco.languages.CompletionItemKind.Method,
        insertText: 'get(${1:endpoint})',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        detail: 'GET request',
        documentation: 'GET isteği gönderir'
      },
      {
        label: 'post',
        kind: monaco.languages.CompletionItemKind.Method,
        insertText: 'post(${1:endpoint}, ${2:data})',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        detail: 'POST request',
        documentation: 'POST isteği gönderir'
      }
    ]
  };
}
```

## 🎯 Test Etme

Yeni obje ekledikten sonra:

1. **Uygulamayı yeniden başlatın**
2. **Monaco Editor'ı açın**
3. **Yeni obje adını yazın** (örn: `api`)
4. **Nokta ekleyin** (örn: `api.`)
5. **Autocomplete'in çıktığını kontrol edin**

## 📋 Checklist

- [ ] Global obje eklendi
- [ ] Type tanımı eklendi
- [ ] Metod completion eklendi
- [ ] Test edildi
- [ ] Dokümantasyon güncellendi

## 🔧 İpuçları

- **sortText**: Sıralama için benzersiz numara kullanın
- **insertTextRules**: Snippet için `InsertAsSnippet` kullanın
- **documentation**: Detaylı açıklama ekleyin
- **JSDoc**: Type tanımlarında JSDoc kullanın

## 🚨 Dikkat

- Değişikliklerden sonra uygulamayı yeniden başlatın
- Type tanımları ve completion'lar eşleşmeli
- Test etmeden production'a geçmeyin 
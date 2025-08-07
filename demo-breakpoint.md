# Monaco Editor Breakpoint & Hover Demo

## Özellikler

### 1. Breakpoint Glyphs
- **Sol kenar boşluğuna tıklayarak** breakpoint ekleyip kaldırabilirsiniz
- Kırmızı nokta ikonu ile görsel olarak gösterilir
- Breakpoint'li satırlar debug modunda özel işaretlenir

### 2. Hover Tooltip
- **Kod üzerine mouse ile gelin** ve tooltip'leri görün
- Built-in JavaScript objelerini tanır (console, document, window, Math, vb.)
- Değişken tanımlamalarını ve fonksiyonları algılar

### 3. Debug Panelleri
- **Debug mode** aktif olduğunda Variables ve Call Stack panelleri açılır
- Gerçek zamanlı değişken değerlerini simüle eder
- Call stack izleme özelliği

## Test Kodu

Aşağıdaki JavaScript kodunu Monaco Editor'a yapıştırın ve test edin:

```javascript
// Test Breakpoint ve Hover Özelliklerini
function calculateSum(a, b) {
    let result = a + b;        // Bu satıra breakpoint koyun (satır 3)
    console.log('Sum calculated:', result);
    return result;
}

let x = 10;                    // Bu satıra breakpoint koyun (satır 8)  
let y = 20;
let total = calculateSum(x, y); // Bu satıra breakpoint koyun (satır 10)

// Array işlemleri
let numbers = [1, 2, 3, 4, 5];
let doubled = numbers.map(n => n * 2);

// Object işlemleri  
let person = {
    name: 'John',
    age: 30,
    greet: function() {        // Bu satıra breakpoint koyun (satır 19)
        return 'Hello, ' + this.name;
    }
};

console.log(person.greet());
```

## Kullanım Adımları

1. **Breakpoint Ekleme:**
   - Sol kenar boşluğuna (glyph margin) tıklayın
   - Kırmızı nokta görünecek
   - Tekrar tıklayarak kaldırabilirsiniz

2. **Hover Test:**
   - `console` kelimesinin üzerine mouse ile gelin
   - `calculateSum` fonksiyon isminin üzerine gelin  
   - `let x = 10` satırındaki `x` değişkeninin üzerine gelin

3. **Debug Mode:**
   - Toolbar'dan "Debug" butonuna tıklayın
   - Debug panelleri otomatik açılacak
   - Variables panelinde simüle edilmiş değişken değerlerini göreceksiniz
   - Call Stack panelinde fonksiyon çağrı zincirini göreceksiniz

## Gerçek Debug Adapter Protocol (DAP) Entegrasyonu

Gerçek zamanlı debugging için şu adımları takip edebilirsiniz:

### 1. Debug Server Kurulumu
```bash
npm install vscode-debugadapter-node
npm install @types/vscode-debugadapter-node
```

### 2. Debug Adapter Oluşturma
```typescript
import { DebugAdapter } from 'vscode-debugadapter-node';

class CustomDebugAdapter extends DebugAdapter {
  // Breakpoint set/remove
  // Variable inspection  
  // Step in/out/over
  // Call stack navigation
}
```

### 3. Monaco Debug Service
```typescript
// Debug adapter ile Monaco editor entegrasyonu
// WebSocket veya HTTP üzerinden debug server ile iletişim
// Gerçek zamanlı breakpoint durma
// Canlı değişken değerleri
```

Bu demo ile Monaco Editor'ın gelişmiş debug özelliklerini test edebilirsiniz! 
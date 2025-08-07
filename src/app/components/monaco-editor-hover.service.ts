import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MonacoEditorHoverService {

  // Detaylı hover bilgisi al
  getDetailedHoverInfo(word: string, lineContent: string, fullCode: string, lineNumber: number): { contents: any[] } | null {
    // 1. Built-in JavaScript/TypeScript objelerini kontrol et
    const builtinInfo = this.getBuiltinInfo(word);
    if (builtinInfo) {
      return { contents: builtinInfo };
    }

    // 2. Kod içinde tanımlanan değişken/fonksiyonları analiz et
    const customInfo = this.analyzeCustomSymbol(word, lineContent, fullCode, lineNumber);
    if (customInfo) {
      return { contents: customInfo };
    }

    // 3. Genel kelime bilgisi
    const generalInfo = this.getGeneralWordInfo(word, lineContent);
    if (generalInfo) {
      return { contents: generalInfo };
    }

    return null;
  }

  // Built-in objeler için detaylı bilgi
  private getBuiltinInfo(word: string): any[] | null {
    const builtins: Record<string, { type: string, description: string, syntax?: string, examples?: string[], methods?: string[] }> = {
      'console': {
        type: 'Console',
        description: 'Tarayıcının debugging console\'una erişim sağlar.',
        syntax: 'console.method()',
        examples: [
          'console.log("Hello World")',
          'console.error("Error message")',
          'console.warn("Warning message")'
        ],
        methods: ['log()', 'error()', 'warn()', 'info()', 'table()', 'clear()']
      },
      'document': {
        type: 'Document',
        description: 'Tarayıcıda yüklenen web sayfasını temsil eder.',
        syntax: 'document.property | document.method()',
        examples: [
          'document.getElementById("myId")',
          'document.querySelector(".myClass")',
          'document.createElement("div")'
        ],
        methods: ['getElementById()', 'querySelector()', 'createElement()', 'addEventListener()']
      },
      'window': {
        type: 'Window',
        description: 'DOM document içeren pencereyi temsil eder.',
        syntax: 'window.property | window.method()',
        examples: [
          'window.alert("Message")',
          'window.open("url")',
          'window.location.href'
        ],
        methods: ['alert()', 'confirm()', 'prompt()', 'open()', 'close()']
      },
      'Array': {
        type: 'ArrayConstructor',
        description: 'Array objesi oluşturmak için kullanılır.',
        syntax: 'new Array() | Array.method()',
        examples: [
          'let arr = new Array(1, 2, 3)',
          'Array.from([1, 2, 3])',
          'Array.isArray(arr)'
        ],
        methods: ['from()', 'isArray()', 'of()']
      },
      'Math': {
        type: 'Math',
        description: 'Matematik işlemleri ve sabitleri sağlar.',
        syntax: 'Math.property | Math.method()',
        examples: [
          'Math.PI',
          'Math.random()',
          'Math.max(1, 2, 3)',
          'Math.round(4.7)'
        ],
        methods: ['abs()', 'ceil()', 'floor()', 'max()', 'min()', 'random()', 'round()']
      },
      'JSON': {
        type: 'JSON',
        description: 'JavaScript Object Notation formatına çevirme işlemleri.',
        syntax: 'JSON.method()',
        examples: [
          'JSON.stringify({name: "John"})',
          'JSON.parse(\'{"name": "John"}\')'
        ],
        methods: ['stringify()', 'parse()']
      },
      'Date': {
        type: 'DateConstructor',
        description: 'Tarih ve saat işlemleri için kullanılır.',
        syntax: 'new Date() | Date.method()',
        examples: [
          'new Date()',
          'new Date("2023-01-01")',
          'Date.now()'
        ],
        methods: ['now()', 'parse()', 'UTC()']
      },
      'String': {
        type: 'StringConstructor',
        description: 'String objesi oluşturmak için kullanılır.',
        syntax: 'new String() | String.method()',
        examples: [
          'new String("text")',
          'String.fromCharCode(65)'
        ],
        methods: ['fromCharCode()', 'fromCodePoint()', 'raw()']
      },
      'Number': {
        type: 'NumberConstructor', 
        description: 'Number objesi oluşturmak için kullanılır.',
        syntax: 'new Number() | Number.property',
        examples: [
          'Number.MAX_VALUE',
          'Number.parseInt("123")',
          'Number.isNaN(NaN)'
        ],
        methods: ['parseInt()', 'parseFloat()', 'isNaN()', 'isInteger()']
      },
      'Object': {
        type: 'ObjectConstructor',
        description: 'Tüm JavaScript objelerinin temel özelliklerini sağlar.',
        syntax: 'Object.method()',
        examples: [
          'Object.keys(obj)',
          'Object.values(obj)',
          'Object.assign(target, source)'
        ],
        methods: ['keys()', 'values()', 'entries()', 'assign()', 'create()']
      }
    };

    const info = builtins[word];
    if (!info) return null;

    const contents = [
      { value: `**${word}**`, supportHtml: false },
      { value: `*${info.type}*`, supportHtml: false },
      { value: `---`, supportHtml: false },
      { value: info.description, supportHtml: false }
    ];

    if (info.syntax) {
      contents.push({ value: `**Syntax:** \`${info.syntax}\``, supportHtml: false });
    }

    if (info.examples && info.examples.length > 0) {
      contents.push({ value: `**Examples:**`, supportHtml: false });
      info.examples.forEach(example => {
        contents.push({ value: `\`\`\`javascript\n${example}\n\`\`\``, supportHtml: false });
      });
    }

    if (info.methods && info.methods.length > 0) {
      contents.push({ value: `**Common Methods:** ${info.methods.join(', ')}`, supportHtml: false });
    }

    return contents;
  }

  // Kod içinde tanımlanan sembolleri analiz et
  private analyzeCustomSymbol(word: string, lineContent: string, fullCode: string, lineNumber: number): any[] | null {
    const lines = fullCode.split('\n');
    
    // Değişken tanımlaması ara
    const varPattern = new RegExp(`(?:var|let|const)\\s+${word}\\s*=\\s*(.+)`, 'g');
    const funcPattern = new RegExp(`function\\s+${word}\\s*\\(([^)]*)\\)`, 'g');
    const arrowFuncPattern = new RegExp(`(?:const|let|var)\\s+${word}\\s*=\\s*\\(([^)]*)\\)\\s*=>`, 'g');
    
    let foundInfo: any[] = [];

    // Tüm kodda ara
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Değişken tanımlaması
      const varMatch = varPattern.exec(line);
      if (varMatch) {
        const value = varMatch[1].trim();
        const inferredType = this.inferDetailedType(value);
        
        foundInfo = [
          { value: `**${word}** *(variable)*`, supportHtml: false },
          { value: `**Type:** ${inferredType.type}`, supportHtml: false },
          { value: `**Value:** \`${value}\``, supportHtml: false },
          { value: `**Line:** ${i + 1}`, supportHtml: false },
          { value: `---`, supportHtml: false },
          { value: inferredType.description, supportHtml: false }
        ];
        break;
      }
      
      // Fonksiyon tanımlaması
      const funcMatch = funcPattern.exec(line);
      if (funcMatch) {
        const params = funcMatch[1] || '';
        const paramCount = params.trim() ? params.split(',').length : 0;
        
        foundInfo = [
          { value: `**${word}** *(function)*`, supportHtml: false },
          { value: `**Parameters:** ${paramCount} (${params || 'none'})`, supportHtml: false },
          { value: `**Line:** ${i + 1}`, supportHtml: false },
          { value: `---`, supportHtml: false },
          { value: 'User-defined function', supportHtml: false }
        ];
        break;
      }
      
      // Arrow fonksiyon tanımlaması  
      const arrowMatch = arrowFuncPattern.exec(line);
      if (arrowMatch) {
        const params = arrowMatch[1] || '';
        const paramCount = params.trim() ? params.split(',').length : 0;
        
        foundInfo = [
          { value: `**${word}** *(arrow function)*`, supportHtml: false },
          { value: `**Parameters:** ${paramCount} (${params || 'none'})`, supportHtml: false },
          { value: `**Line:** ${i + 1}`, supportHtml: false },
          { value: `---`, supportHtml: false },
          { value: 'User-defined arrow function', supportHtml: false }
        ];
        break;
      }
    }

    // Fonksiyon çağrısı kontrolü
    if (foundInfo.length === 0 && lineContent.includes(`${word}(`)) {
      foundInfo = [
        { value: `**${word}** *(function call)*`, supportHtml: false },
        { value: `**Type:** Function invocation`, supportHtml: false },
        { value: `**Line:** ${lineNumber}`, supportHtml: false },
        { value: `---`, supportHtml: false },
        { value: 'Function being called on this line', supportHtml: false }
      ];
    }

    return foundInfo.length > 0 ? foundInfo : null;
  }

  // Detaylı tip çıkarımı
  private inferDetailedType(value: string): { type: string, description: string } {
    value = value.trim();
    
    if (value.match(/^["'`]/)) {
      return { 
        type: 'string', 
        description: `Text value. Length: ${value.length - 2} characters.`
      };
    }
    
    if (value.match(/^\d+$/)) {
      return { 
        type: 'number (integer)', 
        description: `Whole number value: ${value}`
      };
    }
    
    if (value.match(/^\d*\.\d+$/)) {
      return { 
        type: 'number (float)', 
        description: `Decimal number value: ${value}`
      };
    }
    
    if (value === 'true' || value === 'false') {
      return { 
        type: 'boolean', 
        description: `Boolean value representing ${value}.`
      };
    }
    
    if (value.startsWith('[') && value.endsWith(']')) {
      const items = value.slice(1, -1).split(',').length;
      return { 
        type: 'array', 
        description: `Array with ${items} element(s).`
      };
    }
    
    if (value.startsWith('{') && value.endsWith('}')) {
      const props = value.slice(1, -1).split(',').length;
      return { 
        type: 'object', 
        description: `Object with ${props} property(ies).`
      };
    }
    
    if (value.includes('function') || value.includes('=>')) {
      return { 
        type: 'function', 
        description: 'Function definition.'
      };
    }
    
    if (value === 'null') {
      return { 
        type: 'null', 
        description: 'Null value - intentional absence of value.'
      };
    }
    
    if (value === 'undefined') {
      return { 
        type: 'undefined', 
        description: 'Undefined value - variable declared but not assigned.'
      };
    }
    
    return { 
      type: 'unknown', 
      description: `Complex expression or unrecognized type: ${value.substring(0, 50)}...`
    };
  }

  // Genel kelime bilgisi
  private getGeneralWordInfo(word: string, lineContent: string): any[] | null {
    // JavaScript anahtar kelimeleri
    const keywords: Record<string, string> = {
      'function': 'Function declaration keyword',
      'var': 'Variable declaration (function-scoped)',
      'let': 'Variable declaration (block-scoped)',
      'const': 'Constant declaration (block-scoped)',
      'if': 'Conditional statement',
      'else': 'Alternative condition',
      'for': 'Loop statement',
      'while': 'Loop statement',
      'return': 'Return value from function',
      'true': 'Boolean true value',
      'false': 'Boolean false value',
      'null': 'Null value',
      'undefined': 'Undefined value',
      'typeof': 'Type checking operator',
      'instanceof': 'Instance checking operator',
      'new': 'Object instantiation operator',
      'this': 'Current object reference',
      'class': 'Class declaration keyword',
      'extends': 'Class inheritance keyword',
      'import': 'Module import statement',
      'export': 'Module export statement',
      'async': 'Asynchronous function modifier',
      'await': 'Async operation wait keyword',
      'try': 'Error handling block',
      'catch': 'Error handling block',
      'finally': 'Cleanup block',
      'throw': 'Error throwing statement'
    };

    if (keywords[word]) {
      return [
        { value: `**${word}** *(JavaScript keyword)*`, supportHtml: false },
        { value: `**Type:** Reserved word`, supportHtml: false },
        { value: `---`, supportHtml: false },
        { value: keywords[word], supportHtml: false }
      ];
    }

    return null;
  }

  // HTML hover bilgisi
  getHTMLHoverInfo(word: string, lineContent: string): { contents: any[] } | null {
    const htmlTags: Record<string, { description: string, attributes?: string[], example?: string }> = {
      'div': {
        description: 'Generic container element for styling and layout',
        attributes: ['class', 'id', 'style'],
        example: '<div class="container">Content</div>'
      },
      'span': {
        description: 'Inline generic container element',
        attributes: ['class', 'id', 'style'],
        example: '<span class="highlight">Text</span>'
      },
      'h1': {
        description: 'Main heading element (largest)',
        attributes: ['class', 'id'],
        example: '<h1>Page Title</h1>'
      },
      'p': {
        description: 'Paragraph element for text content',
        attributes: ['class', 'id'],
        example: '<p>This is a paragraph.</p>'
      },
      'a': {
        description: 'Anchor element for links',
        attributes: ['href', 'target', 'class', 'id'],
        example: '<a href="https://example.com">Link</a>'
      },
      'img': {
        description: 'Image element',
        attributes: ['src', 'alt', 'width', 'height'],
        example: '<img src="image.jpg" alt="Description">'
      },
      'button': {
        description: 'Clickable button element',
        attributes: ['type', 'onclick', 'class', 'id'],
        example: '<button onclick="myFunction()">Click me</button>'
      },
      'input': {
        description: 'Input field element',
        attributes: ['type', 'name', 'value', 'placeholder'],
        example: '<input type="text" placeholder="Enter text">'
      }
    };

    const tagInfo = htmlTags[word.toLowerCase()];
    if (tagInfo) {
      const contents = [
        { value: `**<${word}>** *(HTML tag)*`, supportHtml: false },
        { value: `---`, supportHtml: false },
        { value: tagInfo.description, supportHtml: false }
      ];

      if (tagInfo.attributes) {
        contents.push({ value: `**Common attributes:** ${tagInfo.attributes.join(', ')}`, supportHtml: false });
      }

      if (tagInfo.example) {
        contents.push({ value: `**Example:**`, supportHtml: false });
        contents.push({ value: `\`\`\`html\n${tagInfo.example}\n\`\`\``, supportHtml: false });
      }

      return { contents };
    }

    return null;
  }

  // SQL hover bilgisi
  getSQLHoverInfo(word: string, lineContent: string): { contents: any[] } | null {
    const sqlKeywords: Record<string, { description: string, syntax?: string, example?: string }> = {
      'SELECT': {
        description: 'Veritabanından veri sorgulamak için kullanılır',
        syntax: 'SELECT column1, column2 FROM table_name',
        example: 'SELECT name, age FROM users'
      },
      'FROM': {
        description: 'Veri çekileček tabloyu belirtir',
        syntax: 'FROM table_name',
        example: 'FROM users'
      },
      'WHERE': {
        description: 'Koşullu filtreleme için kullanılır',
        syntax: 'WHERE condition',
        example: 'WHERE age > 18'
      },
      'INSERT': {
        description: 'Tabloya yeni veri eklemek için kullanılır',
        syntax: 'INSERT INTO table_name (columns) VALUES (values)',
        example: 'INSERT INTO users (name, age) VALUES (\'John\', 25)'
      },
      'UPDATE': {
        description: 'Mevcut verileri güncellemek için kullanılır',
        syntax: 'UPDATE table_name SET column = value WHERE condition',
        example: 'UPDATE users SET age = 26 WHERE name = \'John\''
      },
      'DELETE': {
        description: 'Verileri silmek için kullanılır',
        syntax: 'DELETE FROM table_name WHERE condition',
        example: 'DELETE FROM users WHERE age < 18'
      },
      'JOIN': {
        description: 'İki veya daha fazla tabloyu birleştirmek için kullanılır',
        syntax: 'JOIN table2 ON table1.column = table2.column',
        example: 'JOIN orders ON users.id = orders.user_id'
      },
      'ORDER': {
        description: 'Sonuçları sıralamak için kullanılır (ORDER BY ile)',
        syntax: 'ORDER BY column_name ASC|DESC',
        example: 'ORDER BY name ASC'
      },
      'GROUP': {
        description: 'Sonuçları gruplamak için kullanılır (GROUP BY ile)',
        syntax: 'GROUP BY column_name',
        example: 'GROUP BY department'
      }
    };

    const keywordInfo = sqlKeywords[word];
    if (keywordInfo) {
      const contents = [
        { value: `**${word}** *(SQL keyword)*`, supportHtml: false },
        { value: `---`, supportHtml: false },
        { value: keywordInfo.description, supportHtml: false }
      ];

      if (keywordInfo.syntax) {
        contents.push({ value: `**Syntax:** \`${keywordInfo.syntax}\``, supportHtml: false });
      }

      if (keywordInfo.example) {
        contents.push({ value: `**Example:**`, supportHtml: false });
        contents.push({ value: `\`\`\`sql\n${keywordInfo.example}\n\`\`\``, supportHtml: false });
      }

      return { contents };
    }

    return null;
  }
} 
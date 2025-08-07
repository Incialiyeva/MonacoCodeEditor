import { Injectable } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface ScriptTemplate {
  name: string;
  description: string;
  code: string;
}

@Injectable({
  providedIn: 'root'
})
export class MonacoEditorFileManagerService {
  private scriptTemplates: ScriptTemplate[] = [
    {
      name: 'onInit',
      description: 'Triggered when the page is first loaded.',
      code: `function onInit() {\n  // Initialize your application here\n  console.log('Application initialized');\n}`
    },
    {
      name: 'onClick',
      description: 'Runs when a button is clicked.',
      code: `function onClick(event) {\n  // Handle button click here\n  console.log('Button clicked:', event);\n}`
    },
    {
      name: 'onSave',
      description: 'Triggered when data is being saved.',
      code: `function onSave(data) {\n  // Handle data saving here\n  console.log('Saving data:', data);\n  return true; // Return true to allow save\n}`
    },
    {
      name: 'SELECT Users',
      description: 'Query to select all users from database.',
      code: `SELECT * FROM users\nWHERE active = 1\nORDER BY created_at DESC;`
    },
    {
      name: 'INSERT Record',
      description: 'Insert a new record into database.',
      code: `INSERT INTO users (name, email, created_at)\nVALUES ('John Doe', 'john@example.com', NOW());`
    },
    {
      name: 'UPDATE Data',
      description: 'Update existing records in database.',
      code: `UPDATE users\nSET last_login = NOW()\nWHERE id = ?;`
    },
    {
      name: 'HTML Form',
      description: 'Basic HTML form structure.',
      code: `<!DOCTYPE html>\n<html>\n<head>\n  <title>Form</title>\n</head>\n<body>\n  <form>\n    <input type="text" placeholder="Name">\n    <button type="submit">Submit</button>\n  </form>\n</body>\n</html>`
    },
    {
      name: 'HTML Table',
      description: 'HTML table structure.',
      code: `<!DOCTYPE html>\n<html>\n<head>\n  <title>Table</title>\n</head>\n<body>\n  <table>\n    <tr>\n      <th>Name</th>\n      <th>Email</th>\n    </tr>\n    <tr>\n      <td>John</td>\n      <td>john@example.com</td>\n    </tr>\n  </table>\n</body>\n</html>`
    },
    {
      name: 'HTML Card',
      description: 'HTML card component.',
      code: `<!DOCTYPE html>\n<html>\n<head>\n  <title>Card</title>\n</head>\n<body>\n  <div class="card">\n    <h3>Card Title</h3>\n    <p>Card content goes here</p>\n    <button>Action</button>\n  </div>\n</body>\n</html>`
    },
    {
      name: 'HTML with Errors',
      description: 'HTML with intentional errors for testing validation.',
      code: `<html>\n<head>\n  <title>Test</title>\n</head>\n<body>\n  <div>\n    <h1>Test</h1>\n    <p>This is a test\n    <div>\n      <span>Nested content</div>\n    </div>\n  </div>\n</body>\n</html>`
    },
    {
      name: 'SQL with Errors',
      description: 'SQL with intentional errors for testing validation.',
      code: `SELECT * FROM users\nWHERE active = 1\nORDER BY created_at DESC`
    },
    {
      name: 'SQL Complex Errors',
      description: 'SQL with multiple intentional errors for comprehensive testing.',
      code: `SELECT * FROM users\nWHERE active\nORDER BY\nGROUP BY name\nINSERT users (name, email)\nUPDATE users\nDELETE users\nCREATE TABLE users\nJOIN orders`
    },
    {
      name: 'Valid SQL Examples',
      description: 'Valid SQL statements for testing.',
      code: `SELECT * FROM users WHERE active = 1;\n\nUPDATE users SET last_login = NOW() WHERE id = 1;\n\nINSERT INTO users (name, email) VALUES ('John', 'john@example.com');`
    },
    {
      name: 'SQL with Typos',
      description: 'SQL with common typos for testing validation.',
      code: `SELEC id, name email\nFORM users\nWHERE active = 'yes'\nAND ORDER BY created_at DESC`
    },
    {
      name: 'Complex SQL Query',
      description: 'Complex SQL query with multiple clauses.',
      code: `SELECT u.id, u.name, u.email, COUNT(o.id) as order_count\nFROM users u\nLEFT JOIN orders o ON u.id = o.user_id\nWHERE u.active = 1\nAND u.created_at > '2023-01-01'\nGROUP BY u.id, u.name, u.email\nHAVING COUNT(o.id) > 0\nORDER BY order_count DESC\nLIMIT 10`
    },
    {
      name: 'SQL with Functions',
      description: 'SQL with various functions and expressions.',
      code: `SELECT \n  id,\n  name,\n  email,\n  CONCAT(first_name, ' ', last_name) as full_name,\n  COUNT(*) as total_orders,\n  SUM(amount) as total_amount,\n  AVG(amount) as avg_amount\nFROM users u\nJOIN orders o ON u.id = o.user_id\nWHERE status = 'active'\nGROUP BY id, name, email, first_name, last_name\nHAVING total_amount > 1000\nORDER BY total_amount DESC`
    }
  ];

  private lastSavedCodeByTab: Record<string, string> = {};
  private originalCodeByTab: Record<string, string> = {};

  constructor() {
    this.initializeSavedCodes();
  }

  get allScriptTemplates(): ScriptTemplate[] {
    return this.scriptTemplates;
  }

  getScriptTemplate(index: number): ScriptTemplate | null {
    return this.scriptTemplates[index] || null;
  }

  updateScriptTemplate(index: number, code: string) {
    if (this.scriptTemplates[index]) {
      this.scriptTemplates[index].code = code;
    }
  }

  // Detect language from file extension and content
  detectLanguageFromFile(file: File): string {
    const fileName = file.name.toLowerCase();
    const extension = fileName.split('.').pop();
    
    // Check file extension first
    switch (extension) {
      case 'html':
      case 'htm':
        return 'html';
      case 'sql':
        return 'sql';
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
      case 'vue':
      case 'php':
      case 'py':
      case 'java':
      case 'cpp':
      case 'c':
      case 'cs':
      case 'rb':
      case 'go':
      case 'rs':
      case 'swift':
      case 'kt':
      case 'scala':
      case 'r':
      case 'm':
      case 'pl':
      case 'sh':
      case 'bat':
      case 'ps1':
        return 'javascript';
      case 'css':
      case 'scss':
      case 'sass':
      case 'less':
        return 'css';
      case 'json':
        return 'json';
      case 'xml':
        return 'xml';
      case 'yml':
      case 'yaml':
        return 'yaml';
      case 'md':
      case 'markdown':
        return 'markdown';
      default:
        // If no specific extension, try to detect from content
        return 'javascript';
    }
  }

  // Enhanced language detection from code content
  detectLanguageFromCode(code: string): string {
    const trimmedCode = code.trim();
    
    // HTML detection
    if (trimmedCode.startsWith('<!DOCTYPE html') || 
        trimmedCode.startsWith('<html') || 
        trimmedCode.includes('<html') ||
        trimmedCode.includes('<!DOCTYPE')) {
      return 'html';
    }
    
    // JavaScript detection first (before SQL to avoid conflicts)
    if (trimmedCode.includes('function') || 
        trimmedCode.includes('=>') ||
        trimmedCode.includes('const ') ||
        trimmedCode.includes('let ') ||
        trimmedCode.includes('var ') ||
        trimmedCode.includes('console.') ||
        trimmedCode.includes('document.') ||
        trimmedCode.includes('.js') ||
        trimmedCode.includes('Array.') ||
        trimmedCode.includes('Math.') ||
        trimmedCode.includes('JSON.') ||
        trimmedCode.includes('class ') ||
        trimmedCode.includes('import ') ||
        trimmedCode.includes('export ') ||
        trimmedCode.includes('async ') ||
        trimmedCode.includes('await ') ||
        trimmedCode.includes('typeof ') ||
        trimmedCode.includes('instanceof ')) {
      return 'javascript';
    }
    
    // SQL detection - daha spesifik kontroller
    const codeLines = trimmedCode.toLowerCase().split('\n');
    const sqlKeywords = ['select', 'insert', 'update', 'delete', 'create', 'drop', 'alter'];
    let sqlLineCount = 0;
    
    for (const line of codeLines) {
      const cleanLine = line.trim();
      // SQL satırı kontrolü - sadece satır başında SQL keyword varsa
      if (sqlKeywords.some(keyword => 
        cleanLine.startsWith(keyword + ' ') || 
        cleanLine.startsWith(keyword + '\t') ||
        cleanLine === keyword
      )) {
        sqlLineCount++;
      }
    }
    
    // En az 1 SQL satırı varsa ve JavaScript belirtileri yoksa SQL
    if (sqlLineCount > 0 && 
        !trimmedCode.includes('function') && 
        !trimmedCode.includes('=>') &&
        !trimmedCode.includes('const ') &&
        !trimmedCode.includes('let ') &&
        !trimmedCode.includes('var ') &&
        !trimmedCode.includes('console.') &&
        !trimmedCode.includes('Array.') &&
        !trimmedCode.includes('.js')) {
      return 'sql';
    }
    
    // CSS detection
    if (trimmedCode.includes('{') && trimmedCode.includes('}') && 
        (trimmedCode.includes('color:') || trimmedCode.includes('background:') || 
         trimmedCode.includes('font-size:') || trimmedCode.includes('margin:') ||
         trimmedCode.includes('padding:') || trimmedCode.includes('border:'))) {
      return 'css';
    }
    
    // JSON detection
    if ((trimmedCode.startsWith('{') && trimmedCode.endsWith('}')) ||
        (trimmedCode.startsWith('[') && trimmedCode.endsWith(']'))) {
      try {
        JSON.parse(trimmedCode);
        return 'json';
      } catch (e) {
        // Not valid JSON, continue to other checks
      }
    }
    
    // YAML detection
    if (trimmedCode.includes(':') && 
        (trimmedCode.includes('version:') || trimmedCode.includes('name:') || 
         trimmedCode.includes('description:') || trimmedCode.includes('dependencies:'))) {
      return 'yaml';
    }
    
    // Markdown detection
    if (trimmedCode.startsWith('#') || 
        trimmedCode.includes('##') || 
        trimmedCode.includes('**') || 
        trimmedCode.includes('*') ||
        trimmedCode.includes('[') && trimmedCode.includes('](')) {
      return 'markdown';
    }
    
    // Default to JavaScript
    return 'javascript';
  }

  // Save management
  saveOriginalCode(tabKey: string, code: string) {
    if (!this.originalCodeByTab[tabKey]) {
      this.originalCodeByTab[tabKey] = code;
    }
  }

  getOriginalCode(tabKey: string): string {
    return this.originalCodeByTab[tabKey] || '';
  }

  saveLastCode(tabKey: string, code: string) {
    this.lastSavedCodeByTab[tabKey] = code;
  }

  getLastSavedCode(tabKey: string): string {
    return this.lastSavedCodeByTab[tabKey] || '';
  }

  getTabKey(tab: any): string {
    return `${tab.lang}_${tab.idx}`;
  }

  // Download functionality
  downloadFile(code: string, language: string, filename: string) {
    if (!isPlatformBrowser) return;

    // Get file extension based on language
    let extension = 'js';
    let mimeType = 'text/javascript';
    
    switch (language) {
      case 'html':
        extension = 'html';
        mimeType = 'text/html';
        break;
      case 'sql':
        extension = 'sql';
        mimeType = 'text/sql';
        break;
      case 'javascript':
      default:
        extension = 'js';
        mimeType = 'text/javascript';
        break;
    }
    
    // Create filename with script name
    const finalFilename = `${filename.replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`;
    
    // Create blob and download
    const blob = new Blob([code], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    console.log(`File downloaded: ${finalFilename}`);
  }

  // Download all open tabs as ZIP
  async downloadAsZip(tabs: any[], filename: string = 'monaco_editor_files') {
    if (!isPlatformBrowser) return;

    try {
      // Import JSZip dynamically
      const JSZip = await import('jszip');
      const zip = new JSZip.default();
      
      // Add all tabs
      tabs.forEach((tab, index) => {
        const language = this.detectLanguageFromCode(tab.code);
        let extension = 'js';
        switch (language) {
          case 'html':
            extension = 'html';
            break;
          case 'sql':
            extension = 'sql';
            break;
          case 'javascript':
          default:
            extension = 'js';
            break;
        }
        
        const tabFilename = `${tab.name.replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`;
        zip.file(tabFilename, tab.code);
      });
      
      // Generate and download ZIP
      const content: Blob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('ZIP file downloaded:', `${filename}.zip`);
    } catch (error) {
      console.error('Error creating ZIP:', error);
      throw new Error('ZIP oluşturulurken hata oluştu. Lütfen tekrar deneyin.');
    }
  }

  // Open in Live Server functionality
  openInLiveServer(code: string, language: string) {
    if (!isPlatformBrowser) return;

    console.log('Detected language:', language);
    console.log('Code preview:', code.substring(0, 100));
    
    if (language === 'html') {
      // HTML içeriğini blob olarak oluştur
      const blob = new Blob([code], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      
      // Yeni sekmede aç
      window.open(url, '_blank');
      
      console.log('HTML opened in new tab');
    } else {
      throw new Error('Live Server sadece HTML dosyaları için kullanılabilir!');
    }
  }

  private initializeSavedCodes() {
    this.scriptTemplates.forEach((script, index) => {
      const scriptKey = `script_${index}`;
      this.lastSavedCodeByTab[scriptKey] = script.code;
      this.originalCodeByTab[scriptKey] = script.code;
    });
  }
} 
/**
 * SQL Validation Utilities
 * Provides validation functions for SQL code
 */

import { ValidationResult } from './html-validation.util';

/**
 * Validates SQL code for common syntax errors
 * @param code - The SQL code to validate
 * @returns ValidationResult with validation status and errors
 */
export function validateSQL(code: string): ValidationResult {
  const errors: string[] = [];
  const lines = code.split('\n');
  let lineNumber = 0;

  // Önce temizlik yap - boş satırları ve yorumları filtrele
  const cleanCode = code
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('--'))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  const lowerCleanCode = cleanCode.toLowerCase();

  // Eğer hiç SQL keyword yoksa, validation yapma
  const sqlKeywords = ['select', 'from', 'where', 'insert', 'update', 'delete', 'create', 'drop'];
  const foundKeywords = sqlKeywords.filter(keyword => lowerCleanCode.includes(keyword));
  
  if (foundKeywords.length === 0) {
    return { isValid: true, errors: [] };
  }

  // Satır bazlı kontroller (daha gevşek)
  lines.forEach((line, index) => {
    lineNumber = index + 1;
    const trimmedLine = line.trim();
    
    // Boş satır veya yorum satırını atla
    if (!trimmedLine || trimmedLine.startsWith('--')) {
      return;
    }

    const lowerLine = trimmedLine.toLowerCase();

    // ✅ Sadece açık yazım hatalarını yakala
    if (lowerLine.includes('selec ') && !lowerLine.includes('select')) {
      errors.push(`Typo: 'SELEC' should be 'SELECT' at line ${lineNumber}`);
    }
    if (lowerLine.includes('form ') && !lowerLine.includes('from')) {
      errors.push(`Typo: 'FORM' should be 'FROM' at line ${lineNumber}`);
    }
    if (lowerLine.includes('wher ') && !lowerLine.includes('where')) {
      errors.push(`Typo: 'WHER' should be 'WHERE' at line ${lineNumber}`);
    }
  });

  // Global parantez kontrolü (tüm kod için)
  const totalOpenParens = (cleanCode.match(/\(/g) || []).length;
  const totalCloseParens = (cleanCode.match(/\)/g) || []).length;
  if (totalOpenParens !== totalCloseParens) {
    errors.push(`Mismatched parentheses in SQL code`);
  }

  // Statement bazlı kontroller (çok daha gevşek)
  const statements = cleanCode.split(';').filter(stmt => stmt.trim());
  statements.forEach((stmt, idx) => {
    const lowerStmt = stmt.toLowerCase().trim();
    
    // SELECT kontrolü - sadece FROM yoksa hata ver
    if (lowerStmt.startsWith('select') && !lowerStmt.includes('from')) {
      // Ama basit case'leri kabul et: SELECT 1, SELECT NOW() vs.
      if (!lowerStmt.match(/^select\s+[\d\w()]+\s*$/)) {
        errors.push(`SELECT statement usually requires FROM clause (statement ${idx + 1})`);
      }
    }
    
    // INSERT kontrolü - VALUES veya SELECT olmalı
    if (lowerStmt.startsWith('insert into')) {
      if (!lowerStmt.includes('values') && !lowerStmt.includes('select')) {
        errors.push(`INSERT statement requires VALUES or SELECT subquery (statement ${idx + 1})`);
      }
    }
    
    // UPDATE kontrolü - SET olmalı
    if (lowerStmt.startsWith('update') && !lowerStmt.includes('set')) {
      errors.push(`UPDATE statement requires SET clause (statement ${idx + 1})`);
    }
    
    // DELETE kontrolü - FROM olmalı
    if (lowerStmt.startsWith('delete') && !lowerStmt.includes('from')) {
      errors.push(`DELETE statement requires FROM clause (statement ${idx + 1})`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
} 
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
  
  // SQL syntax kontrolü
  const lines = code.split('\n');
  lines.forEach((line, lineIndex) => {
    const trimmedLine = line.trim().toLowerCase();
    
    // SELECT statement kontrolü
    if (trimmedLine.startsWith('select') && !trimmedLine.includes('from')) {
      errors.push(`Missing FROM clause at line ${lineIndex + 1}`);
    }
    
    // INSERT statement kontrolü
    if (trimmedLine.startsWith('insert') && !trimmedLine.includes('values')) {
      errors.push(`Missing VALUES clause at line ${lineIndex + 1}`);
    }
    
    // UPDATE statement kontrolü
    if (trimmedLine.startsWith('update') && !trimmedLine.includes('set')) {
      errors.push(`Missing SET clause at line ${lineIndex + 1}`);
    }
    
    // DELETE statement kontrolü
    if (trimmedLine.startsWith('delete') && !trimmedLine.includes('from')) {
      errors.push(`Missing FROM clause at line ${lineIndex + 1}`);
    }
    
    // WHERE clause kontrolü
    if (trimmedLine.includes('where') && !trimmedLine.includes('=') && !trimmedLine.includes('like') && !trimmedLine.includes('in')) {
      errors.push(`Incomplete WHERE clause at line ${lineIndex + 1}`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
} 
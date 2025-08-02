/**
 * HTML Validation Utilities
 * Provides validation functions for HTML code
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates HTML code for common errors
 * @param code - The HTML code to validate
 * @returns ValidationResult with validation status and errors
 */
export function validateHTML(code: string): ValidationResult {
  const errors: string[] = [];
  
  // Basit HTML validation
  const openTags = code.match(/<([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g) || [];
  const closeTags = code.match(/<\/([a-zA-Z][a-zA-Z0-9]*)>/g) || [];
  
  const tagStack: string[] = [];
  const tagPositions: { tag: string; line: number; column: number }[] = [];
  
  // Self-closing tags
  const selfClosingTags = ['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'keygen', 'param', 'source', 'track', 'wbr'];
  
  // Her satırı kontrol et
  const lines = code.split('\n');
  lines.forEach((line, lineIndex) => {
    const openTagMatches = line.match(/<([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g);
    const closeTagMatches = line.match(/<\/([a-zA-Z][a-zA-Z0-9]*)>/g);
    
    if (openTagMatches) {
      openTagMatches.forEach(tag => {
        const tagName = tag.match(/<([a-zA-Z][a-zA-Z0-9]*)/)?.[1];
        if (tagName && !selfClosingTags.includes(tagName.toLowerCase())) {
          tagStack.push(tagName.toLowerCase());
          tagPositions.push({ tag: tagName.toLowerCase(), line: lineIndex + 1, column: line.indexOf(tag) + 1 });
        }
      });
    }
    
    if (closeTagMatches) {
      closeTagMatches.forEach(tag => {
        const tagName = tag.match(/<\/([a-zA-Z][a-zA-Z0-9]*)/)?.[1];
        if (tagName) {
          const expectedTag = tagStack.pop();
          if (expectedTag !== tagName.toLowerCase()) {
            errors.push(`Mismatched tag: expected </${expectedTag}> but found </${tagName}> at line ${lineIndex + 1}`);
          }
        }
      });
    }
  });
  
  if (tagStack.length > 0) {
    errors.push(`Unclosed tags: ${tagStack.join(', ')}`);
  }
  
  // DOCTYPE kontrolü
  if (code.includes('<html') && !code.includes('<!DOCTYPE')) {
    errors.push('Missing DOCTYPE declaration');
  }
  
  // Kapanmayan tag'ları kontrol et
  const unclosedPatterns = [
    { pattern: /<p[^>]*>(?!.*<\/p>)/g, message: 'Unclosed <p> tag' },
    { pattern: /<div[^>]*>(?!.*<\/div>)/g, message: 'Unclosed <div> tag' },
    { pattern: /<span[^>]*>(?!.*<\/span>)/g, message: 'Unclosed <span> tag' },
    { pattern: /<h[1-6][^>]*>(?!.*<\/h[1-6]>)/g, message: 'Unclosed heading tag' }
  ];
  
  unclosedPatterns.forEach(({ pattern, message }) => {
    if (pattern.test(code)) {
      errors.push(message);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
} 
import { Injectable } from '@angular/core';

// VS Code HTML Language Service types
declare const require: any;

export interface HTMLDiagnostic {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  severity: number;
  message: string;
  code?: string | number;
  source?: string;
}

@Injectable({
  providedIn: 'root'
})
export class HTMLLanguageService {
  private htmlLanguageService: any = null;
  private isInitialized = false;

  constructor() {
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    try {
      // Dinamik import ile VS Code HTML Language Service'i yükle
      const { getLanguageService } = await import('vscode-html-languageservice');
      
      this.htmlLanguageService = getLanguageService();
      this.isInitialized = true;
      console.log('VS Code HTML Language Service initialized');
    } catch (error) {
      console.warn('VS Code HTML Language Service not available, using fallback');
      this.isInitialized = false;
    }
  }

  async validateHTML(htmlCode: string): Promise<HTMLDiagnostic[]> {
    if (!this.isInitialized) {
      await this.initializeService();
      if (!this.isInitialized) {
        return this.fallbackValidation(htmlCode);
      }
    }

    try {
      // VS Code format document oluştur
      const document = {
        uri: 'file:///temp.html',
        languageId: 'html',
        version: 1,
        getText: () => htmlCode,
        positionAt: (offset: number) => this.offsetToPosition(htmlCode, offset),
        offsetAt: (position: { line: number; character: number }) => this.positionToOffset(htmlCode, position)
      };

      // HTML parse et
      const htmlDocument = this.htmlLanguageService.parseHTMLDocument(document);
      
      // Diagnostics al
      const diagnostics = await this.htmlLanguageService.doValidation(document, htmlDocument);
      
      return diagnostics.map((diagnostic: any) => ({
        range: diagnostic.range,
        severity: diagnostic.severity,
        message: diagnostic.message,
        code: diagnostic.code,
        source: diagnostic.source || 'html'
      }));

    } catch (error) {
      console.error('HTML validation error:', error);
      return this.fallbackValidation(htmlCode);
    }
  }

  private fallbackValidation(htmlCode: string): HTMLDiagnostic[] {
    // Fallback olarak basit validation
    const diagnostics: HTMLDiagnostic[] = [];
    const lines = htmlCode.split('\n');

    lines.forEach((line, lineIndex) => {
      // Basit tag eşleştirmesi
      const openTags = line.match(/<([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g);
      const closeTags = line.match(/<\/([a-zA-Z][a-zA-Z0-9]*)>/g);

      if (openTags) {
        openTags.forEach(tag => {
          const tagName = tag.match(/<([a-zA-Z][a-zA-Z0-9]*)/)?.[1];
          if (tagName && !this.isSelfClosingTag(tagName)) {
            const columnIndex = line.indexOf(tag);
            diagnostics.push({
              range: {
                start: { line: lineIndex, character: columnIndex },
                end: { line: lineIndex, character: columnIndex + tag.length }
              },
              severity: 2, // Warning
              message: `Ensure tag '${tagName}' is properly closed`,
              source: 'html-fallback'
            });
          }
        });
      }
    });

    return diagnostics;
  }

  private isSelfClosingTag(tagName: string): boolean {
    const selfClosingTags = [
      'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
      'link', 'meta', 'param', 'source', 'track', 'wbr'
    ];
    return selfClosingTags.includes(tagName.toLowerCase());
  }

  private offsetToPosition(text: string, offset: number): { line: number; character: number } {
    const lines = text.substr(0, offset).split('\n');
    return {
      line: lines.length - 1,
      character: lines[lines.length - 1].length
    };
  }

  private positionToOffset(text: string, position: { line: number; character: number }): number {
    const lines = text.split('\n');
    let offset = 0;
    
    for (let i = 0; i < position.line && i < lines.length; i++) {
      offset += lines[i].length + 1; // +1 for newline
    }
    
    return offset + Math.min(position.character, lines[position.line]?.length || 0);
  }

  async getCompletions(htmlCode: string, position: { line: number; character: number }): Promise<any[]> {
    if (!this.isInitialized) {
      return [];
    }

    try {
      const document = {
        uri: 'file:///temp.html',
        languageId: 'html',
        version: 1,
        getText: () => htmlCode,
        positionAt: (offset: number) => this.offsetToPosition(htmlCode, offset),
        offsetAt: (position: { line: number; character: number }) => this.positionToOffset(htmlCode, position)
      };

      const htmlDocument = this.htmlLanguageService.parseHTMLDocument(document);
      const completions = await this.htmlLanguageService.doComplete(document, position, htmlDocument);
      
      return completions.items || [];
    } catch (error) {
      console.error('HTML completion error:', error);
      return [];
    }
  }

  async getHover(htmlCode: string, position: { line: number; character: number }): Promise<any> {
    if (!this.isInitialized) {
      return null;
    }

    try {
      const document = {
        uri: 'file:///temp.html',
        languageId: 'html',
        version: 1,
        getText: () => htmlCode,
        positionAt: (offset: number) => this.offsetToPosition(htmlCode, offset),
        offsetAt: (position: { line: number; character: number }) => this.positionToOffset(htmlCode, position)
      };

      const htmlDocument = this.htmlLanguageService.parseHTMLDocument(document);
      return await this.htmlLanguageService.doHover(document, position, htmlDocument);
    } catch (error) {
      console.error('HTML hover error:', error);
      return null;
    }
  }
} 
import * as prettier from 'prettier/standalone';
import * as parserBabel from 'prettier/plugins/babel';
import * as parserEstree from 'prettier/plugins/estree';
import * as parserHtml from 'prettier/plugins/html';

export async function formatWithPrettier(code: string, language?: string): Promise<string> {
  try {
    const baseOptions = {
      tabWidth: 2,
      singleQuote: true,
      printWidth: 80,
      useTabs: false,
      semi: true,
      trailingComma: 'es5' as const,
      bracketSpacing: true,
      arrowParens: 'avoid' as const,
      endOfLine: 'lf' as const
    };

    if (language === 'html') {
      return await prettier.format(code, {
        parser: 'html',
        plugins: [parserHtml],
        ...baseOptions,
        htmlWhitespaceSensitivity: 'css' as const,
        singleQuote: false
      });
    } else if (language === 'sql') {
      // SQL için basit formatlama
      return code
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');
    } else {
      // JavaScript/TypeScript için
      return await prettier.format(code, {
        parser: 'babel',
        plugins: [parserBabel, parserEstree],
        ...baseOptions
      });
    }
  } catch (error) {
    console.error('Prettier formatting error:', error);
    return code; // Hata durumunda orijinal kodu döndür
  }
} 
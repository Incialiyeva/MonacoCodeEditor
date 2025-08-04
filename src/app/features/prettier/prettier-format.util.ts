import * as prettier from 'prettier/standalone';
import * as parserBabel from 'prettier/plugins/babel';
import * as parserEstree from 'prettier/plugins/estree';
import * as parserHtml from 'prettier/plugins/html';

export async function formatWithPrettier(code: string, language?: string): Promise<string> {
  if (language === 'html') {
    return await prettier.format(code, {
      parser: 'html',
      plugins: [parserHtml],
      tabWidth: 2,
      singleQuote: false,
      printWidth: 80,
      useTabs: false,
      semi: false,
      quoteProps: 'as-needed',
      jsxSingleQuote: false,
      trailingComma: 'none',
      bracketSpacing: false,
      bracketSameLine: false,
      arrowParens: 'avoid',
      endOfLine: 'lf',
      htmlWhitespaceSensitivity: 'strict',
      vueIndentScriptAndStyle: false,
      preserveTrailingComma: false
    });
  } else {
    return await prettier.format(code, {
      parser: 'babel',
      plugins: [parserBabel, parserEstree],
      singleQuote: true
    });
  }
} 
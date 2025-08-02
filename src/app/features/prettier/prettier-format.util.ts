import * as prettier from 'prettier/standalone';
import * as parserBabel from 'prettier/plugins/babel';
import * as parserEstree from 'prettier/plugins/estree';

export async function formatWithPrettier(code: string): Promise<string> {
  return await prettier.format(code, {
    parser: 'babel',
    plugins: [parserBabel, parserEstree],
    singleQuote: true
  });
} 
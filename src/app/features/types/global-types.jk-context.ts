/**
 * JK Context Types Module
 * this, s, recordService ve diğer context nesneleri
 */

export const jkContextTypes = {
  content: `
declare global {
  // Ana context nesnesi
  var this: JKContext;
  var s: JKContext;
  var context: JKContext;
  var ctx: JKContext;
  var self: JKContext;
  
  // Record service global değişkeni
  var recordService: JKContext['recordService'];
  
  // Form global değişkeni
  var form: JKContext['form'];
  
  // Dialog global değişkeni
  var dialog: JKContext['dialog'];
  
  // Navigation global değişkeni
  var navigation: JKContext['navigation'];
  
  // Page global değişkeni
  var page: JKContext['page'];
  
  // Utils global değişkeni
  var utils: JKContext['utils'];
  
  // HTTP global değişkeni
  var http: JKContext['http'];
  
  // Storage global değişkeni
  var storage: JKContext['storage'];
  
  // Events global değişkeni
  var events: JKContext['events'];
}

export {};
`,
  targetFileSrc: 'global-types.jk-context.d.ts'
}; 
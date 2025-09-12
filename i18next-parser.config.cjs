module.exports = {
  context: __dirname,
  createOldCatalogs: false,
  defaultNamespace: 'translation',
  defaultValue: '',
  indentation: 2,
  keepRemoved: false,
  keySeparator: '.',
  lexers: {
    js: ['JavascriptLexer'],
    ts: ['JavascriptLexer'],
    jsx: ['JsxLexer'],
    tsx: ['JsxLexer'],
    default: ['JavascriptLexer']
  },
  lineEnding: 'auto',
  locales: ['en', 'es', 'ar', 'de', 'fr', 'it', 'ja', 'ko', 'pt', 'ru', 'zh'],
  namespaceSeparator: ':',
  output: 'locales/$LOCALE/$NAMESPACE.json',
  input: ['src/**/*.{js,jsx,ts,tsx}'],
  sort: true,
  verbose: false,
  failOnWarnings: false,
  failOnUpdate: false,
  customValueTemplate: null,
  resetDefaultValueLocale: null,
  i18nextOptions: null
};
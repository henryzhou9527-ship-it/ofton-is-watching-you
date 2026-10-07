const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');
const source = path.resolve(__dirname, '../shared/media-sources.ts');
const loaded = new Module(source, module);
loaded._compile(ts.transpileModule(fs.readFileSync(source, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, source);
fs.writeFileSync(path.resolve(__dirname, '../companions/windows/media-sources.json'), JSON.stringify(loaded.exports.MEDIA_SOURCES, null, 2) + '\n');

const fs = require('node:fs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(result.outputText, filename);
};

const { createNicknameHandlers } = require('../server/dashboard/core/routes/site-nickname.ts');
const { setPlatformDatabase } = require('../server/dashboard/core/storage.ts');
const { siteNicknameHandlers } = require('../server/dashboard/core/routes/site-nickname.ts');
const { readSiteNickname, writeSiteNickname } = require('../server/dashboard/core/services/site-nickname.ts');
const { handleConfig } = require('../server/dashboard/core/routes/config.ts');
const { PgDialect } = require('drizzle-orm/pg-core');

const makeRequest = (body, authorized = true) => new Request('https://example.test/api/site-nickname', {
  method: 'POST', headers: authorized ? { Authorization: 'Bearer test-device' } : {},
  body: JSON.stringify(body),
});

test('anonymous and invalid-device changes never reach persistence', async () => {
  const handlers = createNicknameHandlers({
    authenticate: () => false,
    read: () => { throw Error('must not read'); },
    write: () => { throw Error('must not write'); },
    defaultName: () => '我',
  });
  assert.equal((await handlers.post(makeRequest({ displayName: '陌生人' }, false))).status, 401);
  assert.equal((await handlers.get(new Request('https://example.test/api/site-nickname'))).status, 401);
  assert.equal((await siteNicknameHandlers.post(makeRequest({ displayName: '陌生人' })) ).status, 401);
});

test('nickname validation rejects malformed payloads and preserves Unicode names', async () => {
  let saved = null;
  const handlers = createNicknameHandlers({
    authenticate: header => header === 'Bearer test-device',
    read: async () => saved, write: async name => { saved = name; }, defaultName: () => '我',
  });
  for (const body of [null, [], {}, { displayName: 3 }, { displayName: '   ' }, { displayName: 'a\nb' }, { displayName: '猫'.repeat(25) }]) {
    assert.equal((await handlers.post(makeRequest(body))).status, 400);
  }
  const response = await handlers.post(makeRequest({ displayName: `  ${'🐟'.repeat(24)}  ` }));
  assert.equal(response.status, 200);
  assert.equal(saved, '🐟'.repeat(24));
  const read = await handlers.get(new Request('https://example.test/api/site-nickname', { headers: { Authorization: 'Bearer test-device' } }));
  assert.equal((await read.json()).displayName, saved);
});

test('database-backed nickname reaches public config and survives a new handler instance', async () => {
  const database = new Map();
  const dialect = new PgDialect();
  setPlatformDatabase({ execute: async statement => {
    const query = dialect.sqlToQuery(statement);
    if (query.sql.includes('INSERT INTO site_preferences')) {
      database.set(query.params[0], query.params[1]);
      return { rows: [], rowCount: 1 };
    }
    assert.match(query.sql, /SELECT value FROM site_preferences/);
    const value = database.get(query.params[0]);
    return { rows: value === undefined ? [] : [{ value }], rowCount: 0 };
  } });
  let config = await (await handleConfig()).json();
  assert.equal(config.nicknameConfigured, false);
  const dependencies = { authenticate: () => true, read: readSiteNickname, write: writeSiteNickname, defaultName: () => '我' };
  const name = "小鱼'); DROP TABLE activities;--".slice(0, 24);
  assert.equal((await createNicknameHandlers(dependencies).post(makeRequest({ displayName: name }))).status, 200);
  config = await (await handleConfig()).json();
  assert.equal(config.displayName, name);
  assert.equal(config.nicknameConfigured, true);
  assert.equal((await (await createNicknameHandlers(dependencies).get(new Request('https://example.test'))).json()).displayName, name);
});

'use strict';
// Run the actual generator against a disposable site; never modify published artifacts.
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
let pass = 0, fail = 0;
function check(name, yes) { if (yes) pass++; else { fail++; console.error('FAIL ' + name); } }
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nj-property-build-audit-'));
function fixture(name, response, dry) {
  const dir = path.join(root, name);
  fs.mkdirSync(path.join(dir, 'build'), { recursive: true });
  for (const f of ['build/properties.js', 'landmeta.js', 'landvocab.js', 'land.html']) fs.copyFileSync(path.join(__dirname, f), path.join(dir, f));
  if (process.env.NJ_PROPERTY_GENERATOR) fs.copyFileSync(process.env.NJ_PROPERTY_GENERATOR, path.join(dir, 'build', 'properties.js'));
  const old = path.join(dir, 'properties', 'land', 'test', 'OP-999', 'index.html');
  fs.mkdirSync(path.dirname(old), { recursive: true }); fs.writeFileSync(old, 'WITHDRAWN_PROPERTY');
  fs.mkdirSync(path.join(dir, 'p')); fs.writeFileSync(path.join(dir, 'p', 'OP-999.html'), 'OLD_REDIRECT');
  fs.writeFileSync(path.join(dir, 'mock.cjs'), 'const data = ' + JSON.stringify(response) + ';\nglobal.fetch = async () => (data.ok === false ? {ok:false,status:503} : {ok:true,json:async()=>data});\nrequire("./build/properties.js");');
  const r = cp.spawnSync(process.execPath, [path.join(dir, 'mock.cjs')].concat(dry ? ['--dry-run'] : []), { encoding: 'utf8', timeout: 10000 });
  if (r.error || r.stderr) console.error(name, r.error || r.stderr);
  return { r, old, dir };
}
const empty = fixture('empty', { listings: [], count: 0 });
check('authoritative empty inventory builds successfully', empty.r.status === 0);
check('last withdrawn property page is removed', !fs.existsSync(empty.old));
check('withdrawn redirect is removed', !fs.existsSync(path.join(empty.dir, 'p', 'OP-999.html')));
const map = path.join(empty.dir, 'sitemaps', 'properties.xml');
check('empty sitemap no longer advertises withdrawn property', fs.existsSync(map) && !fs.readFileSync(map, 'utf8').includes('<loc>'));
for (const [name, payload] of [['http-error', {ok:false}], ['bad-schema', {}], ['inconsistent', {listings:[],count:1}], ['partial', {listings:[],count:0,paging:{total:3}}]]) {
  const x = fixture(name, payload);
  check(name + ' fails without deleting existing pages', x.r.status === 1 && !x.r.stderr && fs.readFileSync(x.old, 'utf8') === 'WITHDRAWN_PROPERTY');
}
const dry = fixture('dry', {listings:[],count:0}, true);
check('dry-run preserves existing property', dry.r.status === 0 && fs.existsSync(dry.old));
// The directory is created by this test under os.tmpdir(), checked before recursive cleanup.
if (path.dirname(root) !== path.resolve(os.tmpdir()) || !path.basename(root).startsWith('nj-property-build-audit-')) throw new Error('Unsafe cleanup path');
fs.rmSync(root, {recursive:true,force:true});
console.log('property-build: pass ' + pass + ' fail ' + fail);
process.exitCode = fail ? 1 : 0;

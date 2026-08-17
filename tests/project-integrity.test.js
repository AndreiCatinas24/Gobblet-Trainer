'use strict';

const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(ROOT,relative),'utf8');

function test(name,fn){
  try{fn();console.log(`ok - ${name}`);}
  catch(error){console.error(`not ok - ${name}`);throw error;}
}

function walk(directory){
  return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
    const absolute=path.join(directory,entry.name);
    if(entry.isDirectory())return entry.name==='snapshots'?[]:walk(absolute);
    return[absolute];
  });
}

function gitBlobSha(buffer){
  const header=Buffer.from(`blob ${buffer.length}\0`);
  return crypto.createHash('sha1').update(header).update(buffer).digest('hex');
}

test('sursele active sunt UTF-8 fara mojibake',()=>{
  const textExtensions=new Set(['.css','.html','.js','.json','.md','.svg','.txt']);
  const suspicious=/(?:\u00c3|\u00c4|\u00c8|\u00e2\u20ac|\u00e2\u2020|\u00e2\u0153)/;
  const failures=[];
  for(const absolute of walk(ROOT)){
    if(!textExtensions.has(path.extname(absolute)))continue;
    const content=fs.readFileSync(absolute,'utf8');
    if(suspicious.test(content))failures.push(path.relative(ROOT,absolute));
  }
  assert.deepEqual(failures,[]);
  assert.equal(fs.existsSync(path.join(ROOT,'assets','encoding-fix.js')),false);
});

test('pagina canonica incarca motorul in ordinea corecta si toate resursele exista',()=>{
  const html=read('index.html');
  const engine=html.indexOf('assets/regula-strigoi-1.js');
  const ui=html.indexOf('assets/apple.js');
  assert.ok(engine>=0&&ui>engine);
  assert.equal(html.includes('encoding-fix.js'),false);
  for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){
    const target=match[1].split('?')[0];
    if(/^(?:https?:|#|\.\/)/.test(target))continue;
    assert.ok(fs.existsSync(path.join(ROOT,target)),`Resursa lipseste: ${target}`);
  }
});

test('piesele pot fi folosite corect cu touch mouse si tastatura',()=>{
  const ui=read('assets/apple.js');
  const css=read('assets/regula-strigoi-1.css');
  assert.ok(ui.includes("if(piece.color==='b'&&!selected)selectBoard(index);else playTo(index);"));
  assert.ok(ui.includes("' board-defense-option'"));
  assert.ok(ui.includes("node.setAttribute('role','button')"));
  assert.ok(ui.includes('node.tabIndex=0'));
  assert.ok(ui.includes("event.key==='Enter'||event.key===' '"));
  assert.ok(css.includes('.cell.vulnerable-b,.cell.vulnerable-o'));
  assert.ok(css.includes('rgba(255,54,54,.94)'));
  assert.ok(css.includes('content:"MUTĂ"'));
});

test('toate regulile speciale sunt scrise in pagina',()=>{
  const html=read('index.html');
  assert.equal((html.match(/<li>/g)||[]).length,14);
  for(const phrase of[
    '6 piese: 2 mici, 2 medii și 2 mari',
    'nu câștigă instant',
    'evidențiată cu roșu',
    'din rezervă sau mutată de pe tablă',
    'inclusiv peste una de aceeași culoare',
    'exact următoarea sa tură',
    'piesă suficient de mare luată din rezervă sau mutată de pe tablă',
    'aceeași mutare trebuie să le rupă pe toate',
    'ea este ridicată mai întâi',
    'adversarul câștigă imediat',
    'nu victorie instant'
  ])assert.ok(html.includes(phrase),`Regula lipseste: ${phrase}`);
});

test('Vercel serveste index ca pagina canonica si redirectioneaza ruta veche',()=>{
  const config=JSON.parse(read('vercel.json'));
  assert.equal(config.rewrites,undefined);
  assert.ok(config.redirects.some(rule=>rule.source==='/apple.html'&&rule.destination==='/'&&rule.permanent===true));
});

test('snapshot-urile coincid cu SHA-urile din manifest',()=>{
  const manifest=JSON.parse(read('rulesets/regula_strigoi_1.json'));
  for(const item of manifest.snapshots){
    const bytes=fs.readFileSync(path.join(ROOT,item.snapshot));
    const normalized=Buffer.from(bytes.toString('utf8').replace(/\r\n/g,'\n'));
    assert.equal(gitBlobSha(normalized),item.blob_sha,`Snapshot modificat: ${item.snapshot}`);
  }
  assert.ok(manifest.ruleset_specific_files.includes('tests/project-integrity.test.js'));
});

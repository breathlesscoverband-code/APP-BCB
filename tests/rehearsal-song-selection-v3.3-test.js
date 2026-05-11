
const assert = require('assert');

function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
function unique(arr){return [...new Set(arr)];}
let db = {repertoire:[
  {id:1,title:'Insurrección'},
  {id:2,title:'Zombie'},
  {id:3,title:'Wicked Game'},
  {id:4,title:'Ticket To Ride'},
  {id:5,title:'Stand By Me'}
]};
function parseSongIds(value){
  if(Array.isArray(value)){
    return unique(value.map(x=>Number(x)).filter(n=>Number.isFinite(n) && n>0));
  }
  const raw=String(value||'').trim();
  if(!raw) return [];
  if(norm(raw).includes('todos')) return [];
  try{
    const parsed=JSON.parse(raw);
    if(Array.isArray(parsed)){
      return unique(parsed.map(x=>Number(x)).filter(n=>Number.isFinite(n) && n>0));
    }
  }catch(e){}
  const cleaned=raw
    .replace(/[\[\]\(\){}]/g, ' ')
    .replace(/["']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const ids=cleaned
    .split(/[;,|\n\t ]+/)
    .map(x=>Number(String(x).trim()))
    .filter(n=>Number.isFinite(n) && n>0);
  return unique(ids);
}
function songIdsFromTitlesText(value){
  const text=String(value||'').trim();
  if(!text || !(db.repertoire||[]).length) return [];
  const byNorm=new Map();
  (db.repertoire||[]).forEach(song=>{
    const key=norm(song.title||song.titleCanonical);
    if(key) byNorm.set(key, Number(song.id));
  });
  const parts=text
    .split(/[|;\n]+|\s+-\s+/)
    .map(x=>norm(x))
    .filter(Boolean);
  const ids=[];
  parts.forEach(part=>{
    if(byNorm.has(part)) ids.push(byNorm.get(part));
    else{
      const match=(db.repertoire||[]).find(song=>{
        const title=norm(song.title||song.titleCanonical);
        return title && (part.includes(title) || title.includes(part));
      });
      if(match) ids.push(Number(match.id));
    }
  });
  return unique(ids.filter(n=>Number.isFinite(n) && n>0));
}
function rehearsalSongIdsForSave(r){
  if(!r || r.allSongs) return [];
  return unique((r.songIds || [])
    .map(x=>Number(x))
    .filter(n=>Number.isFinite(n) && n>0));
}
function rehearsalSongTitlesForSave(ids){
  const byId = new Map((db.repertoire || []).map(s=>[Number(s.id), s]));
  return (ids || [])
    .map(id=>byId.get(Number(id))?.title || '')
    .filter(Boolean)
    .join(' | ');
}
function rehearsalToSheetRow(r){
  const ids = rehearsalSongIdsForSave(r);
  const titles = r.allSongs ? 'Todos los temas' : rehearsalSongTitlesForSave(ids);
  return {
    temas_ids:r.allSongs ? 'TODOS' : ids.join(','),
    temas_texto:titles,
    Temas:titles
  };
}
assert.deepStrictEqual(parseSongIds('[1,2,3,4,5]'), [1,2,3,4,5]);
assert.deepStrictEqual(parseSongIds('1,2,3,4,5'), [1,2,3,4,5]);
assert.deepStrictEqual(parseSongIds('1 | 2 | 3 | 4 | 5'), [1,2,3,4,5]);
assert.deepStrictEqual(parseSongIds('["1","2","3"]'), [1,2,3]);
assert.deepStrictEqual(songIdsFromTitlesText('Insurrección | Zombie | Stand By Me'), [1,2,5]);
const row = rehearsalToSheetRow({allSongs:false, songIds:[1,2,3,4,5,5,'']});
assert.strictEqual(row.temas_ids, '1,2,3,4,5');
assert.strictEqual(row.temas_texto, 'Insurrección | Zombie | Wicked Game | Ticket To Ride | Stand By Me');
console.log(JSON.stringify({ok:true, tests:7, row}, null, 2));

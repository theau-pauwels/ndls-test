import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const js=fs.readFileSync(new URL('../src/data/vocabulary.js',import.meta.url),'utf8');
const words=JSON.parse(js.replace(/^export const vocabulary = /,'').replace(/;\s*$/,''));
test('vocabulary covers 18 categories',()=>assert.deepEqual([...new Set(words.map(v=>v.category))].sort((a,b)=>a-b),Array.from({length:18},(_,i)=>i+1)));
test('vocabulary has distinct IDs and nonempty translations',()=>{assert.equal(new Set(words.map(v=>v.id)).size,words.length);assert.ok(words.every(v=>v.nl?.trim()&&v.fr?.trim()))});
test('vocabulary has at least 750 terms',()=>assert.ok(words.length>=750));
test('mandatory concepts are covered',()=>{const terms=words.map(v=>v.nl.toLowerCase());for(const term of ['half twaalf','hoe oud ben je?','de familie','de trui (-en)','wie?'])assert.ok(terms.some(x=>x.includes(term)),term)});

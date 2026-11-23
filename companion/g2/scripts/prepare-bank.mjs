import {readFile,writeFile} from 'node:fs/promises';
import {createContext,runInContext} from 'node:vm';
const base = new URL('../../../',import.meta.url);
const messages = createContext({URLSearchParams});
const names = ['registry-content','registry-images','registry-bank-physics','registry-calculations',
  'registry-bank-acquisition','registry-bank-procedures','registry-bank-safety','registry-bank-pilot',
  'registry-bank-academy','study-content-map','study-review'];
for (const name of names) {
  const file = name+'.js';
  runInContext(await readFile(new URL(file,base),'utf8'),messages,{filename:file});
}
const {StudyReview,StudyContentMap} = messages;
const bank = messages.RegistryContent.bank.filter(q=>q.type==='single' && !q.pilot && !q.image &&
  q.options.length>=2 && q.options.length<=4).map(q=>({
    id:q.id, version:q.version, topic:q.topic, subject:StudyReview.subject(q), stem:q.stem,
    options:q.options, key:q.key, type:q.type, lesson:StudyContentMap.related(q)
  }));
await writeFile(new URL('../src/bank.json',import.meta.url),JSON.stringify(bank));
console.log('Prepared '+bank.length+' source-linked text questions.');

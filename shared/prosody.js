/** Local, approximate English scansion adapted from Verse's fallback rules.
 * No poem text is persisted, cached between calls, or sent over the network.
 * Stress is a lexical guess, not a metrical verdict. Rhyme labels identify
 * shared spelling endings only; pronunciation, dialect and delivery can differ.
 */
const FUNCTION_WORDS = new Set(`a an the this that these those and or but nor for yet so as if than then of to in on at by up out off down with from i me my we us our you your he him his she her it its they them their who whom whose am is are was were be been do does did have has had shall will would should can could may might must not no there here when where while though o oh ah lest thy thou thee ye hath doth art hast shalt wilt wert dost didst thine mine ere oer o'er tis twas all too such more most much own still just quite well one some both each how what which`.split(' '));
const COUNTS = Object.freeze({rhythm:2,rhythms:2,business:2,colonel:2,choir:1,queue:1,idea:3,ideas:3,area:3,areas:3,every:3,poem:2,poems:2,poet:2,poets:2,poetry:3,lion:2,lions:2,being:2,doing:2,going:2,seeing:2,science:2,quiet:2,quietly:3,fire:1,fires:1,hour:1,hours:1,our:1,ours:1,flower:2,flowers:2,power:2,powers:2,heaven:2,heavens:2,evening:2,evenings:2,family:3,memory:3,several:3,different:3,interest:3,beautiful:3,create:2,created:3,creates:2,react:2,theatre:2,wednesday:2,chocolate:3,comfortable:4,vegetable:4,camera:3,orange:2,iron:2,wire:1,prayer:1,layer:2,year:1,years:1,trial:2,trials:2,dial:2,diary:3,giant:2,violet:3,violin:3,riot:2,prior:2,diet:2,client:2,ruin:2,ruins:2,ruined:2,fluid:2,cruel:2,cruelty:3,gradual:3,usual:3,usually:4,virtue:2,statue:2,genuine:3,influence:3,continuous:4,obedient:4,radiant:3,brilliant:2,ancient:2,patient:2,sacred:2,naked:2,wicked:2,blessed:2,beloved:3,duo:2,halo:2,echo:2,chaos:2,poetic:3,heroic:3,reappear:3,recreate:3,cooperate:4,coincide:3});
const STRESS = Object.create(null);
for (const [pattern,words] of Object.entries({
  '×/':'because before beyond between below above again against along among around away alone aloud about across behind beneath within without until unless perhaps forget forgot forgive belong beget',
  '/×':'water over under after never ever only into summer winter morning evening shadow window harbour harbor silence distance',
  '×/×':'remember forever together another important tomorrow',
  '/××':'beautiful yesterday poetry memory family every',
})) for (const word of words.split(' ')) STRESS[word] = pattern;
const hasEnding = (word,endings) => endings.some(ending=>word.endsWith(ending));
function count(word) {
  if (Object.hasOwn(COUNTS,word)) return COUNTS[word];
  let n=(word.match(/[aeiouy]+/g)||[]).length;
  if(n>1 && word.endsWith('e') && !hasEnding(word,['le','ee','ye','oe','ie'])) n--;
  if(word.length>3 && word.endsWith('ed') && !/[tdaeiouy]/.test(word.at(-3))) n--;
  if(word.length>3 && word.endsWith('es') && !hasEnding(word.slice(0,-2),['s','x','z','ch','sh','ge','ce'])) n--;
  if(word.length>4 && word.endsWith('ing') && /[aeiouy]/.test(word.at(-4))) n++;
  return Math.max(1,n);
}
function stresses(word,n) {
  if(n===1) return FUNCTION_WORDS.has(word)?'×':'/';
  if(STRESS[word]?.length===n) return STRESS[word];
  let beat=0;
  if(hasEnding(word,['tion','sion','cian','tial','cial','cious','tious','geous','gious','ic','ical'])) beat=n-2;
  else if(hasEnding(word,['ity','ety','ify','ogy','ology','graphy','ocracy','itude','ular'])) beat=n-3;
  else if(hasEnding(word,['ee','eer','ese','ette','esque','oon','ain'])) beat=n-1;
  else if(!hasEnding(word,['ing','ed','er','est','ly','ness','ful','less','ment','able','ible','s','es']) && /^(be|de|re|in|un|en|ex|pre|pro|a|con|com|for|sur|per|sub)/.test(word)) beat=1;
  beat=Math.max(0,Math.min(n-1,beat));
  return Array.from({length:n},(_,i)=>Math.abs(i-beat)%2===0?'/':'×').join('');
}
function ending(word) {
  // Retain the spelling in the key, but don't choose a silent final e as
  // the vowel nucleus. Polysyllables need two vowel groups, avoiding broad
  // buckets that would otherwise group almost every -ing or -er word.
  const stem=word.endsWith('e')&&!hasEnding(word,['ee','ye','oe','ie'])?word.slice(0,-1):word;
  const groups=[...stem.matchAll(/[aeiouy]+/g)];
  if(!groups.length) return '';
  const group=groups[Math.max(0,groups.length-(count(word)>1?2:1))];
  const key=word.slice(group.index);
  return key.length>=2?key:'';
}
function label(index) {
  let result='';
  do {result=String.fromCharCode(65+index%26)+result; index=Math.floor(index/26)-1;} while(index>=0);
  return result;
}
/** Returns all physical lines, including blank lines (zero syllables).
 * line is one-based. stress uses × (unstressed) and / (stressed), with spaces
 * between words. rhyme is a candidate-group label, or '' when unpaired.
 * Analysis is bounded to 100,000 characters / 2,000 lines for responsive UI.
 */
export function analyzePoem(text) {
  const source=String(text??'');
  const rows=source.slice(0,100000).replace(/\r\n?/g,'\n').split('\n');
  const groups=new Map();
  const lines=rows.slice(0,2000).map((row,index)=>{
    const words=(row.toLowerCase().replaceAll('’',"'").match(/\p{L}+(?:'\p{L}+)*/gu)||[]);
    let syllables=0;
    const stress=words.map(word=>{const n=count(word);syllables+=n;return stresses(word,n);}).join(' ');
    const endWord=words.at(-1)||'';
    const key=/^[a-z']+$/.test(endWord)?ending(endWord):'';
    if(key){if(!groups.has(key))groups.set(key,new Set());groups.get(key).add(endWord);}
    return {line:index+1,syllables,stress,endWord,rhyme:'',key};
  });
  const labels=new Map();
  for(const row of lines){
    if(groups.get(row.key)?.size>1){
      if(!labels.has(row.key)) labels.set(row.key,label(labels.size));
      row.rhyme=labels.get(row.key);
    }
    delete row.key;
  }
  const truncated=source.length>100000||rows.length>2000;
  return {lines,note:'Estimated English syllables and stress; × = unstressed, / = stressed. Pronunciation and emphasis may differ. Matching letters mark spelling-based rhyme candidates, not confirmed rhymes; repeated identical words alone are not grouped.'+(truncated?' Analysis limited to the first 100,000 characters and 2,000 lines.':'')};
}

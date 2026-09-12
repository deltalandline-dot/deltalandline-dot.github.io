const columns=new Set(['piece','venue','sent','submitBy','status','response','notes']);
const text=value=>value==null?'':String(value);

export function submissionValue(record,drafts,key){
 if(key==='piece')return text(drafts.find(draft=>draft.id===record.poemId)?.title||record.pieceTitle);
 if(key==='venue')return text(record.magazine);
 return columns.has(key)?text(record[key]):'';
}

// Returns original record references in a new array: filtering never changes saved data.
// :empty is an explicit filter for missing entries, including whitespace-only values.
export function querySubmissions(records,drafts=[],{filters={},sortKey='',direction='asc'}={}){
 const titles=new Map(drafts.map(draft=>[draft.id,draft.title]));
 const value=(record,key)=>key==='piece'?text(titles.get(record.poemId)||record.pieceTitle):key==='venue'?text(record.magazine):text(record[key]);
 const activeFilters=Object.entries(filters).filter(([key,query])=>columns.has(key)&&text(query).trim()).map(([key,query])=>[key,text(query).trim().toLocaleLowerCase()]);
 const rows=records.map((record,index)=>({record,index})).filter(({record})=>activeFilters.every(([key,query])=>{
  const content=value(record,key).trim().toLocaleLowerCase();
  return query===':empty'?!content:content.includes(query);
 }));
 if(columns.has(sortKey)){
  const sign=direction==='desc'?-1:1;
  rows.sort((a,b)=>{
   const left=value(a.record,sortKey).trim(),right=value(b.record,sortKey).trim();
   // Keep blanks below meaningful values regardless of the selected direction.
   if(!left||!right)return left?-1:right?1:a.index-b.index;
   const compared=left.localeCompare(right,undefined,{sensitivity:'base',numeric:true});
   return compared*sign||a.index-b.index;
  });
 }
 return rows.map(({record})=>record);
}

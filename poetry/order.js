export function readingOrder(poems, saved, random=Math.random){
 const ids=[...new Set(poems.map(p=>p.id))];
 if(saved && saved.length===ids.length && new Set(saved).size===ids.length && saved.every(id=>ids.includes(id)))return saved;
 for(let i=ids.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}
 return ids;
}

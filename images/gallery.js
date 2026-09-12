export const DISPLAY_MS=20_000;
export function nextIndex(current,count){return count>1?(current+1)%count:0;}
export function choosePhoto(photos,currentId,random=Math.random,seen=new Set()){
 if(!photos.length)return -1;
 const ranked=photos.map((photo,index)=>({photo,index})).sort((a,b)=>(Date.parse(b.photo.createdAt)||0)-(Date.parse(a.photo.createdAt)||0)||b.index-a.index);
 const available=ranked.filter(entry=>!seen.has(entry.photo.id)&&entry.photo.id!==currentId);
 const pool=available.length?available:ranked;
 const choices=pool.map(entry=>({...entry,rank:ranked.indexOf(entry)})).map((entry)=>({...entry,weight:(entry.rank===0?20:entry.rank<3?8:entry.rank<8?3:1)*(entry.photo.featured===true?4:1)})).filter(entry=>photos.length===1||entry.photo.id!==currentId);
 let draw=random()*choices.reduce((sum,entry)=>sum+entry.weight,0);
 for(const entry of choices){draw-=entry.weight;if(draw<0)return entry.index;}return choices.at(-1).index;
}
export function frameSize(width,height,portrait,padding=32){const ratio=portrait?2/3:3/2;const availableWidth=Math.max(1,width-2*padding),availableHeight=Math.max(1,height-2*padding);const w=Math.min(availableWidth,availableHeight*ratio);return {width:w,height:w/ratio};}

// Each neighbor exposes exactly ten percent of its own width at the screen edge.
// Reserve header space above and below every image, including the side previews.
export function photoPosition(width,height,portrait,slot='center',padding=32,anchorPortrait=portrait){
 const reserve=width<=600?88:96;
 const fit=orientation=>{const ratio=orientation?2/3:3/2,w=Math.max(1,Math.min(width*.78,Math.max(1,width-padding*2),Math.max(1,height-reserve*2)*ratio));return {width:w,height:w/ratio};};
 const size=fit(portrait);
 return {...size,left:slot==='previous'?-size.width*.9:slot==='next'?width-size.width*.1:(width-size.width)/2,top:(height-size.height)/2};
}

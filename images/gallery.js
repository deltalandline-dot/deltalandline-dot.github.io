export const DISPLAY_MS=20_000;
export function nextIndex(current,count){return count>1?(current+1)%count:0;}
export function choosePhoto(photos,currentId,random=Math.random){
 if(!photos.length)return -1;
 const ranked=photos.map((photo,index)=>({photo,index})).sort((a,b)=>(Date.parse(b.photo.createdAt)||0)-(Date.parse(a.photo.createdAt)||0)||b.index-a.index);
 const choices=ranked.map((entry,rank)=>({...entry,weight:(rank===0?20:rank<3?8:rank<8?3:1)*(entry.photo.featured===true?4:1)})).filter(entry=>photos.length===1||entry.photo.id!==currentId);
 let draw=random()*choices.reduce((sum,entry)=>sum+entry.weight,0);
 for(const entry of choices){draw-=entry.weight;if(draw<0)return entry.index;}return choices.at(-1).index;
}
export function frameSize(width,height,portrait,padding=32){const ratio=portrait?2/3:3/2;const availableWidth=Math.max(1,width-2*padding),availableHeight=Math.max(1,height-2*padding);const w=Math.min(availableWidth,availableHeight*ratio);return {width:w,height:w/ratio};}

// A shared horizontal rail keeps the gap fixed even when orientations differ.
// Reserve header space above and below every image, including the side previews.
export function photoPosition(width,height,portrait,slot='center',padding=32,anchorPortrait=portrait){
 const reserve=width<=600?88:96,gap=width<=600?30:40;
 const fit=orientation=>{const ratio=orientation?2/3:3/2,w=Math.max(1,Math.min(width*.78,Math.max(1,width-padding*2),Math.max(1,height-reserve*2)*ratio));return {width:w,height:w/ratio};};
 const size=fit(portrait),anchor=fit(anchorPortrait),centerLeft=(width-anchor.width)/2;
 return {...size,left:slot==='previous'?centerLeft-gap-size.width:slot==='next'?centerLeft+anchor.width+gap:(width-size.width)/2,top:(height-size.height)/2};
}

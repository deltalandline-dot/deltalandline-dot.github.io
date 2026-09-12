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

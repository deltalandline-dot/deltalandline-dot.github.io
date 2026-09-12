// Preview the destination behind two inert snapshots of the current page.
// The real navigation follows the animation, preserving ordinary URLs/history.
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let navigating=false;
const styles=document.createElement('style');
styles.textContent=`
.page-door,.page-arrival{position:fixed!important;inset:0!important;width:100vw!important;height:100%!important;border:0!important;margin:0!important;background:#f5f4ef;pointer-events:none!important}
.page-arrival{z-index:10000;opacity:0}
.page-door{z-index:10001;overflow:hidden;transform:translateX(0);will-change:transform;contain:paint}
.page-door.left{clip-path:inset(0 calc(100% - var(--door-seam)) 0 0)}
.page-door.right{clip-path:inset(0 0 0 var(--door-seam))}
.page-door *{pointer-events:none!important;animation:none!important;transition:none!important;caret-color:transparent!important}
`;
document.head.append(styles);
function door(side){
 const panel=document.createElement('div');panel.className='page-door '+side;panel.inert=true;panel.setAttribute('aria-hidden','true');
 const copy=document.body.cloneNode(true);
 copy.querySelectorAll('script,.page-door,.page-arrival').forEach(el=>el.remove());
 // Preserve the current form display without copying credentials or login forms.
 copy.querySelectorAll('input[type=password],input[type=email]').forEach(el=>el.value='');
 Object.assign(copy.style,{position:'absolute',top:-scrollY+'px',left:'0',width:document.documentElement.clientWidth+'px',margin:'0'});
 panel.append(copy);return panel;
}
function menuSeam(doc=document){
 const letters=[...(doc?.querySelectorAll('.navigation button span')||[])];
 const edges=letters.map(el=>el.getBoundingClientRect().left);
 const width=document.documentElement.clientWidth;
 return Math.max(0,Math.min(width,edges.length?Math.min(...edges)-18:width/2-128));
}
function arrival(destination){
 const frame=document.createElement('iframe');
 frame.className='page-arrival';frame.title='';frame.tabIndex=-1;frame.setAttribute('aria-hidden','true');frame.inert=true;
 const ready=new Promise(resolve=>{frame.onload=resolve;frame.onerror=resolve;setTimeout(resolve,3500);});
 frame.src=destination;return {frame,ready};
}
export async function navigateWithDoors(destination){
 if(navigating)return;
 if(reduced.matches){location.assign(destination);return;}
 navigating=true;
 const home=['/','/index.html'].includes(new URL(destination,location.href).pathname);
 const width=document.documentElement.clientWidth;
 const preview=arrival(destination);
 let left,right,seam;
 try{
  if(home){
   // Bring the destination in from both sides, closing over the departing page.
   const other=arrival(destination);
   left=document.createElement('div');right=document.createElement('div');
   for(const [panel,side,frame] of [[left,'left',other.frame],[right,'right',preview.frame]]){
    panel.className='page-door '+side;panel.inert=true;panel.setAttribute('aria-hidden','true');panel.style.visibility='hidden';
    frame.style.opacity='1';panel.append(frame);
   }
   document.body.append(left,right);
   await Promise.all([preview.ready,other.ready]);
   seam=menuSeam(preview.frame.contentDocument);
  }else{
   seam=menuSeam();left=door('left');right=door('right');
   document.body.append(preview.frame,left,right);
   await preview.ready;preview.frame.style.opacity='1';
  }
  const offsets=[-(seam+2),width-seam+2];
  const animations=[left,right].map((panel,index)=>{
   panel.style.setProperty('--door-seam',seam+'px');
   panel.style.visibility='visible';
   const closed='translateX(0)',open=`translateX(${offsets[index]}px)`;
   return panel.animate([{transform:home?open:closed},{transform:home?closed:open}],{duration:720,easing:'cubic-bezier(.65,0,.25,1)',fill:'forwards'}).finished;
  });
  await Promise.all(animations);
 }finally{location.assign(destination);}
}
document.addEventListener('click',event=>{
 if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
 const control=event.target.closest('a,button');if(!control)return;
 let href=control.getAttribute('href');
 if(!href&&location.pathname==='/')href={'IMAGES':'./images/','POETRY':'./poetry/'}[control.getAttribute('aria-label')];
 if(!href||control.hasAttribute('download')||control.target==='_blank')return;
 const url=new URL(href,location.href);
 if(url.origin!==location.origin||url.pathname===location.pathname)return;
 event.preventDefault();event.stopImmediatePropagation();navigateWithDoors(url.href);
},true);
// Back/forward cache must not restore the outgoing panels.
addEventListener('pageshow',event=>{if(event.persisted){document.querySelectorAll('.page-door,.page-arrival').forEach(el=>el.remove());navigating=false;}});

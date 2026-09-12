// Preview the destination behind two inert snapshots of the current page.
// The real navigation follows the animation, preserving ordinary URLs/history.
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let navigating=false;
const styles=document.createElement('style');
styles.textContent=`
.page-door,.page-arrival{position:fixed!important;inset:0!important;width:100vw!important;height:100%!important;border:0!important;margin:0!important;background:#f5f4ef;pointer-events:none!important}
.page-arrival{z-index:10000;opacity:0}
.page-door{z-index:10001;overflow:hidden;transform:translateX(0);will-change:transform;contain:paint}
.page-door.left{clip-path:inset(0 50% 0 0)}
.page-door.right{clip-path:inset(0 0 0 50%)}
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
export async function navigateWithDoors(destination){
 if(navigating)return;
 if(reduced.matches){location.assign(destination);return;}
 navigating=true;
 const left=door('left'),right=door('right'),preview=document.createElement('iframe');
 preview.className='page-arrival';preview.title='';preview.tabIndex=-1;preview.setAttribute('aria-hidden','true');preview.inert=true;
 const ready=new Promise(resolve=>{preview.onload=resolve;preview.onerror=resolve;setTimeout(resolve,3500);});
 preview.src=destination;
 document.body.append(preview,left,right);
 try{
  await ready;preview.style.opacity='1';
  await Promise.all([left.animate([{transform:'translateX(0)'},{transform:'translateX(-52%)'}],{duration:720,easing:'cubic-bezier(.65,0,.25,1)',fill:'forwards'}).finished,right.animate([{transform:'translateX(0)'},{transform:'translateX(52%)'}],{duration:720,easing:'cubic-bezier(.65,0,.25,1)',fill:'forwards'}).finished]);
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

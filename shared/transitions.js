// A single real navigation, with a solid curtain spanning the document change.
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const release=new URL(import.meta.url).searchParams.get('v');
let navigating=false,revealing=false;
const travel=[[0,2200],[1700,3200],[-2100,4400]];
const duration=1800;
const address=new URL(location.href);
if(address.searchParams.has('__site')){address.searchParams.delete('__site');history.replaceState(history.state,'',address.pathname+address.search+address.hash);}
const isHome=()=>['/','/index.html'].includes(location.pathname);
const styles=document.createElement('style');
styles.textContent=`
.site-curtain{position:fixed;inset:0;background:#f5f4ef;z-index:10000;pointer-events:auto;opacity:0}
.site-selected{position:fixed!important;z-index:10001!important;pointer-events:none!important;color:#ff3028!important;mix-blend-mode:normal!important;background:transparent!important;margin:0!important;outline:none!important;transition:none!important;transform-origin:top left!important}
html.site-arriving::after{content:'';position:fixed;inset:0;background:#f5f4ef;z-index:10002;pointer-events:auto}
html.site-arriving.site-reveal::after{animation:site-reveal .28s ease-out forwards}
@keyframes site-reveal{to{opacity:0}}
@media(prefers-reduced-motion:reduce){html.site-arriving::after{display:none}}
`;
document.head.append(styles);
function clean(){document.querySelectorAll('.site-curtain,.site-selected').forEach(el=>el.remove());document.documentElement.classList.remove('site-arriving','site-reveal','mountain-exit');document.querySelectorAll('#world,.navigation button,.mountain-layer,#mirror-paper').forEach(el=>el.getAnimations().forEach(a=>a.cancel()));navigating=false;revealing=false;}
async function animate(el,frames,duration){try{await el.animate(frames,{duration,easing:'ease-in-out',fill:'forwards'}).finished;}catch{}}
async function mountainExit(){
 const world=document.getElementById('world');
 if(!world)return;
 document.documentElement.classList.add('mountain-exit');
 // Supplied photographic layers retain their original composition offsets.
 const start=getComputedStyle(world).transform;
 const target=Math.max(Math.max(innerWidth/538,innerHeight/749)*2.5,new DOMMatrix(start).a*1.25);
 const motions=[animate(world,[{transform:start},{transform:`translate(${-1517*target}px,${-837.5*target}px) scale(${target})`}],duration)];
 document.querySelectorAll('.navigation button').forEach(el=>motions.push(animate(el,[{opacity:1},{opacity:0}],260)));
 document.querySelectorAll('.mountain-layer').forEach((el,i)=>motions.push(animate(el,[{transform:'translate(0,0)'},{transform:`translate(${travel[i][0]}px,${travel[i][1]}px)`}],duration)));
 motions.push(animate(document.getElementById('mirror-paper'),[{fill:'#ebebeb'},{fill:'#f5f4ef'}],duration));
 await Promise.all(motions);
}
export async function navigateWithDoors(destination,control){
 if(navigating)return;navigating=true;
 const target=new URL(destination,location.href);if(release)target.searchParams.set('__site',release);
 const preload=document.createElement('link');preload.rel='prefetch';preload.href=target.href;document.head.append(preload);
 if(!reduced.matches){
  if(isHome()){try{sessionStorage.setItem('home-scroll',String(scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight)));}catch{}await mountainExit();}
  const curtain=document.createElement('div');curtain.className='site-curtain';curtain.setAttribute('aria-hidden','true');document.body.append(curtain);
  await animate(curtain,[{opacity:0},{opacity:1}],isHome()?0:300);
  try{sessionStorage.setItem('site-arrival',JSON.stringify({path:target.pathname,time:Date.now()}));}catch{}
 }
 location.assign(target.href);
}
document.addEventListener('click',event=>{
 if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
 const control=event.target.closest('a,button');if(!control)return;
 let href=control.getAttribute('href');if(!href&&isHome())href={IMAGES:'./images/',POETRY:'./poetry/'}[control.getAttribute('aria-label')];
 if(!href||control.hasAttribute('download')||control.target==='_blank')return;
 const url=new URL(href,location.href);if(url.origin!==location.origin||url.pathname===location.pathname)return;
 event.preventDefault();event.stopImmediatePropagation();navigateWithDoors(url.href,control);
},true);
async function mountainReturn(){
 let progress=0;try{progress=Number(sessionStorage.getItem('home-scroll'))||0;}catch{}
 scrollTo({top:Math.max(0,Math.min(1,progress))*(document.documentElement.scrollHeight-innerHeight),behavior:'instant'});
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 const world=document.getElementById('world');
 const end=getComputedStyle(world).transform;
 const target=Math.max(Math.max(innerWidth/538,innerHeight/749)*2.5,new DOMMatrix(end).a*1.25);
 document.documentElement.classList.add('mountain-exit');
 const motions=[animate(world,[{transform:`translate(${-1517*target}px,${-837.5*target}px) scale(${target})`},{transform:end}],duration)];
 document.querySelectorAll('.mountain-layer').forEach((el,i)=>motions.push(animate(el,[{transform:`translate(${travel[i][0]}px,${travel[i][1]}px)`},{transform:'translate(0,0)'}],duration)));
 document.querySelectorAll('.navigation button').forEach(el=>motions.push(animate(el,[{opacity:0},{opacity:0,offset:.72},{opacity:1}],duration)));
 motions.push(animate(document.getElementById('mirror-paper'),[{fill:'#f5f4ef'},{fill:'#ebebeb'}],duration));
 document.documentElement.classList.remove('site-arriving','site-reveal');
 await Promise.all(motions);clean();
}
function reveal(){
 if(revealing||!document.documentElement.classList.contains('site-arriving'))return;
 revealing=true;
 if(isHome()&&!reduced.matches){mountainReturn();return;}
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  document.documentElement.classList.add('site-reveal');setTimeout(clean,310);
 }));
}
addEventListener('site-ready',reveal,{once:true});
// Do not add a long artificial wait for section data or remote font loading.
addEventListener('DOMContentLoaded',()=>{if(!isHome())setTimeout(reveal,250);},{once:true});
addEventListener('load',()=>{if(isHome())reveal();},{once:true});
addEventListener('pageshow',event=>{if(event.persisted)clean();});

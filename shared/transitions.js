// A single real navigation, with a solid curtain spanning the document change.
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const release=new URL(import.meta.url).searchParams.get('v');
let navigating=false;
const address=new URL(location.href);
if(address.searchParams.has('__site')){address.searchParams.delete('__site');history.replaceState(history.state,'',address.pathname+address.search+address.hash);}
const isHome=()=>['/','/index.html'].includes(location.pathname);
const styles=document.createElement('style');
styles.textContent=`
.site-curtain{position:fixed;inset:0;background:#f5f4ef;z-index:10000;pointer-events:auto;opacity:0}
.site-selected{position:fixed!important;z-index:10001!important;pointer-events:none!important;color:#ff3028!important;mix-blend-mode:normal!important;background:transparent!important;margin:0!important;outline:none!important;transition:none!important;transform-origin:top left!important}
html.site-arriving::after{content:'';position:fixed;inset:0;background:#f5f4ef;z-index:10002;pointer-events:auto}
html.site-arriving.site-reveal::after{animation:site-reveal .48s ease-out forwards}
@keyframes site-reveal{to{opacity:0}}
@media(prefers-reduced-motion:reduce){html.site-arriving::after{display:none}}
`;
document.head.append(styles);
function clean(){document.querySelectorAll('.site-curtain,.site-selected').forEach(el=>el.remove());document.documentElement.classList.remove('site-arriving','site-reveal','mountain-exit');document.querySelectorAll('#world,.navigation button,.mountain-layer,#mirror-paper,#landscape-original').forEach(el=>el.getAnimations().forEach(a=>a.cancel()));const original=document.getElementById('landscape-original');if(original)original.style.visibility='';document.getElementById('mountain-layers')?.setAttribute('visibility','hidden');navigating=false;}
async function animate(el,frames,duration){try{await el.animate(frames,{duration,easing:'ease-in-out',fill:'forwards'}).finished;}catch{}}
async function mountainExit(){
 const world=document.getElementById('world');
 if(!world)return;
 document.documentElement.classList.add('mountain-exit');
 // Vector masks approximate three depth regions of the supplied flat photograph.
 const original=document.getElementById('landscape-original');
 document.getElementById('mountain-layers').setAttribute('visibility','visible');
 const start=getComputedStyle(world).transform;
 const target=Math.max(Math.max(innerWidth/538,innerHeight/749)*2.5,new DOMMatrix(start).a*1.25);
 const motions=[animate(original,[{opacity:1},{opacity:0}],480),animate(world,[{transform:start},{transform:`translate(${-1517*target}px,${-837.5*target}px) scale(${target})`}],1450)];
 document.querySelectorAll('.navigation button').forEach(el=>motions.push(animate(el,[{opacity:1},{opacity:0}],260)));
 document.querySelectorAll('.mountain-layer').forEach((el,i)=>motions.push(animate(el,[{transform:'translateY(0)'},{transform:`translateY(${[2200,3200,4400][i]}px)`}],1450)));
 motions.push(animate(document.getElementById('mirror-paper'),[{fill:'#ebebeb'},{fill:'#f5f4ef'}],1450));
 await Promise.all(motions);
}
export async function navigateWithDoors(destination,control){
 if(navigating)return;navigating=true;
 const target=new URL(destination,location.href);if(release)target.searchParams.set('__site',release);
 if(!reduced.matches){
  if(isHome())await mountainExit();
  const curtain=document.createElement('div');curtain.className='site-curtain';curtain.setAttribute('aria-hidden','true');document.body.append(curtain);
  await animate(curtain,[{opacity:0},{opacity:1}],isHome()?120:420);
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
function reveal(){
 if(!document.documentElement.classList.contains('site-arriving'))return;
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  document.documentElement.classList.add('site-reveal');setTimeout(clean,520);
 }));
}
// App data is allowed to settle before revealing; a bounded fallback prevents a stuck curtain.
addEventListener('site-ready',reveal,{once:true});
addEventListener('load',()=>{if(isHome())document.fonts.ready.then(reveal);else setTimeout(reveal,1800);},{once:true});
addEventListener('pageshow',event=>{if(event.persisted)clean();});

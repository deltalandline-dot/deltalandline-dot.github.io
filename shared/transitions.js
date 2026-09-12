// A single real navigation, with a solid curtain spanning the document change.
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const release=new URL(import.meta.url).searchParams.get('v');
let navigating=false;
const address=new URL(location.href);
if(address.searchParams.has('__site')){address.searchParams.delete('__site');history.replaceState(history.state,'',address.pathname+address.search+address.hash);}
const isHome=()=>['/','/index.html'].includes(location.pathname);
const styles=document.createElement('style');
styles.textContent=`
.site-curtain{position:fixed;inset:0;background:#111110;z-index:10000;pointer-events:auto;opacity:0}
.site-selected{position:fixed!important;z-index:10001!important;pointer-events:none!important;color:#ff3028!important;mix-blend-mode:normal!important;background:transparent!important;margin:0!important;outline:none!important;transition:none!important;transform-origin:top left!important}
html.site-arriving::after{content:'';position:fixed;inset:0;background:#111110;z-index:10002;pointer-events:auto}
html.site-arriving.site-reveal::after{animation:site-reveal .48s ease-out forwards}
@keyframes site-reveal{to{opacity:0}}
@media(prefers-reduced-motion:reduce){html.site-arriving::after{display:none}}
`;
document.head.append(styles);
function clean(){document.querySelectorAll('.site-curtain,.site-selected').forEach(el=>el.remove());document.documentElement.classList.remove('site-arriving','site-reveal');navigating=false;}
async function animate(el,frames,duration){try{await el.animate(frames,{duration,easing:'ease-in-out',fill:'forwards'}).finished;}catch{}}
function selectedLabel(control){
 if(!control)return null;
 const rect=control.getBoundingClientRect(),computed=getComputedStyle(control),copy=control.cloneNode(true);
 for(const key of computed)copy.style.setProperty(key,computed.getPropertyValue(key));
 copy.removeAttribute('id');copy.className='site-selected';copy.setAttribute('aria-hidden','true');copy.inert=true;
 Object.assign(copy.style,{left:rect.left+'px',top:rect.top+'px',width:control.offsetWidth+'px',height:control.offsetHeight+'px',transform:`scale(${rect.width/control.offsetWidth})`});
 document.body.append(copy);return copy;
}
export async function navigateWithDoors(destination,control){
 if(navigating)return;navigating=true;
 const target=new URL(destination,location.href);if(release)target.searchParams.set('__site',release);
 if(!reduced.matches){
  const label=isHome()?selectedLabel(control):null;
  const curtain=document.createElement('div');curtain.className='site-curtain';curtain.setAttribute('aria-hidden','true');document.body.append(curtain);
  await animate(curtain,[{opacity:0},{opacity:1}],420);
  if(label)await animate(label,[{opacity:1},{opacity:0}],240);
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

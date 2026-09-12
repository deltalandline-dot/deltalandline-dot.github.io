import {setCamera} from './zoom.js?v=966dee6ff1d2';
// A single real navigation, with a solid curtain spanning the document change.
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const release=new URL(import.meta.url).searchParams.get('v');
let navigating=false,revealing=false,epoch=0;
let slicesReady;
function blockScroll(event){event.preventDefault();}
function lockScroll(){for(const type of ['wheel','touchmove'])addEventListener(type,blockScroll,{passive:false});}
function unlockScroll(){for(const type of ['wheel','touchmove'])removeEventListener(type,blockScroll);}
function ensureSlices(){return slicesReady??=Promise.all([...document.querySelectorAll('.mountain-layer image')].map(async el=>{const src=el.dataset.src;const image=new Image();image.src=src;await image.decode();el.setAttribute('href',src);})).then(()=>true,()=>false);}
async function prepareSlices(){return Promise.race([ensureSlices(),new Promise(resolve=>setTimeout(()=>resolve(false),300))]);}
const travel=[[0,3800],[1700,3200],[-2100,4400]];
const duration=750;
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
function clean(){epoch++;unlockScroll();document.querySelectorAll('.site-curtain,.site-selected').forEach(el=>el.remove());document.getElementById('scroll-photo')?.style.removeProperty('opacity');document.documentElement.classList.remove('site-arriving','site-reveal','mountain-exit');document.querySelectorAll('#world,.navigation button,.mountain-layer,#mirror-paper,#scroll-photo').forEach(el=>el.getAnimations().forEach(a=>a.cancel()));navigating=false;revealing=false;dispatchEvent(new Event('site-home-render'));}
async function animate(el,frames,duration){try{await el.animate(frames,{duration:reduced.matches?0:duration,easing:'ease-in-out',fill:'forwards'}).finished;}catch{}}
// Camera interpolation stays inside the fixed SVG viewport. CSS scaling the
// full photographic world creates oversized raster tiles at the closest zoom.
function animateCamera(camera,from,to,token){
 const width=camera.clientWidth,height=camera.clientHeight;
 return new Promise(resolve=>{
  let started;
  function frame(now){
   if(token!==epoch){resolve();return;}
   if(started===undefined)started=now;
   const p=reduced.matches?1:Math.min(1,(now-started)/duration);
   const eased=p*p*(3-2*p);
   setCamera(camera,from*Math.pow(to/from,eased),width,height);
   if(p<1)requestAnimationFrame(frame);else resolve();
  }
  requestAnimationFrame(frame);
 });
}
async function mountainExit(token){
 if(!await prepareSlices()||token!==epoch)return;
 const camera=document.getElementById('camera');
 if(!camera)return;
 document.documentElement.classList.add('mountain-exit');
 // Supplied photographic layers retain their original composition offsets.
 const start=Number(camera.dataset.scale)||1;
 const target=Math.max(Math.max(camera.clientWidth/538,camera.clientHeight/749)*2.5,start*1.25);
 await animate(document.getElementById('scroll-photo'),[{opacity:1},{opacity:0}],100);if(token!==epoch)return;
 const motions=[animateCamera(camera,start,target,token)];
 document.querySelectorAll('.navigation button').forEach(el=>motions.push(animate(el,[{opacity:1},{opacity:0}],260)));
 document.querySelectorAll('.mountain-layer').forEach((el,i)=>motions.push(animate(el,[{transform:'translate(0,0)'},{transform:`translate(${travel[i][0]}px,${travel[i][1]}px)`}],duration)));
 motions.push(animate(document.getElementById('mirror-paper'),[{fill:'#ebebeb'},{fill:getComputedStyle(document.documentElement).getPropertyValue('--paper').trim()||'#f5f4ef'}],duration));
 await Promise.all(motions);
}
export async function navigateWithDoors(destination,control){
 if(navigating)return;navigating=true;const token=++epoch;lockScroll();
 const target=new URL(destination,location.href);if(release)target.searchParams.set('__site',release);
 prefetch(target);
 try{if(!reduced.matches){
  if(isHome()){try{sessionStorage.setItem('home-scroll',String((document.getElementById('journey')?.scrollTop||0)/Math.max(1,(document.getElementById('journey')?.scrollHeight||innerHeight)-innerHeight)));}catch{}await mountainExit(token);if(token!==epoch)return;}
  const curtain=document.createElement('div');curtain.className='site-curtain';curtain.setAttribute('aria-hidden','true');document.body.append(curtain);
  await animate(curtain,[{opacity:0},{opacity:1}],isHome()?0:140);if(token!==epoch)return;
  try{sessionStorage.setItem('site-arrival',JSON.stringify({path:target.pathname,time:Date.now()}));}catch{}
 }}catch{if(token!==epoch)return;clean();location.assign(target.href);return;}
 if(token===epoch)location.assign(target.href);
}
// Warm the document on intent, without starting another app or fetching private data.
const prefetched=new Set();
function prefetch(url){if(release)url.searchParams.set('__site',release);if(url.origin!==location.origin||prefetched.has(url.href))return;prefetched.add(url.href);const link=document.createElement('link');link.rel='prefetch';link.href=url.href;document.head.append(link);}
function controlDestination(control){let href=control?.getAttribute('href');if(!href&&isHome())href={IMAGES:'./images/',POETRY:'./poetry/'}[control?.getAttribute('aria-label')];return href;}
for(const type of ['pointerover','focusin'])document.addEventListener(type,event=>{const control=event.target.closest('a,button'),href=controlDestination(control);if(!href||control.hasAttribute('download')||control.target==='_blank')return;const url=new URL(href,location.href);if(url.pathname!==location.pathname)prefetch(url);});
document.addEventListener('click',event=>{
 if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
 const control=event.target.closest('a,button');if(!control)return;
 const href=controlDestination(control);
 if(!href||control.hasAttribute('download')||control.target==='_blank')return;
 const url=new URL(href,location.href);if(url.origin!==location.origin||url.pathname===location.pathname)return;
 event.preventDefault();event.stopImmediatePropagation();navigateWithDoors(url.href,control);
},true);
async function mountainReturn(token){
 if(!await prepareSlices()){if(token===epoch)clean();return;}if(token!==epoch)return;
 let progress=0;try{progress=Number(sessionStorage.getItem('home-scroll'))||0;}catch{}
 const scrollArea=document.getElementById('journey');
 if(scrollArea)scrollArea.scrollTo({top:Math.max(0,Math.min(1,progress))*(scrollArea.scrollHeight-scrollArea.clientHeight),behavior:'instant'});
 dispatchEvent(new Event('site-home-render'));
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));if(token!==epoch)return;
 const camera=document.getElementById('camera');
 if(!camera){clean();return;}
 const end=Number(camera.dataset.scale)||1;
 const target=Math.max(Math.max(camera.clientWidth/538,camera.clientHeight/749)*2.5,end*1.25);
 navigating=true;document.documentElement.classList.add('mountain-exit');
 document.getElementById('scroll-photo').style.opacity='0';
 setCamera(camera,target,camera.clientWidth,camera.clientHeight);
 const motions=[animateCamera(camera,target,end,token)];
 document.querySelectorAll('.mountain-layer').forEach((el,i)=>motions.push(animate(el,[{transform:`translate(${travel[i][0]}px,${travel[i][1]}px)`},{transform:'translate(0,0)'}],duration)));
 document.querySelectorAll('.navigation button').forEach(el=>motions.push(animate(el,[{opacity:0},{opacity:0,offset:.72},{opacity:1}],duration)));
 motions.push(animate(document.getElementById('mirror-paper'),[{fill:getComputedStyle(document.documentElement).getPropertyValue('--paper').trim()||'#f5f4ef'},{fill:'#ebebeb'}],duration));
 document.documentElement.classList.remove('site-arriving','site-reveal');
 await Promise.all(motions);if(token!==epoch)return;await animate(document.getElementById('scroll-photo'),[{opacity:0},{opacity:1}],100);if(token===epoch)clean();
}
function reveal(){
 if(revealing||!document.documentElement.classList.contains('site-arriving'))return;
 revealing=true;const token=++epoch;
 if(isHome()&&!reduced.matches){navigating=true;lockScroll();mountainReturn(token).catch(()=>{if(token===epoch)clean();});return;}
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  if(token!==epoch)return;document.documentElement.classList.add('site-reveal');setTimeout(()=>{if(token===epoch)clean();},310);
 }));
}
addEventListener('site-ready',reveal,{once:true});
// Do not add a long artificial wait for section data or remote font loading.
addEventListener('DOMContentLoaded',()=>{if(!isHome())setTimeout(reveal,0);else if(!reduced.matches)ensureSlices();},{once:true});
addEventListener('DOMContentLoaded',()=>{if(isHome())reveal();},{once:true});
addEventListener('pageshow',event=>{if(event.persisted)clean();});

addEventListener('pagehide',()=>{epoch++;unlockScroll();});
addEventListener('resize',()=>{if(navigating)clean();});
addEventListener('keydown',event=>{if(navigating&&['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key))event.preventDefault();});
reduced.addEventListener('change',()=>{if(reduced.matches)document.querySelectorAll('#world,.navigation button,.mountain-layer,#mirror-paper,#scroll-photo').forEach(el=>el.getAnimations().forEach(a=>a.finish()));});

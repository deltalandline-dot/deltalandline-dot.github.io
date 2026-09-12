import {configured,listPhotos,publishPhoto,preparedPhoto,accessToken,signIn,acceptSignInLink,signOut,listCollection,setPhotoFeatured,removePhoto} from '../shared/connection.js?v=71eeb6f26f90';
import {DISPLAY_MS,choosePhoto,frameSize,photoPosition} from './gallery.js?v=71eeb6f26f90';
const $=id=>document.getElementById(id);let photos=[],current=0,timer=null,showing=null,generation=0,previewUrl=null,galleryRequest=0,selectionGeneration=0,uploading=false,uploadQueue=[],collectionRequest=0;
const seenPhotos=new Set();
try{const saved=JSON.parse(sessionStorage.getItem('gallery-seen')||'[]');if(Array.isArray(saved))for(const id of saved)if(typeof id==='string')seenPhotos.add(id);}catch{}
function rememberPhoto(id){if(seenPhotos.has(id)&&showing?.id!==id)seenPhotos.clear();seenPhotos.add(id);const active=new Set(photos.map(photo=>photo.id));for(const old of seenPhotos)if(!active.has(old))seenPhotos.delete(old);try{sessionStorage.setItem('gallery-seen',JSON.stringify([...seenPhotos]));}catch{}}
const inCollection=()=>['#upload','#collection'].includes(location.hash);
$('menu-button').onclick=()=>{$('menu').hidden=!$('menu').hidden;$('menu-button').setAttribute('aria-expanded',String(!$('menu').hidden));};
let previousSide=null,nextSide=null,nextPhoto=null,sideGeneration=0,animations=new Set();
const reducedMotion=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function position(item,slot='center',anchor=showing||item){const width=$('gallery').clientWidth||innerWidth,height=$('gallery').clientHeight||innerHeight;return photoPosition(width,height,item.orientation==='portrait',slot,width<=600?24:32,anchor.orientation==='portrait');}
function place(element,item,slot){const box=position(item,slot);Object.assign(element.style,{left:box.left+'px',top:box.top+'px',width:box.width+'px',height:box.height+'px'});return box;}
function animate(element,frames,options){const animation=element.animate?.(frames,options);if(!animation)return null;animations.add(animation);animation.finished.catch(()=>{}).finally(()=>animations.delete(animation));return animation;}
function removeSide(side){side?.element.remove();}
function clearMotion(){sideGeneration++;for(const animation of animations)animation.cancel();animations.clear();removeSide(previousSide);removeSide(nextSide);previousSide=nextSide=null;nextPhoto=null;}
function makeSide(item,slot){const element=document.createElement('figure'),img=document.createElement('img');element.className='gallery-side';element.setAttribute('aria-hidden','true');img.alt='';img.src=item.url;element.append(img);$('gallery').append(element);place(element,item,slot);return {element,item};}
function resize(){if(showing)place($('frame'),showing,'center');if(previousSide)place(previousSide.element,previousSide.item,'previous');if(nextSide)place(nextSide.element,nextSide.item,'next');}
async function prepareNext(){
 const token=++sideGeneration;removeSide(nextSide);nextSide=null;nextPhoto=null;
 if(photos.length<2||!showing)return;
 const item=photos[choosePhoto(photos,showing.id,Math.random,seenPhotos)],loaded=new Image();nextPhoto=item;loaded.src=item.url;
 try{await loaded.decode();}catch{return;}
 if(token!==sideGeneration||document.hidden||inCollection())return;
 nextSide=makeSide(item,'next');nextSide.element.style.opacity='1';
 if(!reducedMotion())animate(nextSide.element,[{opacity:0},{opacity:1}],{duration:DISPLAY_MS,easing:'linear'});
}
function showEmptyGallery(){
 generation++;showing=null;current=0;clearMotion();$('frame').hidden=true;$('empty').hidden=false;$('empty').textContent='No photographs yet.';
}
function schedule(){
 clearTimeout(timer);if(document.hidden||inCollection())return;
 prepareNext();
 if(previousSide){previousSide.element.style.opacity='0';if(!reducedMotion())animate(previousSide.element,[{opacity:1},{opacity:0}],{duration:DISPLAY_MS,easing:'linear'});}
 timer=setTimeout(async()=>{
  const request=galleryRequest,queuedId=nextPhoto?.id;
  try{const next=await listPhotos();if(request!==galleryRequest||document.hidden||inCollection())return;photos=next;}catch{}
  if(request!==galleryRequest||document.hidden||inCollection())return;
  if(photos.length>1){const queued=photos.findIndex(item=>item.id===queuedId&&item.id!==showing?.id);show(queued>=0?queued:choosePhoto(photos,showing?.id,Math.random,seenPhotos));}
  else if(photos.length===1&&photos[0].id!==showing?.id)show(0);else{if(!photos.length)showEmptyGallery();schedule();}
 },DISPLAY_MS);
}
async function show(index){
 if(!photos.length)return;const token=++generation,item=photos[index],loaded=new Image();
 if(!showing)$('empty').textContent='Loading photographs…';loaded.src=item.url;
 try{await loaded.decode();}catch{if(token!==generation)return;$('empty').textContent='This photograph couldn’t be loaded.';$('empty').hidden=false;schedule();return;}
 if(token!==generation)return;
 const changed=showing&&showing.id!==item.id,oldItem=showing,oldBox=oldItem&&position(oldItem),incomingBox=oldItem&&position(item,'next',oldItem);
 clearMotion();
 if(changed)previousSide=makeSide(oldItem,'previous');
 rememberPhoto(item.id);current=index;showing=item;$('photo').src=loaded.src;$('photo').alt=item.description||'Photograph';resize();$('frame').hidden=false;$('empty').hidden=true;
 if(changed&&!reducedMotion()){
  const options={duration:1600,easing:'cubic-bezier(.22,.61,.36,1)'},center=position(item),distance=incomingBox.left-center.left;
  animate(previousSide.element,[{transform:`translateX(${oldBox.left-position(oldItem,'previous').left}px)`},{transform:'translateX(0)'}],options);
  const entering=animate($('frame'),[{transform:`translateX(${distance}px)`},{transform:'translateX(0)'}],options);
  if(entering)await entering.finished.catch(()=>{});
  if(token!==generation)return;
 }
 schedule();
}
async function loadGallery(){const request=++galleryRequest;if(!showing){$('empty').textContent='Loading photographs…';$('empty').hidden=false;}try{const next=await listPhotos();if(request!==galleryRequest)return;photos=next;if(photos.length){const retained=photos.findIndex(p=>p.id===showing?.id);await show(retained>=0?retained:choosePhoto(photos,null,Math.random,seenPhotos));}else{showEmptyGallery();schedule();}}catch{if(request===galleryRequest){$('empty').textContent='The gallery couldn’t be loaded. Please try again.';schedule();}}}
async function route(){galleryRequest++;generation++;collectionRequest++;const upload=inCollection();$('upload').hidden=!upload;$('gallery').hidden=upload;$('menu').hidden=true;$('menu-button').setAttribute('aria-expanded','false');clearTimeout(timer);clearMotion();if(!upload)await loadGallery();else if(await showLogin())await loadCollection();}
function resumeGallery(){if(inCollection()||document.hidden)return;if(showing)schedule();else if(photos.length)show(choosePhoto(photos,null,Math.random,seenPhotos));else loadGallery();}
addEventListener('pagehide',()=>{clearTimeout(timer);clearMotion();galleryRequest++;generation++;collectionRequest++;});addEventListener('pageshow',event=>{if(event.persisted)resumeGallery();});
addEventListener('hashchange',route);addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(timer);clearMotion();generation++;galleryRequest++;}else resumeGallery();});
function renderUploadQueue(){
 const list=$('upload-queue');list.replaceChildren();
 for(const item of uploadQueue){const row=document.createElement('li'),name=document.createElement('span'),state=document.createElement('span');name.textContent=item.file.name;state.className='queue-state';state.textContent=item.error||({ready:'Ready',preparing:'Preparing…',uploading:configured?'Publishing…':'Saving…',done:configured?'Published':'Saved on this Mac',failed:'Couldn’t save',invalid:'Not supported'}[item.state]);row.append(name,state);list.append(row);}
 const pending=uploadQueue.filter(item=>['ready','failed'].includes(item.state));
 $('upload-form').hidden=!pending.length&&!uploading;
 $('description').hidden=uploadQueue.length!==1;
 $('save').textContent=uploadQueue.some(item=>item.state==='failed')?'Retry failed photos':configured?`Publish ${pending.length===1?'photo':'photos'}`:'Add to local gallery';
 $('save').disabled=uploading||!pending.length;
 $('success').hidden=!uploadQueue.some(item=>item.state==='done');
}
$('file').onchange=async()=>{
 if(uploading)return;
 const token=++selectionGeneration;if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}
 $('preview').hidden=true;$('description').value='';$('status').textContent='';
 uploadQueue=Array.from($('file').files,file=>{let error='';if(file.size>20*1024*1024)error='Too large — maximum 20 MB';else if(!['image/jpeg','image/png','image/webp'].includes(file.type))error='Choose JPEG, PNG or WebP';return {file,id:crypto.randomUUID(),description:file.name.replace(/\.[^.]+$/,'').slice(0,300),state:error?'invalid':'ready',error};});
 renderUploadQueue();const first=uploadQueue.find(item=>item.state==='ready');if(!first)return;
 const url=URL.createObjectURL(first.file);previewUrl=url;const img=new Image();img.src=url;
 try{await img.decode();}catch{if(token!==selectionGeneration)return;$('status').textContent='Preview unavailable. The photos will be checked individually before saving.';return;}
 if(token!==selectionGeneration)return;
 const portrait=img.naturalHeight>img.naturalWidth,size=frameSize(Math.min(innerWidth-56,664),innerHeight*.48,portrait,0);
 $('preview').src=url;$('preview').style.width=size.width+'px';$('preview').style.height=size.height+'px';$('preview').hidden=false;
 $('status').textContent=`${uploadQueue.length>1?'First photo · ':''}${portrait?'Portrait · 2:3':'Landscape · 3:2'} centered crop preview`;
};

function clearCollection(){
 collectionRequest++;$('collection-grid').replaceChildren();$('collection-list').hidden=true;$('collection-status').textContent='';
}
function renderCollection(items){
 const grid=$('collection-grid');grid.replaceChildren();
 for(const item of items){
  const card=document.createElement('article'),image=document.createElement('img'),description=document.createElement('p'),actions=document.createElement('div'),feature=document.createElement('button'),remove=document.createElement('button'),cancel=document.createElement('button'),status=document.createElement('p');
  card.className='collection-card';image.src=item.url;image.alt=item.description||'Photograph';image.loading='lazy';image.decoding='async';
  description.textContent=item.description||'Untitled photograph';actions.className='collection-actions';
  feature.type=remove.type=cancel.type='button';feature.textContent=item.featured?'Featured':'Feature';feature.setAttribute('aria-pressed',String(Boolean(item.featured)));feature.setAttribute('aria-label',`${item.featured?'Unfeature':'Feature'} ${item.description||'photograph'}`);
  remove.textContent='Remove';cancel.textContent='Cancel';cancel.hidden=true;status.className='note';status.setAttribute('role','status');
  let confirming=false,busy=false;
  const resetRemove=()=>{confirming=false;remove.textContent='Remove';cancel.hidden=true;};
  const mutate=async(action,message)=>{
   if(busy)return;busy=true;feature.disabled=remove.disabled=cancel.disabled=true;status.textContent=message;
   const request=collectionRequest;
   try{await action();if(request===collectionRequest&&inCollection())await loadCollection();}
   catch(error){if(request===collectionRequest){status.textContent=error.message||'Couldn’t update this photograph. Try again.';resetRemove();}}
   finally{busy=false;feature.disabled=remove.disabled=cancel.disabled=false;}
  };
  feature.onclick=()=>mutate(()=>setPhotoFeatured(item.id,!item.featured),'Updating…');
  remove.onclick=()=>{if(!confirming){confirming=true;remove.textContent='Remove photo?';cancel.hidden=false;status.textContent='Remove this photo from the public rotation.';return;}return mutate(()=>removePhoto(item.id),'Removing…');};
  cancel.onclick=()=>{resetRemove();status.textContent='';};
  actions.append(feature,remove,cancel);card.append(image,description,actions,status);grid.append(card);
 }
}
async function loadCollection(){
 const request=++collectionRequest;
 if(!inCollection())return;
 if(!configured){$('collection-list').hidden=false;$('collection-grid').replaceChildren();$('collection-status').textContent='Collection management is available online. You can still add photos to this Mac above.';return;}
 $('collection-list').hidden=false;$('collection-status').textContent='Loading collection…';
 try{
  const items=await listCollection();if(request!==collectionRequest||!inCollection())return;
  renderCollection(items);$('collection-status').textContent=items.length?`${items.length} ${items.length===1?'photo':'photos'} in the rotation.`:'No photos yet. Choose photos above to start your collection.';
 }catch(error){if(request===collectionRequest){$('collection-grid').replaceChildren();$('collection-status').textContent=error.message||'Couldn’t load the collection. Open Collection again to retry.';}}
}

async function showLogin(){
 clearCollection();const ownRequest=collectionRequest;$('upload-controls').hidden=true;
 let loggedIn;
 try{loggedIn=!configured||Boolean(await accessToken());}
 catch(error){
  if(ownRequest!==collectionRequest||!inCollection())return false;
  $('login').hidden=false;$('sign-out').hidden=!configured;
  $('login-status').textContent=(error.message||'Sign-in could not be checked.')+' ';
  const retry=document.createElement('button');retry.type='button';retry.textContent='Retry';retry.onclick=async()=>{retry.disabled=true;if(await showLogin())await loadCollection();};$('login-status').append(retry);
  return false;
 }
 if(ownRequest!==collectionRequest||!inCollection())return false;
 $('login').hidden=loggedIn;$('sign-out').hidden=!configured||!loggedIn;$('upload-controls').hidden=!loggedIn;
 if(loggedIn)$('login-status').textContent='';
 $('storage-note').textContent=configured?'Publish an optimized copy to the gallery. Keep the original in your photo library.':'Local preview: photographs are saved on this Mac. Online publishing is not connected yet.';renderUploadQueue();return loggedIn;
}
$('login-form').onsubmit=async event=>{event.preventDefault();const button=$('send-code');button.disabled=true;try{await signIn($('email').value.trim());$('login-status').textContent='Check your email and open the sign-in link on this device.';}catch(error){$('login-status').textContent=error.message;}finally{button.disabled=false;}};
$('sign-out').onclick=async()=>{if(uploading)return;clearCollection();signOut();await showLogin();};
$('upload-form').onsubmit=async event=>{
 event.preventDefault();if(uploading)return;
 const pending=uploadQueue.filter(item=>['ready','failed'].includes(item.state));if(!pending.length)return;
 uploading=true;selectionGeneration++;$('file').disabled=true;$('description').disabled=true;$('sign-out').disabled=true;
 if(uploadQueue.length===1&&pending[0].state==='ready')pending[0].description=$('description').value.trim()||pending[0].description;
 try{
  for(const item of pending){
   item.error='';item.state='preparing';renderUploadQueue();
   const position=uploadQueue.indexOf(item)+1;$('status').textContent=`Preparing ${position} of ${uploadQueue.length}: ${item.file.name}`;
   try{const file=await preparedPhoto(item.file);item.state='uploading';renderUploadQueue();$('status').textContent=`${configured?'Publishing':'Saving'} ${position} of ${uploadQueue.length}: ${item.file.name}`;await publishPhoto(file,item.description,item.id);item.state='done';}
   catch(error){item.state='failed';item.error=error.message||'Couldn’t save. Try again.';}
   renderUploadQueue();
  }
 }finally{
  uploading=false;$('file').disabled=false;$('description').disabled=false;$('sign-out').disabled=false;renderUploadQueue();
  const done=uploadQueue.filter(item=>item.state==='done').length,failed=uploadQueue.filter(item=>item.state==='failed').length,invalid=uploadQueue.filter(item=>item.state==='invalid').length;
  $('status').textContent=`${done} of ${uploadQueue.length} ${configured?'published':'saved on this Mac'}.${done?' Added to the rotation.':''}${failed?` ${failed} couldn’t be saved. Retry failed photos to try those again.`:''}${invalid?` ${invalid} unsupported ${invalid===1?'file was':'files were'} skipped.`:''}`;
  if(done===uploadQueue.length)$('file').value='';
  if(done&&inCollection())await loadCollection();
 }
};
try{await acceptSignInLink();}catch(error){$('login-status').textContent=error.message;}
await route();

dispatchEvent(new Event('site-ready'));

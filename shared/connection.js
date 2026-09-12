import {cloud} from './config.js?v=734e8aa13c6e';
export const configured=Boolean(cloud.url&&cloud.publishableKey);
const sessionKey='portfolio-login';
function session(){try{return JSON.parse(sessionStorage.getItem(sessionKey)||'null');}catch{return null;}}
export async function signIn(email,redirect=new URL('../images/',import.meta.url).href){
 const response=await fetch(cloud.url+'/auth/v1/otp?redirect_to='+encodeURIComponent(redirect),{method:'POST',headers:{apikey:cloud.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({email,create_user:false})});
 if(!response.ok)throw Error('Couldn’t send a sign-in link. Check your email address and try again.');
}
export async function acceptSignInLink(){
 const params=new URLSearchParams(location.hash.slice(1));
 if(!params.has('access_token')&&!params.has('error_description'))return false;
 const token=params.get('access_token'),refresh=params.get('refresh_token'),error=params.get('error_description');
 history.replaceState(null,'',location.pathname+location.search+(location.pathname.includes('/poetry')?'#write':'#upload'));
 if(error)throw Error('This sign-in link has expired or could not be used. Request another link.');
 if(!configured||!token||!refresh)throw Error('This sign-in link is incomplete. Request another link.');
 const response=await fetch(cloud.url+'/auth/v1/user',{headers:{apikey:cloud.publishableKey,Authorization:'Bearer '+token}});
 if(!response.ok)throw Error('This sign-in link could not be verified. Request another link.');
 const seconds=Number(params.get('expires_in'));
 sessionStorage.setItem(sessionKey,JSON.stringify({access_token:token,refresh_token:refresh,expires_at:Date.now()+(Number.isFinite(seconds)&&seconds>0?seconds:0)*1000}));
 return true;
}
export async function verifyCode(email,token){
 const response=await fetch(cloud.url+'/auth/v1/verify',{method:'POST',headers:{apikey:cloud.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({email,token,type:'email'})});
 const result=await response.json();if(!response.ok)throw Error('That code could not be verified. Try a new code.');result.expires_at=Date.now()+result.expires_in*1000;sessionStorage.setItem(sessionKey,JSON.stringify(result));
}
export async function accessToken(){let value=session();if(!value)return null;if(value.expires_at>Date.now()+60000)return value.access_token;
 const response=await fetch(cloud.url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:cloud.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:value.refresh_token})});if(!response.ok){sessionStorage.removeItem(sessionKey);return null;}value=await response.json();value.expires_at=Date.now()+value.expires_in*1000;sessionStorage.setItem(sessionKey,JSON.stringify(value));return value.access_token;
}
export function signOut(){sessionStorage.removeItem(sessionKey);}
export async function listPhotos(){const response=await fetch(configured?cloud.url+'/functions/v1/gallery':'/api/images',{headers:configured?{apikey:cloud.publishableKey}:{}});if(!response.ok)throw Error('The gallery couldn’t be loaded.');return response.json();}
export async function publishPhoto(file,description,id){
 const headers={'Content-Type':file.type,'X-Photo-Description':encodeURIComponent(description),'X-Upload-Id':id};
 if(configured){const token=await accessToken();if(!token)throw Error('Sign in before publishing.');headers.Authorization='Bearer '+token;headers.apikey=cloud.publishableKey;}
 const response=await fetch(configured?cloud.url+'/functions/v1/gallery':'/api/images',{method:'POST',headers,body:file});const result=await response.json();if(!response.ok)throw Error(result.error||'Couldn’t publish. Try again.');return result;
}
export async function preparedPhoto(file){
 const img=await createImageBitmap(file,{imageOrientation:'from-image'});const ratio=img.height>img.width?2/3:3/2;
 const sw=Math.min(img.width,img.height*ratio),sh=sw/ratio;const scale=Math.min(1,2400/Math.max(sw,sh));
 const canvas=document.createElement('canvas');canvas.width=Math.round(sw*scale);canvas.height=Math.round(sh*scale);const ctx=canvas.getContext('2d');ctx.fillStyle='#f5f4ef';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,(img.width-sw)/2,(img.height-sh)/2,sw,sh,0,0,canvas.width,canvas.height);img.close();
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Couldn’t prepare this photograph.')),'image/jpeg',.88));
}

import {cloud} from './config.js?v=b71527aa4e21';
import {configured,accessToken} from './connection.js?v=b71527aa4e21';
export async function publishedPoems(){
 const response=await fetch(configured?cloud.url+'/rest/v1/rpc/published_poems_with_credits':'/api/poems',configured?{method:'POST',headers:{apikey:cloud.publishableKey,'Content-Type':'application/json'},body:'{}'}:{});
 if(!response.ok)throw Error('The collection could not be loaded.');return response.json();
}
async function headers(){const token=await accessToken();if(!token)throw Error('Sign in to open your studio.');return {apikey:cloud.publishableKey,Authorization:'Bearer '+token,'Content-Type':'application/json'};}
export async function loadStudio(){
 const response=await fetch(configured?cloud.url+'/rest/v1/poetry_collections?select=name,items,revision':'/api/studio',configured?{headers:await headers()}:{});
 if(!response.ok)throw Error('The studio could not be loaded.');const data=await response.json();if(!configured)return {...data,permissions:{editPoems:true,manageSubmissions:true,comment:false,role:'local',userId:null}};
 if(data.length!==2)throw Error('This account does not have studio access.');
 const roleResponse=await fetch(cloud.url+'/rest/v1/rpc/poetry_studio_permissions',{method:'POST',headers:await headers(),body:'{}'});
 if(!roleResponse.ok)throw Error('Studio permissions could not be checked. Please try again.');
 const permissions=await roleResponse.json();
 if(!permissions?.manageSubmissions)throw Error('This account does not have studio access.');
 return {permissions,drafts:data.find(x=>x.name==='drafts').items,submissions:data.find(x=>x.name==='submissions').items,revisions:Object.fromEntries(data.map(x=>[x.name,x.revision]))};
}
export async function saveCollection(name,items,revision){
 if(!['drafts','submissions'].includes(name)||!revision)throw Error('Reload the studio before saving.');
 const response=await fetch(configured?cloud.url+'/rest/v1/poetry_collections?name=eq.'+name+'&revision=eq.'+encodeURIComponent(revision):'/api/studio/'+name,{method:configured?'PATCH':'PUT',headers:configured?{...await headers(),Prefer:'return=representation'}:{'Content-Type':'application/json','If-Match':revision},body:JSON.stringify(configured?{items}:items)});
 if(!response.ok)throw Error('Could not save. Export your poem before reloading.');const data=await response.json();
 if(configured&&!data.length)throw Error('Changed on another device. Export your poem, then reload to see the latest version.');
 return configured?data[0].revision:data.revision;
}

const commentFields='id,poem_id,body,anchor,resolved,created_at,author_id';
async function commentRequest(query,method='GET',body){
 if(!configured)throw Error('Comments require the online studio.');
 const response=await fetch(cloud.url+'/rest/v1/poem_comments?'+query,{method,headers:{...await headers(),Prefer:'return=representation'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 if(!response.ok)throw Error('Comments could not be saved or loaded. Please try again.');
 return response.json();
}
export async function listPoemComments(poemId){
 if(!configured)return [];
 return commentRequest('select='+commentFields+'&poem_id=eq.'+encodeURIComponent(poemId)+'&order=created_at.asc');
}
export async function addPoemComment(poemId,body,anchor=''){
 body=String(body).trim();anchor=String(anchor);
 if(!poemId||!body||body.length>4000||anchor.length>300)throw Error('Use a comment of 1–4000 characters and a short selected excerpt (up to 300 characters).');
 const rows=await commentRequest('select='+commentFields,'POST',{poem_id:poemId,body,anchor});
 if(!rows.length)throw Error('The comment could not be saved.');return rows[0];
}
export async function resolvePoemComment(id,resolved){
 const rows=await commentRequest('select='+commentFields+'&id=eq.'+encodeURIComponent(id),'PATCH',{resolved:!!resolved});
 if(!rows.length)throw Error('The comment is no longer available.');return rows[0];
}

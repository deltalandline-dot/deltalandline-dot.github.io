import {cloud} from './config.js?v=310475587968';
import {configured,accessToken} from './connection.js?v=310475587968';
export async function publishedPoems(){
 const response=await fetch(configured?cloud.url+'/rest/v1/rpc/published_poems_with_credits':'/api/poems',configured?{method:'POST',headers:{apikey:cloud.publishableKey,'Content-Type':'application/json'},body:'{}'}:{});
 if(!response.ok)throw Error('The collection could not be loaded.');return response.json();
}
async function headers(){const token=await accessToken();if(!token)throw Error('Sign in to open your studio.');return {apikey:cloud.publishableKey,Authorization:'Bearer '+token,'Content-Type':'application/json'};}
export async function loadStudio(){
 const response=await fetch(configured?cloud.url+'/rest/v1/poetry_collections?select=name,items,revision':'/api/studio',configured?{headers:await headers()}:{});
 if(!response.ok)throw Error('The studio could not be loaded.');const data=await response.json();if(!configured)return data;
 if(data.length!==2)throw Error('This account does not have studio access.');
 return {drafts:data.find(x=>x.name==='drafts').items,submissions:data.find(x=>x.name==='submissions').items,revisions:Object.fromEntries(data.map(x=>[x.name,x.revision]))};
}
export async function saveCollection(name,items,revision){
 if(!['drafts','submissions'].includes(name)||!revision)throw Error('Reload the studio before saving.');
 const response=await fetch(configured?cloud.url+'/rest/v1/poetry_collections?name=eq.'+name+'&revision=eq.'+encodeURIComponent(revision):'/api/studio/'+name,{method:configured?'PATCH':'PUT',headers:configured?{...await headers(),Prefer:'return=representation'}:{'Content-Type':'application/json','If-Match':revision},body:JSON.stringify(configured?{items}:items)});
 if(!response.ok)throw Error('Could not save. Export your poem before reloading.');const data=await response.json();
 if(configured&&!data.length)throw Error('Changed on another device. Export your poem, then reload to see the latest version.');
 return configured?data[0].revision:data.revision;
}

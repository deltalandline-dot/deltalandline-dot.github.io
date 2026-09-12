import {cloud} from './config.js?v=a8d72114f8c7';
import {configured,accessToken} from './connection.js?v=a8d72114f8c7';
const fields='id,name,submission_url,format';
async function request(path,options={}){
 if(!configured)throw Error('The venue directory requires the online studio.');
 const token=await accessToken();if(!token)throw Error('Sign in to manage venues.');
 const response=await fetch(cloud.url+'/rest/v1/'+path,{...options,headers:{apikey:cloud.publishableKey,Authorization:'Bearer '+token,'Content-Type':'application/json'}});
 if(!response.ok)throw Error('The venue directory could not be saved or loaded. Please try again.');
 return response.json();
}
export async function listVenues(){
 if(!configured)return [];
 return request('poetry_venues?select='+fields+'&order=name.asc');
}
export async function saveVenue(venue){
 const name=String(venue.name||'').trim();
 if(!name||name.length>300)throw Error('Use a venue name of 1–300 characters.');
 const body={p_name:name};
 if(venue.id)body.p_id=venue.id;
 for(const key of ['submission_url','format'])if(venue[key]!==undefined){
  const value=String(venue[key]??'').trim();
  if(value.length>(key==='format'?500:2000))throw Error('The venue details are too long.');
  body['p_'+key]=value;
 }
 const rows=await request('rpc/save_poetry_venue',{method:'POST',body:JSON.stringify(body)});
 if(!rows.length)throw Error('The venue could not be saved. Reload the directory and try again.');
 return rows[0];
}

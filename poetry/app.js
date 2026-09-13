import {createSaveQueue} from '../shared/save-queue.js?v=b71527aa4e21';
import {querySubmissions} from '../shared/submission-query.js?v=b71527aa4e21';
import {listVenues,saveVenue} from '../shared/venues.js?v=b71527aa4e21';
import {exportPoemPDF} from '../shared/poem-pdf.js?v=b71527aa4e21';
import {analyzePoem} from '../shared/prosody.js?v=b71527aa4e21';
import {normalizeLayout,formatSelection,applyPoemLayout,renderPoem} from '../shared/poem-format.js?v=b71527aa4e21';
import {configured,accessToken,signIn,acceptSignInLink,signOut} from '../shared/connection.js?v=b71527aa4e21';
import {publishedPoems,loadStudio,saveCollection,listPoemComments,addPoemComment,resolvePoemComment} from '../shared/poetry-store.js?v=b71527aa4e21';
import {readingOrder} from './order.js?v=b71527aa4e21';
let venues=[],venueReady=false;const tableQueries=new Map();
let readerFlight=null,readerLoaded=false,studioFlight=null;
let backendReady=false,active,permissions={editPoems:false,manageSubmissions:false,comment:false},commentRequest=0,commentAnchor='';
const $=id=>document.getElementById(id),motion=matchMedia('(prefers-reduced-motion: reduce)');
const menu=$('studio-menu');$('studio-toggle').onclick=()=>{menu.hidden=!menu.hidden;$('studio-toggle').setAttribute('aria-expanded',String(!menu.hidden));};
function currentView(){const hash=location.hash.slice(1);if(['write','review'].includes(hash))return hash;const params=new URLSearchParams(hash);return params.has('access_token')||params.has('error_description')?'write':'read';}
function route(load=true){const view=currentView();for(const name of ['read','write','review'])$(name+'-view').hidden=name!==view;$('section-name').textContent=view==='read'?'':view.toUpperCase();menu.hidden=true;$('studio-toggle').setAttribute('aria-expanded','false');$('studio-auth').hidden=view==='read'||backendReady||!configured;
 if(view==='write'&&backendReady)openDraft(active);if(view==='review'&&backendReady)renderReview();
 for(const el of document.querySelectorAll('#write-view input,#write-view select,#write-view textarea,#write-view button,#review-view input,#review-view select,#review-view button'))el.disabled=!backendReady;
 $('studio-sign-out').hidden=!configured||!backendReady;applyPermissions();
 if(load!==false){if(view==='read')ensureReader();else ensureStudio();}
}
addEventListener('hashchange',route);addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){menu.hidden=true;$('studio-toggle').setAttribute('aria-expanded','false');$('studio-toggle').focus();}});
let index=0,count=0;const pages=$('pages');
function controls(){index=Math.round(pages.scrollLeft/Math.max(1,pages.clientWidth));$('previous').disabled=index<=0;$('next').disabled=index>=count-1;$('position').textContent=count?`${index+1} / ${count}`:'';}
function turn(direction){const target=Math.max(0,Math.min(count-1,index+direction));if(target===index)return;pages.scrollTo({left:target*pages.clientWidth,behavior:motion.matches?'instant':'smooth'});}
$('previous').onclick=()=>turn(-1);$('next').onclick=()=>turn(1);pages.addEventListener('scroll',controls,{passive:true});pages.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();turn(e.key==='ArrowRight'?1:-1);}});
let resizeTimer;addEventListener('resize',()=>{const current=index;clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{pages.scrollTo({left:current*pages.clientWidth,behavior:'instant'});controls();},100);});
function ensureReader(){if(readerLoaded)return Promise.resolve();if(!readerFlight)readerFlight=loadReader().finally(()=>{readerFlight=null;});return readerFlight;}
async function loadReader(){
try{const data=await publishedPoems();pages.replaceChildren();$('empty').hidden=true;const poems=data.filter(p=>typeof p.id==='string'&&typeof p.body==='string'&&p.published===true);let saved;try{saved=JSON.parse(sessionStorage.getItem('poetry-order'));}catch{}const order=readingOrder(poems,saved);try{sessionStorage.setItem('poetry-order',JSON.stringify(order));}catch{}count=order.length;for(const id of order){const poem=poems.find(p=>p.id===id),page=document.createElement('article'),content=document.createElement('div'),title=document.createElement('h1'),body=document.createElement('div');page.className='page';content.className='page-content';title.textContent=poem.title||'Untitled';body.className='poem';renderPoem(body,poem.body,poem.layout);const venues=Array.isArray(poem.publications)?[...new Set(poem.publications.filter(v=>typeof v==='string'&&v.trim()).map(v=>v.trim()))]:[];content.append(title,body);if(venues.length){const credit=document.createElement('p');credit.className='publication-credit';credit.textContent='Published in '+venues.join(', ');content.append(credit);}if(poem.author){const author=document.createElement('p');author.className='byline';author.textContent=poem.author;content.append(author);}page.append(content);pages.append(page);}if(count){pages.hidden=false;$('reader-footer').hidden=false;}if(!count){pages.hidden=true;$('empty').hidden=false;$('reader-footer').hidden=true;}controls();readerLoaded=true;}catch{pages.hidden=true;$('empty').hidden=false;$('reader-footer').hidden=true;$('empty-message').textContent='The collection couldn’t be loaded. Please try again later.';}
if(currentView()==='read')dispatchEvent(new Event('site-ready'));
}
const key='verse-web-drafts-v1';let drafts=[],revisions={},submissions=[];
function ensureStudio(){
 if(backendReady)return Promise.resolve();if(studioFlight)return studioFlight;
 $('studio-auth').hidden=true;$('save-state').textContent='Loading studio…';$('save-state').removeAttribute('data-state');
 studioFlight=(async()=>{
  try{await acceptSignInLink();
   if(!configured){try{const local=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(local))drafts=local;}catch{}}
   const studio=await loadStudio();drafts=studio.drafts;submissions=studio.submissions;revisions=studio.revisions;permissions=studio.permissions||{editPoems:false,manageSubmissions:false,comment:false};backendReady=true;active=drafts[0]?.id;
  }catch(error){$('save-state').textContent=configured?error.message:'Studio unavailable — export a copy';$('save-state').setAttribute('data-state','error');}
  route(false);if(currentView()!=='read')dispatchEvent(new Event('site-ready'));
  if(backendReady&&configured&&!venueReady)loadVenueDirectory();
 })().finally(()=>{studioFlight=null;});return studioFlight;
}
async function loadVenueDirectory(){try{venues=await listVenues();venueReady=true;renderVenues();}catch(error){submissionSaveState(error.message);}}
const draftSaves=createSaveQueue(async()=>{
 const snapshot=JSON.parse(JSON.stringify(drafts));
 if(!configured)localStorage.setItem(key,JSON.stringify(snapshot));
 revisions.drafts=await saveCollection('drafts',snapshot,revisions.drafts);
},{onState:(state,error)=>{$('save-state').textContent=state==='error'?error.message:state==='saved'?(configured?'Saved to your online studio':'Saved on this Mac'):'Saving…';$('save-state').setAttribute('data-state',state);}});
addEventListener('beforeunload',event=>{if(draftSaves.pending()||submissionSaves.pending()){event.preventDefault();event.returnValue='';}});
addEventListener('pagehide',()=>{draftSaves.flush();submissionSaves.flush();});
function persist(immediate=true){
 if(!permissions.editPoems)return Promise.resolve(false);
 if(!backendReady){$('save-state').textContent='Studio offline — export a copy';$('save-state').setAttribute('data-state','error');return Promise.resolve(false);}
 return draftSaves.save({immediate});
}
function list(){const root=$('draft-list'),scroll=root.scrollTop;root.replaceChildren();for(const draft of drafts){const button=document.createElement('button');button.textContent=draft.title||'Untitled';button.setAttribute('aria-current',String(draft.id===active));button.onclick=()=>openDraft(draft.id);root.append(button);}root.scrollTop=scroll;}
function openDraft(id){if(!drafts.length&&!permissions.editPoems)return;if(!drafts.length){drafts.push({id:crypto.randomUUID(),title:'',body:'',versions:[]});persist();}const draft=drafts.find(d=>d.id===id)||drafts[0];active=draft.id;$('draft-title').value=draft.title;$('draft-body').value=draft.body;list();history();renderDraftSubmissions();syncShape();$('analysis-result').replaceChildren();commentAnchor='';$('comment-selection').textContent='';$('comment-body').value='';renderComments();applyPermissions();}
function save(event){if(!permissions.editPoems)return;const draft=drafts.find(d=>d.id===active);if(!draft)return;draft.title=$('draft-title').value;draft.body=$('draft-body').value;if($('analysis-result').textContent)$('analysis-result').textContent='Poem changed. Analyze again to update estimates.';sizeEditor();persist(false);if(!event||event.target===$('draft-title'))list();}
$('draft-title').addEventListener('input',save);$('draft-body').addEventListener('input',save);
function sizeEditor(){const editor=$('draft-body');if(!editor||$('write-view').hidden)return;const y=scrollY;editor.style.height='0px';editor.style.height=Math.max(180,editor.scrollHeight+2)+'px';if(scrollY!==y)scrollTo({top:y,behavior:'instant'});}
let editorWidth=0;new ResizeObserver(entries=>{const width=entries[0].contentRect.width;if(width!==editorWidth){editorWidth=width;sizeEditor();}}).observe($('draft-body'));
let leaveEditorOnTab=false;
document.fonts?.ready.then(sizeEditor);
function syncShape(){const draft=drafts.find(d=>d.id===active);if(!draft)return;const layout=normalizeLayout(draft.layout);for(const key of ['alignment','fontSize','measure','lineSpacing'])$('shape-'+key).value=layout[key];applyPoemLayout($('draft-body'),layout);sizeEditor();}
for(const key of ['alignment','fontSize','measure','lineSpacing'])$('shape-'+key).onchange=()=>{const draft=drafts.find(d=>d.id===active);if(!draft||!backendReady||!permissions.editPoems)return;draft.layout=normalizeLayout({...normalizeLayout(draft.layout),[key]:key==='alignment'?$('shape-'+key).value:Number($('shape-'+key).value)});syncShape();persist();};
function shape(action){if(!backendReady||!permissions.editPoems)return;const editor=$('draft-body'),result=formatSelection(editor.value,editor.selectionStart,editor.selectionEnd,action);editor.value=result.text;editor.focus();editor.setSelectionRange(result.start,result.end);save();}
for(const button of document.querySelectorAll('[data-shape]'))button.onclick=()=>shape(button.dataset.shape);
$('draft-body').addEventListener('keydown',event=>{if(event.isComposing)return;if(event.key==='Escape'){leaveEditorOnTab=true;return;}if(event.key==='Tab'&&leaveEditorOnTab){leaveEditorOnTab=false;return;}leaveEditorOnTab=false;if(event.key==='Tab'&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&permissions.editPoems){event.preventDefault();const editor=$('draft-body');if(event.shiftKey){shape('outdent');}else if(editor.value.slice(editor.selectionStart,editor.selectionEnd).includes('\n')){shape('indent');}else{editor.setRangeText('\t',editor.selectionStart,editor.selectionEnd,'end');save();}return;}let action;if((event.metaKey||event.ctrlKey)&&event.key===']')action='indent';if((event.metaKey||event.ctrlKey)&&event.key==='[')action='outdent';if((event.metaKey||event.ctrlKey)&&event.altKey&&event.key==='ArrowUp')action='up';if((event.metaKey||event.ctrlKey)&&event.altKey&&event.key==='ArrowDown')action='down';if(action){event.preventDefault();shape(action);}});
$('analyze-poem').onclick=()=>{const result=analyzePoem($('draft-body').value),root=$('analysis-result');root.replaceChildren();const note=document.createElement('p');note.className='note';note.textContent=result.note;root.append(note);const table=document.createElement('table');table.className='analysis-table';const header=document.createElement('tr');for(const label of ['Line','Syllables ≈','Stress ≈','End word','Rhyme candidate']){const th=document.createElement('th');th.scope='col';th.textContent=label;header.append(th);}table.append(header);for(const line of result.lines){if(!line.syllables)continue;const row=document.createElement('tr');for(const value of [line.line,line.syllables,line.stress,line.endWord,line.rhyme||'—']){const cell=document.createElement('td');cell.textContent=String(value);row.append(cell);}table.append(row);}root.append(table);};
$('new-draft').onclick=()=>{if(!permissions.editPoems)return;const draft={id:crypto.randomUUID(),title:'',body:'',versions:[]};drafts.unshift(draft);persist();openDraft(draft.id);$('draft-body').focus();};
$('keep-draft').onclick=()=>{if(!permissions.editPoems)return;save();const draft=drafts.find(d=>d.id===active);draft.versions.unshift({date:new Date().toISOString(),title:draft.title,body:draft.body,layout:structuredClone(draft.layout||{})});persist();history();};
$('show-history').onclick=()=>{$('history').hidden=!$('history').hidden;$('show-history').setAttribute('aria-expanded',String(!$('history').hidden));};
function history(){const root=$('history');root.replaceChildren();const versions=drafts.find(d=>d.id===active)?.versions||[];if(!versions.length){root.textContent='No saved versions yet.';return;}for(const version of versions){const item=document.createElement('details'),summary=document.createElement('summary'),text=document.createElement('pre');item.className='history-item';summary.textContent=new Date(version.date).toLocaleString();text.textContent=version.title+'\n\n'+version.body;item.append(summary,text);root.append(item);}}
$('export-draft').onclick=()=>{save();draftSaves.flush();const draft=drafts.find(d=>d.id===active),url=URL.createObjectURL(new Blob([draft.title+'\n\n'+draft.body],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=(draft.title||'Untitled').replace(/[^a-z0-9 _-]/gi,'').slice(0,100)+'.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
function renderReview(){
 const root=$('publication-list'),select=$('submission-poem');root.replaceChildren();select.replaceChildren();
 if(!drafts.length)root.textContent='Create a poem in Write to get started.';
 for(const draft of drafts){
  const row=document.createElement('div'),title=document.createElement('button'),label=document.createElement('label'),check=document.createElement('input');row.className='publication-row';title.textContent=draft.title||'Untitled';title.type='button';title.className='poem-link';title.onclick=()=>{active=draft.id;location.hash='write';};check.type='checkbox';check.checked=draft.published===true;check.disabled=!draft.body.trim()||!backendReady||!permissions.editPoems;check.onchange=async()=>{if(!permissions.editPoems)return;draft.published=check.checked;check.disabled=true;const saved=await persist();$('review-state').textContent=saved?'Publication choice saved. Reload Read to see the updated collection.':'Could not confirm publication. Export your poem, then reload.';check.disabled=false;};label.append(check,document.createTextNode(' Published to site'));row.append(title,label);root.append(row);
  const option=document.createElement('option');option.value=draft.id;option.textContent=draft.title||'Untitled';select.append(option);
 }
 renderSubmissionTable($('submissions'),submissions);
}
function renderDraftSubmissions(){renderSubmissionTable($('draft-submissions'),submissions.filter(record=>record.poemId===active));}
function renderSubmissionTable(records,items){
 records.replaceChildren();
 const state=tableQueries.get(records.id)||{filters:{},sortKey:'',direction:'asc'};tableQueries.set(records.id,state);
 const columns=[['piece','Piece'],['venue','Venue'],['sent','Sent'],['submitBy','Submit by'],['status','Status'],['response','Response'],['notes','Notes']];
 const table=document.createElement('table'),head=document.createElement('thead'),header=document.createElement('tr'),filters=document.createElement('tr'),body=document.createElement('tbody');table.className='submission-table';table.setAttribute('aria-label','Submissions');
 const hint=document.createElement('p');hint.className='note';hint.id=records.id+'-filter-hint';hint.textContent='Filters match anywhere in the value. Type :empty to find blank entries.';
 const renderRows=()=>{body.replaceChildren();const selected=querySubmissions(items,drafts,state);for(const record of selected){const row=submissionRow(record);body.append(row,row.notesRow);}if(!selected.length){const row=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=7;cell.textContent=items.length?'No matching submissions.':'No submissions recorded.';row.append(cell);body.append(row);}};
 for(const [key,label] of columns){
  const cell=document.createElement('th'),button=document.createElement('button'),filterCell=document.createElement('th'),input=document.createElement('input');cell.scope='col';button.type='button';button.textContent=label;button.setAttribute('aria-label','Sort by '+label);cell.setAttribute('aria-sort',state.sortKey===key?(state.direction==='asc'?'ascending':'descending'):'none');
  button.onclick=()=>{state.direction=state.sortKey===key&&state.direction==='asc'?'desc':'asc';state.sortKey=key;for(const th of header.children)th.setAttribute('aria-sort','none');cell.setAttribute('aria-sort',state.direction==='asc'?'ascending':'descending');renderRows();};
  input.type='search';input.placeholder='Filter';input.value=state.filters[key]||'';input.setAttribute('aria-label','Filter '+label);input.title='Type :empty to find blank entries.';input.setAttribute('aria-describedby',hint.id);input.oninput=()=>{state.filters[key]=input.value;renderRows();};cell.append(button);filterCell.append(input);header.append(cell);filters.append(filterCell);
 }
 head.append(header,filters);table.append(head,body);records.append(table,hint);renderRows();
}
function submissionRow(record){
 const row=document.createElement('tr'),title=document.createElement('td'),status=document.createElement('select'),response=document.createElement('input'),notes=document.createElement('textarea');
 row.className='submission-record';
 const notesRow=document.createElement('tr'),notesBody=document.createElement('td');notesRow.className='submission-notes-row';notesRow.hidden=true;notesBody.colSpan=7;notesRow.append(notesBody);row.notesRow=notesRow;
 notesRow.id='submission-notes-'+(submissionRow.nextId=(submissionRow.nextId||0)+1);
 const piece=drafts.find(d=>d.id===record.poemId)?.title||record.pieceTitle||'Piece not specified';
 const linked=drafts.find(d=>d.id===record.poemId),pieceSelect=document.createElement('select'),open=document.createElement('button');
 pieceSelect.setAttribute('aria-label','Submitted piece');
 const unknown=document.createElement('option');unknown.value='';unknown.textContent=linked?'Unlinked piece':piece;pieceSelect.append(unknown);
 for(const draft of drafts){const option=document.createElement('option');option.value=draft.id;option.textContent=draft.title||'Untitled';pieceSelect.append(option);}pieceSelect.value=linked?.id||'';
 open.type='button';open.className='poem-link';open.textContent='↗';open.setAttribute('aria-label','Open submitted poem');open.hidden=!linked;open.onclick=()=>{if(!record.poemId)return;active=record.poemId;if(location.hash==='#write')openDraft(active);else location.hash='write';};
 pieceSelect.onchange=()=>{if(!permissions.manageSubmissions)return;const selected=drafts.find(d=>d.id===pieceSelect.value);record.poemId=selected?.id||null;record.pieceTitle=selected?.title||record.pieceTitle||piece;open.hidden=!selected;Promise.resolve(saveSubmissions()).then(()=>{if(location.hash==='#write')renderDraftSubmissions();});};title.append(pieceSelect,open);
 const venue=document.createElement('td'),sent=document.createElement('td'),deadline=document.createElement('td'),statusCell=document.createElement('td'),responseCell=document.createElement('td'),notesCell=document.createElement('td'),notesDetails=document.createElement('details'),notesSummary=document.createElement('summary'),venueInput=document.createElement('input'),sentInput=document.createElement('input'),deadlineInput=document.createElement('input');
 venueInput.value=record.magazine||'';venueInput.setAttribute('aria-label','Submission venue');venueInput.setAttribute('list','venue-options');venueInput.placeholder='Venue';venueInput.onchange=()=>{if(!permissions.manageSubmissions)return;record.magazine=venueInput.value.trim();saveSubmissions();rememberVenue(record.magazine);};
 sentInput.type='date';sentInput.value=record.sent||'';sentInput.setAttribute('aria-label','Date sent');sentInput.onchange=()=>{if(!permissions.manageSubmissions)return;record.sent=sentInput.value;saveSubmissions();};venue.append(venueInput);sent.append(sentInput);
 deadlineInput.type='date';deadlineInput.value=record.submitBy||'';deadlineInput.setAttribute('aria-label','Submit by');deadlineInput.onchange=()=>{if(!permissions.manageSubmissions)return;record.submitBy=deadlineInput.value;saveSubmissions();};deadline.append(deadlineInput);
 notesSummary.textContent=record.notes?'Notes •':'Notes';notesDetails.append(notesSummary);notesSummary.setAttribute('aria-controls',notesRow.id);notesSummary.setAttribute('aria-expanded','false');notesDetails.ontoggle=()=>{notesRow.hidden=!notesDetails.open;notesSummary.setAttribute('aria-expanded',String(notesDetails.open));};
 const statuses=['planned','on hold','submitted','accepted','rejected','withdrawn','closed'];
 // Keep unfamiliar imported values visible without assigning an outcome.
 if(!statuses.includes(record.status)){const option=document.createElement('option');option.value=record.status||'';option.textContent=record.status||'Status not recorded';status.append(option);}
 for(const value of statuses){const option=document.createElement('option');option.value=value;option.textContent=value;status.append(option);}
 status.value=record.status||'';status.setAttribute('aria-label','Submission status');
 response.type='date';response.value=record.response||'';response.setAttribute('aria-label','Response date');
 notes.value=record.notes||'';notes.placeholder='Notes';notes.setAttribute('aria-label','Submission notes');
 status.onchange=()=>{record.status=status.value;saveSubmissions();};response.onchange=()=>{record.response=response.value;saveSubmissions();};notes.onchange=()=>{record.notes=notes.value;notesSummary.textContent=record.notes?'Notes •':'Notes';saveSubmissions();};
 statusCell.append(status);responseCell.append(response);notesBody.append(notes);notesCell.append(notesDetails);row.append(title,venue,sent,deadline,statusCell,responseCell,notesCell);
 const fields=[['Submitted by',record.submittedBy],['Format',record.format],['Submission address',record.submitUrl],['Paid (source)',record.paid],['Status (source)',record.sourceStatus],['Accepted (source)',record.sourceAccepted],['Sheet row',record.sourceRow],['Source sheet',record.sourceSheet]];
 const present=fields.filter(([,value])=>value!==undefined&&value!==null&&String(value).trim()!=='');
 if(present.length){
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Imported details';details.append(summary);
  for(const [label,value] of present){const item=document.createElement('p');item.textContent=label+': '+String(value);details.append(item);}
  notesBody.append(details);
 }
 for(const control of [pieceSelect,venueInput,sentInput,deadlineInput,status,response,notes])control.disabled=!backendReady||!permissions.manageSubmissions;
 return row;

}
const submissionSaves=createSaveQueue(async()=>{const snapshot=JSON.parse(JSON.stringify(submissions));revisions.submissions=await saveCollection('submissions',snapshot,revisions.submissions);},{onState:(state,error)=>submissionSaveState(state==='error'?error.message:state==='saved'?(configured?'Saved to your online studio':'Saved on this Mac'):'Saving…',state)});
function submissionSaveState(message,state='error'){$('review-state').textContent=message;$('review-state').setAttribute('data-state',state);$('draft-submission-state').textContent=message;$('draft-submission-state').setAttribute('data-state',state);}
function saveSubmissions(){if(!permissions.manageSubmissions||!backendReady)return Promise.resolve(false);return submissionSaves.save({immediate:true});}
const pendingSubmissionForms=new Map();
async function addSubmission(event,prefix,poemId,render){
 event.preventDefault();if(!backendReady||!permissions.manageSubmissions||!poemId)return;
 const form=event.currentTarget;if(form.dataset.saving)return;form.dataset.saving='true';
 const fields=['magazine','sent','submit-by','venue-url','venue-format'];const values=Object.fromEntries(fields.map(key=>[key,$(prefix+key).value]));
 const pendingKey=prefix+':'+poemId;let record=pendingSubmissionForms.get(pendingKey);if(!record){record={id:crypto.randomUUID(),response:'',status:'submitted',notes:''};submissions.push(record);pendingSubmissionForms.set(pendingKey,record);}
 Object.assign(record,{poemId,...submissionVenue(prefix),magazine:values.magazine.trim(),sent:values.sent,submitBy:values['submit-by']});
 try{const saved=await saveSubmissions();if(!saved){render();return;}pendingSubmissionForms.delete(pendingKey);
 await rememberVenue(record.magazine,record.submitUrl,record.format);
 for(const key of ['magazine','submit-by','venue-url','venue-format'])if($(prefix+key).value===values[key])$(prefix+key).value='';
 render();}finally{delete form.dataset.saving;}
}
$('submission-form').onsubmit=event=>addSubmission(event,'',$('submission-poem').value,renderReview);
$('studio-note').textContent=configured?'Your private online workspace. Choose what to publish in Review.':'Drafts are saved on this Mac. Keep versions as you work, then choose what to publish in Review.';
$('studio-login-form').onsubmit=async e=>{e.preventDefault();$('studio-send').disabled=true;try{await signIn($('studio-email').value.trim(),new URL('./',location.href).href);$('studio-login-state').textContent='Open the sign-in email on this device.';}catch(error){$('studio-login-state').textContent=error.message;}finally{$('studio-send').disabled=false;}};
$('studio-sign-out').hidden=!configured||!backendReady;$('studio-sign-out').onclick=()=>{signOut();location.reload();};

function applyPermissions(){
 const canEdit=backendReady&&permissions.editPoems,canManage=backendReady&&permissions.manageSubmissions;
 $('draft-title').readOnly=!canEdit;$('draft-body').readOnly=!canEdit;
 for(const el of document.querySelectorAll('#new-draft,#keep-draft,[data-shape],.shape-fields input,.shape-fields select'))el.disabled=!canEdit;
 for(const el of document.querySelectorAll('#submission-form input,#submission-form select,#submission-form button,#draft-submission-form input,#draft-submission-form button,.submission-table input,.submission-table select,.submission-table textarea'))el.disabled=!canManage;
 for(const el of document.querySelectorAll('#publication-list input'))el.disabled=!canEdit;
 for(const el of document.querySelectorAll('#comment-form button,#comment-body'))el.disabled=!backendReady||!permissions.comment;
 if(backendReady&&!canEdit)$('studio-note').textContent='Editorial access: read poems, leave comments, and manage submissions. Poem text and publication choices are read-only.';
}
$('export-pdf').onclick=async()=>{const draft=drafts.find(d=>d.id===active);if(!draft)return;try{await exportPoemPDF({...draft,publications:[...new Set(submissions.filter(s=>s.poemId===active&&s.status==='accepted').map(s=>s.magazine).filter(Boolean))]});}catch(error){$('save-state').textContent=error.message;$('save-state').setAttribute('data-state','error');}};
$('draft-submission-form').onsubmit=event=>addSubmission(event,'draft-',active,renderDraftSubmissions);
$('comment-anchor').onclick=()=>{const editor=$('draft-body');commentAnchor=editor.value.slice(editor.selectionStart,editor.selectionEnd).slice(0,300);$('comment-selection').textContent=commentAnchor?'Selected: '+commentAnchor:'No words selected — this will be a general comment.';};
async function renderComments(){
 const request=++commentRequest,poemId=active,root=$('comments-list');root.replaceChildren();
 if(!permissions.comment){$('comment-state').textContent='Comments require online editorial access.';return;}
 $('comment-state').textContent='Loading comments…';
 try{const comments=await listPoemComments(poemId);if(request!==commentRequest||active!==poemId)return;$('comment-state').textContent=comments.length?'':'No comments yet.';
 for(const comment of comments){const item=document.createElement('article'),meta=document.createElement('p'),body=document.createElement('p'),resolve=document.createElement('button');item.className='comment-item';item.dataset.resolved=String(comment.resolved);meta.textContent=(comment.author_id===permissions.userId?'You':'Collaborator')+' · '+new Date(comment.created_at).toLocaleString();body.textContent=comment.body;
 item.append(meta);if(comment.anchor){const quote=document.createElement('blockquote');quote.textContent=comment.anchor;item.append(quote);}item.append(body);resolve.type='button';resolve.textContent=comment.resolved?'Reopen':'Resolve';resolve.onclick=async()=>{resolve.disabled=true;try{await resolvePoemComment(comment.id,!comment.resolved);if(active===poemId)renderComments();}catch(error){$('comment-state').textContent=error.message;resolve.disabled=false;}};item.append(resolve);root.append(item);}
 }catch(error){if(request===commentRequest)$('comment-state').textContent=error.message;}
}
$('comment-form').onsubmit=async event=>{event.preventDefault();if(!permissions.comment||!active)return;const poemId=active,body=$('comment-body').value.trim();if(!body)return;const submit=$('comment-form').querySelector('[type=submit]');submit.disabled=true;
 try{await addPoemComment(poemId,body,commentAnchor);if(active===poemId){$('comment-body').value='';commentAnchor='';$('comment-selection').textContent='';await renderComments();}}catch(error){$('comment-state').textContent=error.message;}finally{submit.disabled=false;}
};

function submissionVenue(prefix){return {submitUrl:$(prefix+'venue-url').value.trim(),format:$(prefix+'venue-format').value.trim()};}
function venueMatch(name){return venues.find(v=>v.name.trim().toLocaleLowerCase()===name.trim().toLocaleLowerCase());}
function renderVenues(){
 const options=$('venue-options');options.replaceChildren();for(const venue of venues){const option=document.createElement('option');option.value=venue.name;options.append(option);}
}
async function rememberVenue(name,submission_url,format){
 if(!configured||!permissions.manageSubmissions||!name.trim())return;
 try{const saved=await saveVenue({name:name.trim(),...(submission_url===undefined?{}:{submission_url}),...(format===undefined?{}:{format})});venues=venues.filter(v=>v.id!==saved.id);venues.push(saved);venues.sort((a,b)=>a.name.localeCompare(b.name));renderVenues();}
 catch(error){submissionSaveState('Venue directory: '+error.message);}
}
for(const prefix of ['', 'draft-']){
 $(prefix+'magazine').setAttribute('list','venue-options');
 $(prefix+'magazine').addEventListener('input',()=>{const match=venueMatch($(prefix+'magazine').value);if(match){$(prefix+'venue-url').value=match.submission_url||'';$(prefix+'venue-format').value=match.format||'';}});
 $(prefix+'magazine').addEventListener('change',()=>{const match=venueMatch($(prefix+'magazine').value);$(prefix+'venue-url').value=match?.submission_url||'';$(prefix+'venue-format').value=match?.format||'';});
}
route();

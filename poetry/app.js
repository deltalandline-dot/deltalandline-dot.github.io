import {exportPoemPDF} from '../shared/poem-pdf.js?v=3163301f6ef2';
import {analyzePoem} from '../shared/prosody.js?v=3163301f6ef2';
import {normalizeLayout,formatSelection,applyPoemLayout,renderPoem} from '../shared/poem-format.js?v=3163301f6ef2';
import {configured,accessToken,signIn,acceptSignInLink,signOut} from '../shared/connection.js?v=3163301f6ef2';
import {publishedPoems,loadStudio,saveCollection,listPoemComments,addPoemComment,resolvePoemComment} from '../shared/poetry-store.js?v=3163301f6ef2';
import {readingOrder} from './order.js?v=3163301f6ef2';
let backendReady=false,active,permissions={editPoems:false,manageSubmissions:false,comment:false},commentRequest=0,commentAnchor='';
const $=id=>document.getElementById(id),motion=matchMedia('(prefers-reduced-motion: reduce)');
const menu=$('studio-menu');$('studio-toggle').onclick=()=>{menu.hidden=!menu.hidden;$('studio-toggle').setAttribute('aria-expanded',String(!menu.hidden));};
function route(){const view=['write','review'].includes(location.hash.slice(1))?location.hash.slice(1):'read';for(const name of ['read','write','review'])$(name+'-view').hidden=name!==view;$('section-name').textContent=view==='read'?'':view.toUpperCase();menu.hidden=true;$('studio-toggle').setAttribute('aria-expanded','false');$('studio-auth').hidden=view==='read'||backendReady||!configured; if(view==='write'&&backendReady)openDraft(active);if(view==='review'&&backendReady)renderReview();for(const el of document.querySelectorAll('#write-view input,#write-view select,#write-view textarea,#write-view button,#review-view input,#review-view select,#review-view button'))el.disabled=!backendReady;applyPermissions();}
addEventListener('hashchange',route);addEventListener('keydown',e=>{if(e.key==='Escape'){menu.hidden=true;$('studio-toggle').setAttribute('aria-expanded','false');}});
let index=0,count=0;const pages=$('pages');
function controls(){index=Math.round(pages.scrollLeft/Math.max(1,pages.clientWidth));$('previous').disabled=index<=0;$('next').disabled=index>=count-1;$('position').textContent=count?`${index+1} / ${count}`:'';}
function turn(direction){const target=Math.max(0,Math.min(count-1,index+direction));if(target===index)return;pages.scrollTo({left:target*pages.clientWidth,behavior:motion.matches?'instant':'smooth'});}
$('previous').onclick=()=>turn(-1);$('next').onclick=()=>turn(1);pages.addEventListener('scroll',controls,{passive:true});pages.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();turn(e.key==='ArrowRight'?1:-1);}});
let resizeTimer;addEventListener('resize',()=>{const current=index;clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{pages.scrollTo({left:current*pages.clientWidth,behavior:'instant'});controls();},100);});
try{const data=await publishedPoems();const poems=data.filter(p=>typeof p.id==='string'&&typeof p.body==='string'&&p.published===true);let saved;try{saved=JSON.parse(sessionStorage.getItem('poetry-order'));}catch{}const order=readingOrder(poems,saved);try{sessionStorage.setItem('poetry-order',JSON.stringify(order));}catch{}count=order.length;for(const id of order){const poem=poems.find(p=>p.id===id),page=document.createElement('article'),content=document.createElement('div'),title=document.createElement('h1'),body=document.createElement('div');page.className='page';content.className='page-content';title.textContent=poem.title||'Untitled';body.className='poem';renderPoem(body,poem.body,poem.layout);const venues=Array.isArray(poem.publications)?[...new Set(poem.publications.filter(v=>typeof v==='string'&&v.trim()).map(v=>v.trim()))]:[];if(venues.length){const credit=document.createElement('p');credit.className='publication-credit';credit.textContent='Published in '+venues.join(', ');content.append(credit);}content.append(title,body);if(poem.author){const author=document.createElement('p');author.className='byline';author.textContent=poem.author;content.append(author);}page.append(content);pages.append(page);}if(count){pages.hidden=false;$('reader-footer').hidden=false;}if(!count){pages.hidden=true;$('empty').hidden=false;$('reader-footer').hidden=true;}controls();}catch{pages.hidden=true;$('empty').hidden=false;$('reader-footer').hidden=true;$('empty-message').textContent='The collection couldn’t be loaded. Please try again later.';}
dispatchEvent(new Event('site-ready'));
const key='verse-web-drafts-v1';let drafts=[];try{drafts=configured?[]:JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(drafts))drafts=[];}catch{}let revisions={},submissions=[],saveQueue=Promise.resolve();
try{await acceptSignInLink();const studio=await loadStudio();drafts=studio.drafts;submissions=studio.submissions;revisions=studio.revisions;permissions=studio.permissions||{editPoems:true,manageSubmissions:true,comment:false};backendReady=true;}catch(error){$('save-state').textContent=configured?error.message:'Studio unavailable — export a copy';}
active=drafts[0]?.id;
function persist(){
 if(!permissions.editPoems)return Promise.resolve(false);
 if(!configured)try{localStorage.setItem(key,JSON.stringify(drafts));}catch{}
 if(!backendReady){$('save-state').textContent='Studio offline — export a copy';return;}
 const snapshot=JSON.parse(JSON.stringify(drafts));$('save-state').textContent='Saving…';
 return saveQueue=saveQueue.catch(()=>{}).then(async()=>{revisions.drafts=await saveCollection('drafts',snapshot,revisions.drafts);$('save-state').textContent=configured?'Saved to your online studio':'Saved on this Mac';return true;}).catch(error=>{$('save-state').textContent=error.message;return false;});
}
function list(){const root=$('draft-list');root.replaceChildren();for(const draft of drafts){const button=document.createElement('button');button.textContent=draft.title||'Untitled';button.setAttribute('aria-current',String(draft.id===active));button.onclick=()=>openDraft(draft.id);root.append(button);}}
function openDraft(id){if(!drafts.length&&!permissions.editPoems)return;if(!drafts.length){drafts.push({id:crypto.randomUUID(),title:'',body:'',versions:[]});persist();}const draft=drafts.find(d=>d.id===id)||drafts[0];active=draft.id;$('draft-title').value=draft.title;$('draft-body').value=draft.body;list();history();renderDraftSubmissions();syncShape();$('analysis-result').replaceChildren();commentAnchor='';$('comment-selection').textContent='';$('comment-body').value='';renderComments();applyPermissions();}
function save(){if(!permissions.editPoems)return;const draft=drafts.find(d=>d.id===active);if(!draft)return;draft.title=$('draft-title').value;draft.body=$('draft-body').value;if($('analysis-result').textContent)$('analysis-result').textContent='Poem changed. Analyze again to update estimates.';renderPoem($('draft-preview'),draft.body,draft.layout);persist();list();}
$('draft-title').addEventListener('input',save);$('draft-body').addEventListener('input',save);
function syncShape(){const draft=drafts.find(d=>d.id===active);if(!draft)return;const layout=normalizeLayout(draft.layout);for(const key of ['alignment','fontSize','measure','lineSpacing','stanzaSpacing'])$('shape-'+key).value=layout[key];applyPoemLayout($('draft-body'),layout);renderPoem($('draft-preview'),draft.body,layout);}
for(const key of ['alignment','fontSize','measure','lineSpacing','stanzaSpacing'])$('shape-'+key).onchange=()=>{const draft=drafts.find(d=>d.id===active);if(!draft||!backendReady||!permissions.editPoems)return;draft.layout=normalizeLayout({...normalizeLayout(draft.layout),[key]:key==='alignment'?$('shape-'+key).value:Number($('shape-'+key).value)});syncShape();persist();};
function shape(action){if(!backendReady||!permissions.editPoems)return;const editor=$('draft-body'),result=formatSelection(editor.value,editor.selectionStart,editor.selectionEnd,action);editor.value=result.text;editor.focus();editor.setSelectionRange(result.start,result.end);save();}
for(const button of document.querySelectorAll('[data-shape]'))button.onclick=()=>shape(button.dataset.shape);
$('draft-body').addEventListener('keydown',event=>{if(event.isComposing)return;let action;if((event.metaKey||event.ctrlKey)&&event.key===']')action='indent';if((event.metaKey||event.ctrlKey)&&event.key==='[')action='outdent';if((event.metaKey||event.ctrlKey)&&event.altKey&&event.key==='ArrowUp')action='up';if((event.metaKey||event.ctrlKey)&&event.altKey&&event.key==='ArrowDown')action='down';if(action){event.preventDefault();shape(action);}});
$('analyze-poem').onclick=()=>{const result=analyzePoem($('draft-body').value),root=$('analysis-result');root.replaceChildren();const note=document.createElement('p');note.className='note';note.textContent=result.note;root.append(note);const table=document.createElement('table');table.className='analysis-table';const header=document.createElement('tr');for(const label of ['Line','Syllables ≈','Stress ≈','End word','Rhyme candidate']){const th=document.createElement('th');th.scope='col';th.textContent=label;header.append(th);}table.append(header);for(const line of result.lines){if(!line.syllables)continue;const row=document.createElement('tr');for(const value of [line.line,line.syllables,line.stress,line.endWord,line.rhyme||'—']){const cell=document.createElement('td');cell.textContent=String(value);row.append(cell);}table.append(row);}root.append(table);};
$('new-draft').onclick=()=>{if(!permissions.editPoems)return;const draft={id:crypto.randomUUID(),title:'',body:'',versions:[]};drafts.unshift(draft);persist();openDraft(draft.id);$('draft-body').focus();};
$('keep-draft').onclick=()=>{if(!permissions.editPoems)return;save();const draft=drafts.find(d=>d.id===active);draft.versions.unshift({date:new Date().toISOString(),title:draft.title,body:draft.body,layout:structuredClone(draft.layout||{})});persist();history();};
$('show-history').onclick=()=>{$('history').hidden=!$('history').hidden;$('show-history').setAttribute('aria-expanded',String(!$('history').hidden));};
function history(){const root=$('history');root.replaceChildren();const versions=drafts.find(d=>d.id===active)?.versions||[];if(!versions.length){root.textContent='No saved versions yet.';return;}for(const version of versions){const item=document.createElement('details'),summary=document.createElement('summary'),text=document.createElement('pre');item.className='history-item';summary.textContent=new Date(version.date).toLocaleString();text.textContent=version.title+'\n\n'+version.body;item.append(summary,text);root.append(item);}}
$('export-draft').onclick=()=>{save();const draft=drafts.find(d=>d.id===active),url=URL.createObjectURL(new Blob([draft.title+'\n\n'+draft.body],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=(draft.title||'Untitled').replace(/[^a-z0-9 _-]/gi,'').slice(0,100)+'.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
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
 records.replaceChildren();if(!items.length){records.textContent='No submissions recorded.';return;}
 const table=document.createElement('table'),head=document.createElement('thead'),header=document.createElement('tr'),body=document.createElement('tbody');table.className='submission-table';table.setAttribute('aria-label','Submissions');for(const label of ['Piece','Venue','Sent','Status','Response','Notes']){const cell=document.createElement('th');cell.scope='col';cell.textContent=label;header.append(cell);}head.append(header);for(const record of items){const row=submissionRow(record);body.append(row,row.notesRow);}table.append(head,body);records.append(table);
}
function submissionRow(record){
 const row=document.createElement('tr'),title=document.createElement('td'),status=document.createElement('select'),response=document.createElement('input'),notes=document.createElement('textarea');
 row.className='submission-record';
 const notesRow=document.createElement('tr'),notesBody=document.createElement('td');notesRow.className='submission-notes-row';notesRow.hidden=true;notesBody.colSpan=6;notesRow.append(notesBody);row.notesRow=notesRow;
 notesRow.id='submission-notes-'+(submissionRow.nextId=(submissionRow.nextId||0)+1);
 const piece=drafts.find(d=>d.id===record.poemId)?.title||record.pieceTitle||'Piece not specified';
 const linked=drafts.find(d=>d.id===record.poemId);if(linked){const link=document.createElement('button');link.type='button';link.className='poem-link';link.textContent=piece;link.onclick=()=>{active=linked.id;location.hash='write';};title.append(link);}else title.textContent=piece;const venue=document.createElement('td'),sent=document.createElement('td'),statusCell=document.createElement('td'),responseCell=document.createElement('td'),notesCell=document.createElement('td'),notesDetails=document.createElement('details'),notesSummary=document.createElement('summary');venue.textContent=record.magazine||'Venue not specified';sent.textContent=record.sent||'—';if(!record.sent)sent.title='Date not recorded';notesSummary.textContent=record.notes?'Notes •':'Notes';notesDetails.append(notesSummary);notesSummary.setAttribute('aria-controls',notesRow.id);notesSummary.setAttribute('aria-expanded','false');notesDetails.ontoggle=()=>{notesRow.hidden=!notesDetails.open;notesSummary.setAttribute('aria-expanded',String(notesDetails.open));};
 const statuses=['planned','on hold','submitted','accepted','rejected','withdrawn','closed'];
 // Keep unfamiliar imported values visible without assigning an outcome.
 if(!statuses.includes(record.status)){const option=document.createElement('option');option.value=record.status||'';option.textContent=record.status||'Status not recorded';status.append(option);}
 for(const value of statuses){const option=document.createElement('option');option.value=value;option.textContent=value;status.append(option);}
 status.value=record.status||'';status.setAttribute('aria-label','Submission status');
 response.type='date';response.value=record.response||'';response.setAttribute('aria-label','Response date');
 notes.value=record.notes||'';notes.placeholder='Notes';notes.setAttribute('aria-label','Submission notes');
 status.onchange=()=>{record.status=status.value;saveSubmissions();};response.onchange=()=>{record.response=response.value;saveSubmissions();};notes.onchange=()=>{record.notes=notes.value;notesSummary.textContent=record.notes?'Notes •':'Notes';saveSubmissions();};
 statusCell.append(status);responseCell.append(response);notesBody.append(notes);notesCell.append(notesDetails);row.append(title,venue,sent,statusCell,responseCell,notesCell);
 const fields=[['Submitted by',record.submittedBy],['Format',record.format],['Submission address',record.submitUrl],['Paid (source)',record.paid],['Status (source)',record.sourceStatus],['Accepted (source)',record.sourceAccepted],['Sheet row',record.sourceRow],['Source sheet',record.sourceSheet]];
 const present=fields.filter(([,value])=>value!==undefined&&value!==null&&String(value).trim()!=='');
 if(present.length){
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Imported details';details.append(summary);
  for(const [label,value] of present){const item=document.createElement('p');item.textContent=label+': '+String(value);details.append(item);}
  notesBody.append(details);
 }
 for(const control of [status,response,notes])control.disabled=!backendReady||!permissions.manageSubmissions;
 return row;

}
let submissionQueue=Promise.resolve();
function submissionSaveState(message){$('review-state').textContent=message;$('draft-submission-state').textContent=message;}
function saveSubmissions(){if(!permissions.manageSubmissions)return Promise.resolve();const snapshot=JSON.parse(JSON.stringify(submissions));submissionSaveState('Saving…');return submissionQueue=submissionQueue.catch(()=>{}).then(async()=>{revisions.submissions=await saveCollection('submissions',snapshot,revisions.submissions);submissionSaveState(configured?'Saved to your online studio':'Saved on this Mac');}).catch(error=>{submissionSaveState(error.message);});}
$('submission-form').onsubmit=async event=>{event.preventDefault();if(!backendReady||!permissions.manageSubmissions)return;submissions.push({id:crypto.randomUUID(),poemId:$('submission-poem').value,magazine:$('magazine').value.trim(),sent:$('sent').value,response:'',status:'submitted',notes:''});await saveSubmissions();$('magazine').value='';renderReview();};
$('studio-note').textContent=configured?'Your private online workspace. Choose what to publish in Review.':'Drafts are saved on this Mac. Keep versions as you work, then choose what to publish in Review.';
$('studio-login-form').onsubmit=async e=>{e.preventDefault();$('studio-send').disabled=true;try{await signIn($('studio-email').value.trim(),new URL('./',location.href).href);$('studio-login-state').textContent='Open the sign-in email on this device.';}catch(error){$('studio-login-state').textContent=error.message;}finally{$('studio-send').disabled=false;}};
$('studio-sign-out').hidden=!configured||!backendReady;$('studio-sign-out').onclick=()=>{signOut();location.reload();};
route();

function applyPermissions(){
 const canEdit=backendReady&&permissions.editPoems,canManage=backendReady&&permissions.manageSubmissions;
 $('draft-title').readOnly=!canEdit;$('draft-body').readOnly=!canEdit;
 for(const el of document.querySelectorAll('#new-draft,#keep-draft,[data-shape],.shape-fields input,.shape-fields select'))el.disabled=!canEdit;
 for(const el of document.querySelectorAll('#submission-form input,#submission-form select,#submission-form button,#draft-submission-form input,#draft-submission-form button,.submission-table input,.submission-table select,.submission-table textarea'))el.disabled=!canManage;
 for(const el of document.querySelectorAll('#publication-list input'))el.disabled=!canEdit;
 for(const el of document.querySelectorAll('#comment-form button,#comment-body'))el.disabled=!backendReady||!permissions.comment;
 if(backendReady&&!canEdit)$('studio-note').textContent='Editorial access: read poems, leave comments, and manage submissions. Poem text and publication choices are read-only.';
}
$('export-pdf').onclick=async()=>{const draft=drafts.find(d=>d.id===active);if(!draft)return;try{await exportPoemPDF({...draft,publications:[...new Set(submissions.filter(s=>s.poemId===active&&s.status==='accepted').map(s=>s.magazine).filter(Boolean))]});}catch(error){$('save-state').textContent=error.message;}};
$('draft-submission-form').onsubmit=async event=>{event.preventDefault();if(!backendReady||!permissions.manageSubmissions||!active)return;submissions.push({id:crypto.randomUUID(),poemId:active,magazine:$('draft-magazine').value.trim(),sent:$('draft-sent').value,response:'',status:'submitted',notes:''});await saveSubmissions();$('draft-magazine').value='';renderDraftSubmissions();};
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

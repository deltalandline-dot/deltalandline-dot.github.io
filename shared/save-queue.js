// Coalesce edits while keeping writes serialized and revision checks in the caller.
export function createSaveQueue(write,{delay=450,onState=()=>{}}={}){
 let generation=0,saved=0,running=false,timer=null,waiters=[],flushRequested=false;
 const pending=()=>generation!==saved;
 function schedule(ms){clearTimeout(timer);timer=setTimeout(run,ms);}
 async function run(){
  clearTimeout(timer);timer=null;if(running||!pending())return;
  running=true;const target=generation;let ok=false;
  try{await write();saved=target;ok=true;}catch(error){onState('error',error);}
  running=false;const completed=waiters.filter(w=>w.generation<=target);waiters=waiters.filter(w=>w.generation>target);for(const waiter of completed)waiter.resolve(ok);
  // A flush that arrived mid-write means the caller wants the next edit saved
  // right away (e.g. the page is unloading), not after the usual debounce.
  const immediate=flushRequested;flushRequested=false;
  if(generation>target){onState('saving');schedule(immediate?0:delay);}else if(ok)onState('saved');
 }
 return {
  pending,
  save({immediate=false}={}){generation++;onState('saving');const result=new Promise(resolve=>waiters.push({generation,resolve}));schedule(immediate?0:delay);return result;},
  flush(){if(!pending())return Promise.resolve(true);const result=new Promise(resolve=>waiters.push({generation,resolve}));if(running)flushRequested=true;else run();return result;}
 };
}

// Coalesce edits while keeping writes serialized and revision checks in the caller.
export function createSaveQueue(write,{delay=450,onState=()=>{}}={}){
 let generation=0,saved=0,running=false,timer=null,waiters=[];
 const pending=()=>generation!==saved;
 function schedule(ms){clearTimeout(timer);timer=setTimeout(run,ms);}
 async function run(){
  clearTimeout(timer);timer=null;if(running||!pending())return;
  running=true;const target=generation;let ok=false;
  try{await write();saved=target;ok=true;}catch(error){onState('error',error);}
  running=false;const completed=waiters.filter(w=>w.generation<=target);waiters=waiters.filter(w=>w.generation>target);for(const waiter of completed)waiter.resolve(ok);
  if(generation>target){onState('saving');schedule(delay);}else if(ok)onState('saved');
 }
 return {
  pending,
  save({immediate=false}={}){generation++;onState('saving');const result=new Promise(resolve=>waiters.push({generation,resolve}));schedule(immediate?0:delay);return result;},
  flush(){if(!pending())return Promise.resolve(true);const result=new Promise(resolve=>waiters.push({generation,resolve}));if(!running)run();return result;}
 };
}

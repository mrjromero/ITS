// Deterministic application tests. Fixtures are synthetic; no attendee data is logged.
// node gs/tests/departures-expiry.cjs <path-to-SheetJS-0.18.5-JS>
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const XLSX=require(path.resolve(process.argv[2]));
const html=fs.readFileSync(path.resolve(__dirname,'../departures.html'),'utf8');
const deadline=Date.parse('2026-11-06T00:00:00-05:00');
const wb=XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([
 ['Date','Time','Flight','Name','PAX','Union','Airline','Transportation Status'],
 ['Nov 4, 2026','7:50 AM','TEST1','Example Regular',2,'Example','Example',''],
 ['Nov 5, 2026','1:45 AM','TEST2','Example Overnight',1,'Example','Example',''],
 ['Nov 4, 2026','invalid','','Example. Separate','','','','arranged separately']
]),'Attendees');
XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([
 ['11/4/2026'],['7:00 AM - 7:50 AM','3:00 AM'],
 ['11/5/2026'],['1:45 AM - 1:45 AM','11/4/2026 10:00 PM']
]),'Departure Schedule');
const bytes=XLSX.write(wb,{type:'array',bookType:'xlsx'});
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
class Element {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.className='';this.style={};this.value='';this.disabled=false;this.listeners={};this._text='';this.classList={add:(...c)=>{this.className=[...new Set([...this.className.split(' ').filter(Boolean),...c])].join(' ');},remove:(...c)=>{this.className=this.className.split(' ').filter(x=>!c.includes(x)).join(' ');},contains:c=>this.className.split(' ').includes(c)};}
 set textContent(t){this._text=String(t);this.children=[];}
 get textContent(){return this._text+this.children.map(x=>x.textContent).join('');}
 append(...nodes){for(const n of nodes){n.parent=this;this.children.push(n);}}
 replaceChildren(...nodes){this._text='';this.children=[];this.append(...nodes);}
 addEventListener(k,f){this.listeners[k]=f;}
 scrollIntoView(){}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);}
 querySelectorAll(q){const result=[];for(const n of this.children){if(q[0]==='.'&&n.classList.contains(q.slice(1)))result.push(n);result.push(...n.querySelectorAll(q));}return result;}
 cloneNode(){const n=new Element(this.tagName);n.className=this.className;n._text=this._text;n.append(...this.children.map(c=>c.cloneNode()));return n;}
}
function app({now=deadline-10000,cutoff,fetcher,pdfReady}={}){
 const state={now,fetches:0,reads:0,pdfStarted:0,pdfSaved:0,clipboard:[],fileReaders:[],timers:new Map(),events:{},documentEvents:{}};
 const nodes=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element()]));
 for(const id of ['search','upload','export'])nodes[id].className='hidden';nodes.lang.value='en';
 class ClockDate extends Date {constructor(...a){super(...(a.length?a:[state.now]));}static now(){return state.now;}}
 let timerId=0;
 const context={Date:ClockDate,Intl,console:{warn(){},error(){}},AbortController,
  XLSX:{...XLSX,read(...a){state.reads++;return XLSX.read(...a);}},
  document:{getElementById:id=>nodes[id],createElement:t=>new Element(t),createTextNode:t=>{const n=new Element('#text');n.textContent=t;return n;},documentElement:{},addEventListener:(e,f)=>state.documentEvents[e]=f},
  navigator:{clipboard:{writeText:async t=>{state.clipboard.push(t);}}},
  FileReader:class{constructor(){state.fileReaders.push(this);}readAsArrayBuffer(){}},
  setTimeout:(f,ms)=>{const id=++timerId;state.timers.set(id,{f,at:state.now+ms});return id;},clearTimeout:id=>state.timers.delete(id),
  addEventListener:(e,f)=>state.events[e]=f,
  fetch:async(...a)=>{state.fetches++;return fetcher?fetcher(...a):{ok:true,arrayBuffer:async()=>bytes};},
  html2pdf:()=>{state.pdfStarted++;return {set(){return this;},from(e){state.pdfContent=e.textContent;return this;},toPdf(){return this;},get(){return (pdfReady||Promise.resolve()).then(()=>({save(){state.pdfSaved++;}}));}}}
 };
 context.window=context;
 let source=html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
 if(cutoff!==undefined)source=source.replace('2026-11-06T00:00:00-05:00',cutoff);
 source=source.replace('language();load();','window.test={process,load,search,display,displaySeparate,copy,pdf,language,watchExpiry,ensureEventOpen,departure,attendeeDeparture,groupPeople,get people(){return people},get rules(){return rules},get active(){return active},get clip(){return clip}};language();load();');
 vm.runInNewContext(source,context);
 return {state,nodes,test:context.test,async advance(ms){const target=state.now+ms;while(true){const next=[...state.timers].filter(([,v])=>v.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;state.now=next[1].at;state.timers.delete(next[0]);next[1].f();await flush();}state.now=target;await flush();}};
}
function assertClosed(a){
 for(const id of ['search','upload','export'])assert(a.nodes[id].classList.contains('hidden'),id+' hidden');
 for(const id of ['q','file','pdf'])assert(a.nodes[id].disabled,id+' disabled');
 assert.equal(a.nodes.results.textContent,'');assert.equal(a.nodes.printable.textContent,'');assert.equal(a.nodes.q.value,'');
 assert.equal(a.test.people.length,0);assert.equal(a.test.rules.length,0);assert.equal(a.test.active,null);assert.equal(a.test.clip,'');
}
(async()=>{
 // Cutoff is the end of November 5 in Bogotá, independent of the visitor's timezone.
 assert.equal(new Date(deadline).toISOString(),'2026-11-06T05:00:00.000Z');
 for(const tz of ['America/Bogota','Pacific/Honolulu','Asia/Tokyo']){
  process.env.TZ=tz;const a=app({now:deadline});await flush();assertClosed(a);assert.equal(a.state.fetches,0);assert.equal(a.state.reads,0);
  for(const [lang,title] of [['en','This event has ended'],['es','Este evento ha finalizado'],['fr','Cet événement est terminé']]){a.nodes.lang.value=lang;a.test.language();assert.equal(a.nodes.title.textContent,title);assertClosed(a);}
 }
 // The last instant of the final day still works; the exact cutoff clears an open result.
 const a=app({now:deadline-1});await flush();assert.equal(a.state.fetches,1);assert.equal(a.test.people.length,3);
 assert.equal(a.test.groupPeople().length,2);assert.equal(a.test.groupPeople().reduce((n,p)=>n+Number(p.PAX),0),3);
 a.test.search('example regular');a.nodes.results.children[0].onclick();assert(a.nodes.printable.textContent.includes('3:00 AM'));
 await a.advance(1);assertClosed(a);assert.equal(a.nodes.title.textContent,'This event has ended');
 a.state.now=deadline-100000;a.test.watchExpiry();assertClosed(a); // Clock rollback cannot reopen a closed tab.
 // All entry points reject attempts to show, import, copy or export expired data.
 const synthetic={Name:'Example Stale',Date:'Nov 4, 2026',Time:'7:50 AM'};
 a.test.process(bytes);a.test.display(synthetic);a.test.displaySeparate(synthetic);a.test.search('example');await a.test.copy(new Element('button'));a.test.pdf();await a.test.load();
 a.nodes.file.listeners.change({target:{files:[{}]}});assertClosed(a);assert.equal(a.state.fileReaders.length,0);assert.equal(a.state.clipboard.length,0);assert.equal(a.state.pdfStarted,0);assert.equal(a.state.fetches,1);
 // Pre-expiry language/search/clipboard/PDF handoff and overnight/exception behavior remain intact.
 const b=app();await flush();
 for(const [lang,title] of [['en','Transportation arranged separately'],['es','Transporte coordinado por separado'],['fr','Transport organisé séparément']]){
  b.nodes.lang.value=lang;b.test.language();b.test.search('example separate');b.nodes.results.children[0].onclick();assert(b.nodes.printable.textContent.includes(title));assert(!b.nodes.printable.textContent.includes('invalid'));assert(!b.nodes.printable.textContent.includes('PAX'));
  await b.test.copy(new Element('button'));assert(b.state.clipboard.at(-1).includes(title));b.test.pdf();await flush();assert(b.state.pdfContent.includes(title));
 }
 assert.equal(b.state.pdfSaved,3);b.nodes.lang.value='en';b.test.language();b.test.search('example overnight');b.nodes.results.children[0].onclick();assert(b.nodes.printable.textContent.includes('November 4, 2026, 10:00 PM'));assert.equal(b.test.departure('Nov 4, 2026','1:45 AM'),null);
 // Wake/resume/printing checks handle throttled background tabs without relying on a timer.
 for(const event of ['focus','pageshow','visibilitychange','beforeprint']){const c=app();await flush();c.test.display(c.test.people[0]);c.state.now=deadline;(c.state.events[event]||c.state.documentEvents[event])();assertClosed(c);}
 // A late response or error cannot resurrect the upload fallback or data.
 for(const fail of [false,true]){let bodiesRead=0;const d=deferred(),c=app({fetcher:()=>d.promise});await flush();c.state.now=deadline;fail?d.reject(Error('late failure')):d.resolve({ok:true,arrayBuffer:async()=>{bodiesRead++;return bytes;}});await flush();assertClosed(c);assert.equal(c.state.reads,0);assert.equal(bodiesRead,0);}
 // A pending manual file read is also checked on completion.
 const c=app({fetcher:async()=>{throw Error('offline');}});await flush();assert(!c.nodes.upload.classList.contains('hidden'));c.nodes.file.listeners.change({target:{files:[{}]}});assert.equal(c.state.fileReaders.length,1);c.state.now=deadline;c.state.fileReaders[0].onload({target:{result:bytes}});assertClosed(c);assert.equal(c.state.reads,0);
 // PDF generation started before expiry must not initiate a download afterward.
 const ready=deferred(),d=app({pdfReady:ready.promise});await flush();d.test.display(d.test.people[0]);d.test.pdf();d.state.now=deadline;ready.resolve();await flush();assert.equal(d.state.pdfStarted,1);assert.equal(d.state.pdfSaved,0);assertClosed(d);
 for(const cutoff of ['', 'not-a-date','2026-11-06T00:00:00','2026-02-30T00:00:00-05:00','2026-11-06T24:00:00-05:00','2026-13-06T00:00:00-05:00','2026-11-06T00:00:00+99:00']){const e=app({cutoff});await flush();assertClosed(e);assert.equal(e.nodes.title.textContent,'Departure lookup unavailable');assert.equal(e.state.fetches,0);}
 const future=app({now:deadline+1000,cutoff:'2040-11-06T00:00:00-05:00'});await flush();assert.equal(future.test.people.length,3);assert(!future.nodes.search.classList.contains('hidden'));
 // Long future events use a bounded timer rather than an overflowing multi-week timeout.
 assert([...future.state.timers.values()].every(t=>t.at-future.state.now<=60000));
 console.log('PASS: timezone/cutoff boundaries, zero expired fetches, 3 languages, cleared state, guarded interactions, delayed responses/import/PDF, resume/print checks, clock rollback, invalid config, future event, regular/exception/overnight regression. DOM and PDF generation are test doubles, not a rendered-browser test.');
})().catch(e=>{console.error(e);process.exitCode=1;});

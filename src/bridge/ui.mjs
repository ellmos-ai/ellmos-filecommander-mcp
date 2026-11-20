// FileCommander Bridge UI. Native tool output is always rendered as text.
export const HTML = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>FileCommander · Lokal</title>
<link rel="icon" href="data:,"><link rel="stylesheet" href="/style.css"><script src="/app.js" defer></script></head>
<body><div class="shell">
<header><div class="brand"><span class="monogram" aria-hidden="true">FC</span><div><h1>FileCommander</h1><p>Dein lokaler Datei- und Konsolenzugang</p></div></div><div id="connection-status" class="badge" role="status">Verbindung wird geprüft</div></header>
<section id="connect-panel" class="card connect"><p class="eyebrow">LOKALE VERBINDUNG</p><h2>Mit deinem Rechner verbinden</h2><p>Der Bridge-Start öffnet diese Seite mit dem passenden Verbindungsschlüssel. Falls du die Adresse selbst geöffnet hast, verwende den vollständigen Link aus dem Terminal.</p>
<form id="connect-form"><label for="connection-token">Verbindungsschlüssel</label><div class="row"><input id="connection-token" type="password" autocomplete="off" spellcheck="false" placeholder="Nur bei manueller Verbindung nötig"><button type="submit" id="connect-button">Verbinden</button></div></form>
<p class="hint">Der lokale Helfer führt die beauftragten Datei- und Konsolenaktionen mit den Rechten deines Benutzerkontos aus.</p></section>
<div id="message" role="alert" hidden></div>
<main id="workspace" hidden>
<section class="overview card" aria-label="Verbindungsinformationen"><div><span class="label">FileCommander</span><strong id="backend-version">—</strong></div><div><span class="label">Werkzeuge</span><strong id="tool-count">—</strong></div><div class="wide"><span class="label">Arbeitsordner</span><code id="working-directory">—</code></div><div class="wide"><span class="label">Installation</span><code id="installation-directory">—</code></div></section>
<div class="columns"><section class="card composer" aria-labelledby="compose-title"><div class="section-heading"><div><p class="eyebrow">WERKZEUGE</p><h2 id="compose-title">Auftrag erstellen</h2></div><span id="tool-kind" class="small-badge">—</span></div>
<div class="quick-actions" aria-label="Vorlagen"><button type="button" class="secondary" data-tool="fc_list_directory">Ordner</button><button type="button" class="secondary" data-tool="fc_read_file">Datei lesen</button><button type="button" class="secondary" data-tool="fc_execute_command">Befehl</button><button type="button" class="secondary" data-tool="fc_list_sessions">Sitzungen</button></div>
<label for="tool-filter">Werkzeuge filtern</label><input id="tool-filter" type="search" placeholder="Name oder Beschreibung" autocomplete="off">
<form id="tool-form"><label for="tool-select">Werkzeug</label><select id="tool-select" name="tool"></select>
<details class="tool-help"><summary>Beschreibung und Parameter</summary><pre id="tool-description"></pre><pre id="tool-schema"></pre></details>
<div class="field-heading"><label for="tool-arguments">Parameter als JSON</label><button type="button" id="reset-arguments" class="text-button">Vorlage einsetzen</button></div><textarea id="tool-arguments" name="arguments" rows="14" spellcheck="false" autocapitalize="off" autocomplete="off">{}</textarea>
<p id="argument-hint" class="hint">Windows-Pfade in JSON mit doppeltem Rückstrich oder mit / schreiben.</p><button id="execute-button" type="submit" class="primary">Auftrag ausführen</button></form></section>
<section class="card result-panel" aria-labelledby="result-title"><div class="section-heading"><div><p class="eyebrow">ERGEBNIS</p><h2 id="result-title">Bereit für deinen Auftrag</h2></div><span id="result-status" class="small-badge">—</span></div>
<p id="result-meta" class="hint">Hier erscheinen die Ergebnisse von FileCommander.</p><div id="result-body" class="result-body"><pre id="result-output" tabindex="0">Wähle ein Werkzeug und führe einen Auftrag aus.</pre></div>
<div id="result-pagination" class="pagination" hidden><button type="button" id="previous-page" class="secondary">Vorherige Seite</button><span id="page-label"></span><button type="button" id="next-page" class="secondary">Nächste Seite</button></div>
<details id="result-raw"><summary>Vollständige Antwort als JSON anzeigen</summary><p class="hint">Die Ausgabe oben zeigt dann die unveränderte Werkzeugantwort, in Seiten aufgeteilt.</p></details>
<div class="section-heading history-heading"><h3>Aufträge dieser Laufzeit</h3><button id="refresh-jobs" class="text-button" type="button">Aktualisieren</button></div><ol id="job-list" class="job-list"><li class="empty">Noch keine Aufträge.</li></ol></section></div>
<footer><p>Nur auf diesem Rechner · Das Terminal hält die Verbindung offen.</p><div class="footer-actions"><button id="restart-backend" class="text-button" type="button" title="Beendet laufende FileCommander-Sitzungen">FileCommander neu starten</button><button id="shutdown" class="secondary" type="button">Verbindung beenden</button></div></footer>
<details class="technical"><summary>Verbindungsdetails und Hinweise für die Weiterentwicklung</summary><pre id="connection-details"></pre><p>Nach Quellcodeänderungen im Repository zuerst npm run build ausführen und anschließend die Bridge neu starten. Paketupdates können installierte Dateien ersetzen. Ein FileCommander-Neustart beendet laufende Konsolensitzungen.</p></details>
</main><noscript>Für die lokale Bedienseite muss JavaScript aktiviert sein.</noscript></div></body></html>`;

export const STYLE_CSS = String.raw`
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#172b3b;background:#f2f5f7;font-synthesis:none;--accent:#126b58;--line:#dbe3e8;--muted:#5d6f7c;--surface:#fff}
*{box-sizing:border-box}body{margin:0}[hidden]{display:none!important}button,input,textarea,select{font:inherit}button{cursor:pointer}button:disabled{cursor:default;opacity:.5}button,input,select,textarea,summary{outline-offset:3px}button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,summary:focus-visible{outline:3px solid #74bbaa}button{border:1px solid transparent;background:var(--accent);color:white;padding:10px 15px;border-radius:8px;font-weight:600;transition:background .12s}button:hover:not(:disabled){background:#0d5848}button.secondary{background:#fff;border-color:var(--line);color:#233f50}button.secondary:hover:not(:disabled){background:#edf3f4}button.text-button{background:transparent;color:var(--accent);border:0;padding:4px 0;font-size:13px}button.text-button:hover{color:#0c493d;background:transparent;text-decoration:underline}.shell{max-width:1480px;margin:auto;padding:32px 36px 20px}header,.brand,.section-heading,.row,.field-heading,.pagination,footer,.footer-actions{display:flex;align-items:center;justify-content:space-between;gap:16px}header{margin-bottom:28px}.brand{justify-content:flex-start;gap:14px}.monogram{display:grid;place-items:center;width:48px;height:48px;border-radius:13px;background:#173e38;color:#e2fff5;font-weight:750;letter-spacing:-1px;font-size:20px}h1{font-size:24px;line-height:1.15;letter-spacing:-.7px;margin:0}header p{font-size:13px;color:var(--muted);margin:5px 0 0}.badge,.small-badge{font-size:12px;font-weight:650;line-height:1.4;padding:7px 10px;border-radius:7px;background:#e7edf1;color:#415a6c;white-space:nowrap}.badge.ok,.small-badge.ok{color:#146344;background:#dff3e9}.badge.error,.small-badge.error{color:#a52a30;background:#fff0ef}.badge.running,.small-badge.running{color:#886114;background:#fff2d6}.card{background:var(--surface);border:1px solid var(--line);border-radius:13px;box-shadow:0 2px 4px #173e3803}.connect{max-width:650px;padding:28px;margin:50px auto}.eyebrow{font-size:10px;letter-spacing:1.8px;color:var(--muted);font-weight:700;margin:0 0 7px}h2{font-size:20px;letter-spacing:-.4px;margin:0 0 12px}h3{font-size:14px;margin:0}.connect p{line-height:1.7}.connect .row input{min-width:0;flex:1}.hint{color:var(--muted);font-size:12px;line-height:1.6;margin:10px 0 15px}label,.label{display:block;font-size:12px;font-weight:650;color:#425b6c;margin:16px 0 7px}input,select,textarea{width:100%;border:1px solid #cbd6de;border-radius:7px;padding:10px 11px;background:#fff;color:#172b3b}input[type=search]{font-size:13px}select{font-size:13px;padding:11px 9px}textarea{font:12.5px/1.65 ui-monospace,SFMono-Regular,Consolas,monospace;resize:vertical;min-height:190px;tab-size:2}code,pre{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;line-height:1.65;margin:0}.overview{display:grid;grid-template-columns:130px 90px 1fr 1fr;gap:22px;padding:18px 22px;margin-bottom:20px}.overview .label{margin:0 0 7px;font-size:10px;letter-spacing:.5px;font-weight:650}.overview strong{font-size:15px}.overview code{display:block;font-size:12px;line-height:1.65;overflow-wrap:anywhere}.columns{display:grid;grid-template-columns:minmax(310px,.9fr) minmax(410px,1.35fr);gap:20px;align-items:start}.composer,.result-panel{padding:24px}.section-heading{align-items:flex-start}.section-heading h2{margin-bottom:0}.quick-actions{display:flex;gap:6px;flex-wrap:wrap;margin:22px 0 17px}.quick-actions button{font-size:12px;padding:7px 10px}.tool-help{margin:13px 0 6px;font-size:12px}.tool-help summary,.technical summary,#result-raw summary{color:var(--accent);cursor:pointer;font-size:12px;font-weight:600}.tool-help pre{margin-top:12px;max-height:220px;overflow:auto;color:#526977}.field-heading{margin:19px 0 8px}.field-heading label{margin:0}.primary{width:100%}.result-body{border:1px solid #e0e7ec;border-radius:8px;background:#f7f9fa;padding:16px;min-height:265px;max-height:510px;overflow:auto}.result-body pre{font-size:12px;line-height:1.65}.pagination{margin:12px 0}.pagination button{font-size:11px;padding:6px 8px}.pagination span{font-size:11px;color:var(--muted);text-align:center}#result-raw{margin-top:12px}.history-heading{margin:29px 0 12px;align-items:center}.job-list{list-style:none;margin:0;padding:0;max-height:330px;overflow:auto}.job-list li{border-top:1px solid #edf1f4}.job-list li.empty{font-size:12px;color:var(--muted);padding:20px 0}.job-list button{background:transparent;color:#314957;display:flex;justify-content:space-between;align-items:center;gap:12px;width:100%;text-align:left;border-radius:5px;font-weight:500;font-size:12px;padding:12px 9px}.job-list button:hover:not(:disabled),.job-list button.selected{background:#edf5f2}.job-name{font-family:ui-monospace,Consolas,monospace;font-size:11px;overflow-wrap:anywhere}.job-list .small-badge{font-size:10px;padding:4px 6px}.job-time{color:var(--muted);font-size:10px;display:block;margin-top:4px}footer{padding:22px 2px 10px;color:var(--muted);font-size:12px;flex-wrap:wrap}.footer-actions button{font-size:12px}.technical{padding:8px 2px 10px}.technical pre{margin-top:14px}.technical p{font-size:12px;color:var(--muted);line-height:1.7;max-width:800px}#message{padding:13px 16px;border:1px solid #efcbc4;background:#fff2ef;color:#852e2a;border-radius:8px;font-size:13px;margin:0 0 20px;white-space:pre-wrap}#message.info{background:#edf7f2;border-color:#c9e0d4;color:#265745}@media(max-width:950px){.shell{padding:23px 20px}.columns{grid-template-columns:1fr}.overview{grid-template-columns:1fr 1fr}.overview .wide{grid-column:auto}}@media(max-width:550px){.shell{padding:18px 12px}header{align-items:flex-start;gap:10px;flex-wrap:wrap}.brand h1{font-size:22px}.overview{padding:17px;gap:15px}.overview .wide{grid-column:1/-1}.composer,.result-panel{padding:19px}.badge{font-size:11px}.footer-actions{width:100%;justify-content:space-between;flex-wrap:wrap}.connect{margin:25px 0;padding:20px}.connect .row{flex-wrap:wrap}.connect .row input{flex-basis:100%}}
`;

export const CLIENT_JS = String.raw`
'use strict';
const $ = (id) => document.getElementById(id);
const PAGE_SIZE = 20000;
let csrfToken = '', tools = [], currentStatus = null, connected = false, selectedJobId = null, selectedJob = null;
let renderedOutput = '', outputPage = 0, polling = false, stopping = false, lastStatusAt = 0;
let pendingRequest = null, busySubmitting = false, lastJobFingerprint = '';
const labelStatus = (s) => ({queued:'Wartet',running:'Läuft',succeeded:'Fertig',completed:'Fertig',failed:'Fehler',cancelled:'Beendet'}[s] || s || '—');
const classStatus = (s) => ['succeeded','completed'].includes(s) ? 'ok' : ['failed','cancelled'].includes(s) ? 'error' : ['running','queued'].includes(s) ? 'running' : '';
function message(text, info=false) { $('message').textContent=text; $('message').className=info?'info':''; $('message').hidden=!text; }
function connection(text, kind='') { $('connection-status').textContent=text; $('connection-status').className='badge '+kind; }
async function api(path, body) {
  const headers={Accept:'application/json'};
  const options={method:body===undefined?'GET':'POST',headers,credentials:'same-origin',cache:'no-store'};
  if(body!==undefined){headers['Content-Type']='application/json';if(csrfToken)headers['X-FC-CSRF']=csrfToken;options.body=JSON.stringify(body);}
  let response;
  try{response=await fetch(path,options);}catch{throw new Error('Der lokale Helfer ist nicht erreichbar. Prüfe, ob das Terminal noch geöffnet ist.');}
  const data=await response.json().catch(()=>({error:'Keine gültige Antwort vom lokalen Helfer.'}));
  if(!response.ok){const detail=typeof data.error==='string'?data.error:data.error?.message || data.message || 'Anfrage fehlgeschlagen';const error=new Error(detail);error.status=response.status;throw error;}
  return data;
}
function templateFor(tool) {
  const schema=tool?.inputSchema || {}, props=schema.properties || {}, required=new Set(schema.required || []), out={};
  for(const [key,p] of Object.entries(props)) {
    if(Object.prototype.hasOwnProperty.call(p,'default')) out[key]=p.default;
    else if(required.has(key)) out[key]=p.type==='array'?[]:p.type==='object'?{}:p.type==='boolean'?false:['number','integer'].includes(p.type)?(p.minimum||0):'';
  }
  if(tool?.name==='fc_list_directory')out.path=currentStatus?.cwd || '';
  return out;
}
function showTool(reset=true) {
  const tool=tools.find(t=>t.name===$('tool-select').value);
  $('tool-description').textContent=tool?.description || '';
  $('tool-schema').textContent=tool?JSON.stringify(tool.inputSchema,null,2):'';
  $('tool-kind').textContent=tool?.annotations?.readOnlyHint?'Lesend':'Dateien / Prozesse';
  $('execute-button').disabled=!tool || !connected || busySubmitting;
  if(reset)$('tool-arguments').value=JSON.stringify(templateFor(tool),null,2);
}
function populateTools(preferred) {
  const previous=preferred || $('tool-select').value;
  const filter=$('tool-filter').value.trim().toLowerCase();
  $('tool-select').replaceChildren();
  for(const tool of tools.filter(t=>!filter || [t.name,t.title,t.description].join(' ').toLowerCase().includes(filter))){const option=document.createElement('option');option.value=tool.name;option.textContent=tool.name+(tool.title?' · '+tool.title:'');$('tool-select').append(option);}
  if(Array.from($('tool-select').options).some(o=>o.value===previous))$('tool-select').value=previous;
  const changed=$('tool-select').value!==previous;
  showTool(changed || !previous);
}
function renderStatus(status) {
  currentStatus=status;lastStatusAt=Date.now();if(status.csrfToken)csrfToken=status.csrfToken;
  const backend=status.backend || {}, version=backend.version || backend.serverInfo?.version || status.backendVersion || 'bereit';
  $('backend-version').textContent=version;
  $('tool-count').textContent=String(backend.toolCount ?? tools.length);
  $('working-directory').textContent=status.cwd || '—';
  $('installation-directory').textContent=status.appDir || status.dataDir || status.starterPath || '—';
  const safe={version:status.version,backend:backend,cwd:status.cwd,appDir:status.appDir,dataDir:status.dataDir,starterPath:status.starterPath,platform:status.platform,port:status.port};
  $('connection-details').textContent=JSON.stringify(safe,null,2);
  if(status.state==='error' || backend.alive===false || backend.ready===false || backend.state==='failed' || backend.state==='stopped' || backend.available===false)connection('FileCommander nicht bereit','error');
  else connection('Verbunden · lokal','ok');
}
async function finishConnection() {
  renderStatus(await api('/api/status'));
  const list=await api('/api/tools');tools=Array.isArray(list)?list:list.tools || [];
  connected=true;stopping=false;$('connect-panel').hidden=true;$('workspace').hidden=false;
  $('tool-count').textContent=String(tools.length);
  populateTools('fc_list_directory');showTool(true);message('');
  await refreshJobs();schedulePoll();
}
async function connectWithToken(token) {
  if(!token)throw new Error('Bitte den vollständigen Link aus dem Terminal öffnen.');
  const result=await api('/api/connect',{token});csrfToken=result.csrfToken || '';
  $('connection-token').value='';history.replaceState(null,'',location.pathname+location.search);
  await finishConnection();
}
function formatResult(job) {
  if(job.error){const error=typeof job.error==='string'?job.error:JSON.stringify(job.error,null,2);return error+(job.result?'\n\n'+JSON.stringify(job.result,null,2):'');}
  if(!job.result)return job.status==='running' || job.status==='queued'?'Der Auftrag läuft. Die Ausgabe wird automatisch aktualisiert.':'Noch keine Ausgabe.';
  if($('result-raw').open)return JSON.stringify(job.result,null,2);
  const blocks=Array.isArray(job.result.content)?job.result.content:[];
  const text=blocks.map(b=>b.type==='text'?b.text:b.type==='image'?'[Bildinhalt · '+(b.mimeType||'image')+']':b.type==='audio'?'[Audioinhalt]':JSON.stringify(b,null,2)).join('\n\n');
  const structured=job.result.structuredContent;
  return (text || (structured?JSON.stringify(structured,null,2):JSON.stringify(job.result,null,2)))+(job.resultTruncated?'\n\n[Die Antwort wurde wegen ihrer Größe begrenzt. Details in der vollständigen JSON-Antwort.]':'');
}
function renderPage() {
  const count=Math.max(1,Math.ceil(renderedOutput.length/PAGE_SIZE));outputPage=Math.max(0,Math.min(outputPage,count-1));
  $('result-output').textContent=renderedOutput.slice(outputPage*PAGE_SIZE,(outputPage+1)*PAGE_SIZE);
  $('result-pagination').hidden=count<=1;$('page-label').textContent='Seite '+(outputPage+1)+' / '+count+' · '+renderedOutput.length.toLocaleString('de-DE')+' Zeichen';
  $('previous-page').disabled=outputPage===0;$('next-page').disabled=outputPage>=count-1;
}
function renderJob(job) {
  const fingerprint=JSON.stringify([job.id,job.status,job.updatedAt,job.finishedAt,job.result,job.error]);
  if(fingerprint===lastJobFingerprint)return;
  lastJobFingerprint=fingerprint;selectedJob=job;
  $('result-title').textContent=job.tool || job.name || 'Auftrag';
  $('result-status').textContent=labelStatus(job.status);$('result-status').className='small-badge '+classStatus(job.status);
  const stamp=job.createdAt?new Date(job.createdAt).toLocaleString('de-DE'):'';
  $('result-meta').textContent='Auftrag '+job.id+(stamp?' · '+stamp:'');
  renderedOutput=formatResult(job);renderPage();
}
function clearSelectedJob() {
  selectedJobId=null;selectedJob=null;lastJobFingerprint='';outputPage=0;
  $('result-title').textContent='Ergebnis nicht mehr im Verlauf';
  $('result-status').textContent='—';$('result-status').className='small-badge';
  $('result-meta').textContent='Der Verlauf ist begrenzt. Ältere Ergebnisse werden automatisch entfernt.';
  renderedOutput='Wähle einen vorhandenen Auftrag oder erstelle einen neuen.';renderPage();
  for(const button of $('job-list').querySelectorAll('button'))button.classList.remove('selected');
}
async function selectJob(id) {
  if(selectedJobId!==id){outputPage=0;lastJobFingerprint='';}
  selectedJobId=id;
  let data;
  try{data=await api('/api/jobs/'+encodeURIComponent(id));}
  catch(error){if(error.status!==404)throw error;if(selectedJobId===id)clearSelectedJob();return;}
  if(selectedJobId!==id)return;
  renderJob(data.job || data);
  for(const button of $('job-list').querySelectorAll('button'))button.classList.toggle('selected',button.dataset.id===id);
}
async function refreshJobs() {
  const data=await api('/api/jobs'), jobs=Array.isArray(data)?data:data.jobs || [];
  if(selectedJobId && !jobs.some(job=>job.id===selectedJobId))clearSelectedJob();
  if(!selectedJobId && jobs.length)selectedJobId=jobs.slice().sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))[0].id;
  $('job-list').replaceChildren();
  if(!jobs.length){const li=document.createElement('li');li.className='empty';li.textContent='Noch keine Aufträge.';$('job-list').append(li);}
  for(const job of jobs.slice().sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,40)) {
    const li=document.createElement('li'), button=document.createElement('button'), info=document.createElement('span'), name=document.createElement('span'), time=document.createElement('span'), status=document.createElement('span');
    button.type='button';button.dataset.id=job.id;button.className=job.id===selectedJobId?'selected':'';
    name.className='job-name';name.textContent=job.tool || job.name || job.id;
    time.className='job-time';time.textContent=(job.createdAt?new Date(job.createdAt).toLocaleTimeString('de-DE')+' · ':'')+job.id.slice(0,8);
    info.append(name,time);status.className='small-badge '+classStatus(job.status);status.textContent=labelStatus(job.status);button.append(info,status);li.append(button);$('job-list').append(li);
    button.addEventListener('click',()=>selectJob(job.id).catch(e=>message(e.message)));
  }
  if(selectedJobId)await selectJob(selectedJobId);
}
async function refreshPollingState() {
  const statusCheck=Date.now()-lastStatusAt>12000?api('/api/status').then(renderStatus):Promise.resolve();
  const [jobsResult,statusResult]=await Promise.allSettled([refreshJobs(),statusCheck]);
  if(statusResult.status==='rejected')throw statusResult.reason;
  if(jobsResult.status==='rejected') {
    const error=jobsResult.reason;
    if(!error.status || error.status===401 || error.status===403)throw error;
    message('Der Auftragsverlauf konnte nicht aktualisiert werden. '+error.message);
  }
}
function schedulePoll() {
  if(polling || !connected || stopping)return;polling=true;
  setTimeout(async()=>{try{if(!connected || stopping)return;if(document.visibilityState==='visible')await refreshPollingState();}catch(e){connection('Verbindung unterbrochen','error');if(e.status===401){connected=false;$('connect-panel').hidden=false;message('Die Sitzung ist abgelaufen. Öffne den aktuellen Link aus dem Terminal.');}else message(e.message);}finally{polling=false;schedulePoll();}},['running','queued'].includes(selectedJob?.status)?900:3000);
}
$('connect-form').addEventListener('submit',async e=>{e.preventDefault();$('connect-button').disabled=true;try{await connectWithToken($('connection-token').value.trim());}catch(error){message(error.message);connection('Nicht verbunden','error');}finally{$('connect-button').disabled=false;}});
$('tool-filter').addEventListener('input',()=>populateTools());
$('tool-select').addEventListener('change',()=>showTool(true));
$('reset-arguments').addEventListener('click',()=>showTool(true));
for(const button of document.querySelectorAll('[data-tool]'))button.addEventListener('click',()=>{$('tool-filter').value='';populateTools(button.dataset.tool);showTool(true);$('tool-arguments').focus();});
$('tool-form').addEventListener('submit',async e=>{
  e.preventDefault();if(busySubmitting || !connected)return;
  let args;try{args=JSON.parse($('tool-arguments').value);if(!args || Array.isArray(args) || typeof args!=='object')throw new Error();}catch{message('Die Parameter müssen ein gültiges JSON-Objekt sein, zum Beispiel {"path":"C:/Users"}.');return;}
  const body={tool:$('tool-select').value,arguments:args}, fingerprint=JSON.stringify(body);
  if(!pendingRequest || pendingRequest.fingerprint!==fingerprint)pendingRequest={fingerprint,id:crypto.randomUUID()};
  body.clientRequestId=pendingRequest.id;busySubmitting=true;$('execute-button').disabled=true;message('');
  try{const data=await api('/api/call',body);pendingRequest=null;selectedJobId=(data.job || data).id;outputPage=0;lastJobFingerprint='';try{await refreshJobs();}catch(error){message('Auftrag '+selectedJobId+' wurde angenommen. Das Ergebnis konnte noch nicht geladen werden. Klicke auf Aktualisieren.\n'+error.message);}}
  catch(error){message(error.message+(error.status?'':'\nDer Auftrag könnte bereits angekommen sein. Aktualisiere die Aufträge. Ein erneutes Absenden unveränderter Parameter verwendet dieselbe Auftragskennung.'));}
  finally{busySubmitting=false;$('execute-button').disabled=!connected;}
});
$('refresh-jobs').addEventListener('click',()=>refreshJobs().then(()=>message('')).catch(e=>message(e.message)));
$('previous-page').addEventListener('click',()=>{outputPage--;renderPage();});$('next-page').addEventListener('click',()=>{outputPage++;renderPage();});
$('result-raw').addEventListener('toggle',()=>{if(selectedJob){outputPage=0;renderedOutput=formatResult(selectedJob);renderPage();}});
$('restart-backend').addEventListener('click',async()=>{const b=$('restart-backend');b.disabled=true;try{message('FileCommander wird neu gestartet. Laufende Konsolensitzungen werden beendet.',true);await api('/api/restart-backend',{});await finishConnection();message('FileCommander wurde neu gestartet.',true);}catch(e){message(e.message);}finally{b.disabled=false;}});
$('shutdown').addEventListener('click',async()=>{stopping=true;$('shutdown').disabled=true;try{await api('/api/shutdown',{});connected=false;connection('Verbindung beendet');$('execute-button').disabled=true;$('restart-backend').disabled=true;message('Der lokale Helfer wurde beendet. Für die nächste Verbindung die Startdatei erneut ausführen.',true);}catch(e){stopping=false;$('shutdown').disabled=false;message(e.message);schedulePoll();}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible' && connected && !stopping)refreshJobs().catch(e=>message(e.message));});
(async()=>{
  const fragment=location.hash.slice(1), token=fragment.startsWith('token=')?new URLSearchParams(fragment).get('token'):fragment;
  try{if(token)await connectWithToken(token);else await finishConnection();}
  catch(e){connection('Nicht verbunden');$('connect-panel').hidden=false;if(e.status!==401)message(e.message);}
})();
`;

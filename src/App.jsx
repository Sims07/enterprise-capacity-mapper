import React,{useEffect,useMemo,useState} from 'react';
import {DEMO_MODEL} from './data/demoData.js';
import {exportModel,importModel,loadModel,saveModel} from './services/storage.js';
import {loadRemoteModel,normalizeJsonUrl} from './services/remote.js';

const uid=p=>`${p}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
const emptyForm={name:'',code:'',description:'',status:'Actif',type:'SaaS',vendor:'',domainId:'',capabilityIds:[]};

function Modal({title,children,onClose}){return <div className="modal-backdrop"><div className="modal"><div className="modal-head"><h2>{title}</h2><button onClick={onClose}>×</button></div>{children}</div></div>}
function Field({label,...p}){return <label className="field"><span>{label}</span><input {...p}/></label>}
function App(){
 const [model,setModel]=useState(()=>loadModel(DEMO_MODEL)); const [mode,setMode]=useState('editor');
 const [sourceUrl,setSourceUrl]=useState(()=>localStorage.getItem('enterprise-capacity-mapper:source-url')||'');
 const [selected,setSelected]=useState([]); const [query,setQuery]=useState(''); const [status,setStatus]=useState('');
 const [modal,setModal]=useState(null); const [form,setForm]=useState(emptyForm);
 useEffect(()=>saveModel(model),[model]);
 const apps=model.applications;
 const filteredApps=useMemo(()=>apps.filter(a=>(a.name+' '+a.code+' '+a.vendor).toLowerCase().includes(query.toLowerCase())),[apps,query]);
 const touched=apps.filter(a=>(a.capabilityIds||[]).some(id=>selected.includes(id)));
 const gaps=model.capabilities.filter(c=>selected.includes(c.id)&&!apps.some(a=>(a.capabilityIds||[]).includes(c.id)));
 const redundancy=model.capabilities.filter(c=>apps.filter(a=>(a.capabilityIds||[]).includes(c.id)).length>1);
 const notify=x=>{setStatus(x);setTimeout(()=>setStatus(''),2500)};
 const update=(patch)=>setModel(m=>({...m,...patch}));
 const openNew=(kind,parent)=>{setForm({...emptyForm,domainId:parent||'',capabilityIds:parent?[parent]:[]});setModal(kind)};
 const save=()=>{
   if(!form.name.trim()){notify('Le nom est obligatoire');return}
   if(modal==='domain')update({domains:[...model.domains,{id:uid('l0'),code:form.code||'CAP',name:form.name,description:form.description,color:'indigo'}]});
   if(modal==='capability')update({capabilities:[...model.capabilities,{id:uid('l1'),domainId:form.domainId,code:form.code||'CAP-01',name:form.name,description:form.description}]});
   if(modal==='app')update({applications:[...model.applications,{id:uid('app'),name:form.name,code:form.code||'APP',type:form.type,status:form.status,vendor:form.vendor,capabilityIds:form.capabilityIds,description:form.description}]});
   setModal(null);
 };
 const removeDomain=id=>{const caps=model.capabilities.filter(c=>c.domainId===id).map(c=>c.id);update({domains:model.domains.filter(d=>d.id!==id),capabilities:model.capabilities.filter(c=>c.domainId!==id),applications:apps.map(a=>({...a,capabilityIds:(a.capabilityIds||[]).filter(x=>!caps.includes(x))}))});notify('Domaine et dépendances supprimés');};
 const toggleCap=id=>setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
 const assign=(appId,capId)=>update({applications:apps.map(a=>a.id===appId?{...a,capabilityIds:Array.from(new Set([...(a.capabilityIds||[]),capId]))}:a)});
 const unassign=(appId,capId)=>update({applications:apps.map(a=>a.id===appId?{...a,capabilityIds:(a.capabilityIds||[]).filter(x=>x!==capId)}:a)});
 const onDrop=(e,capId)=>{e.preventDefault();const id=e.dataTransfer.getData('app');if(id)assign(id,capId)};
 const importJson=async e=>{const f=e.target.files?.[0];if(!f)return;try{update(await importModel(f));notify('Cartographie importée');}catch(err){notify(err.message)}e.target.value=''};
 return <div className="app">
  <header><div><div className="eyebrow">ENTERPRISE ARCHITECTURE</div><h1>Capacity Mapper</h1></div>
   <div className="toolbar"><button className={mode==='editor'?'active':''} onClick={()=>setMode('editor')}>▦ Cartographie</button><button className={mode==='impact'?'active':''} onClick={()=>setMode('impact')}>⚡ Impact</button><button onClick={()=>openNew('domain')}>＋ Domaine</button><button onClick={()=>openNew('app')}>＋ Application</button><button onClick={()=>exportModel(model)}>↓ Export</button><button onClick={async()=>{const u=prompt('URL du fichier JSON public (GitHub raw ou URL HTTPS)',sourceUrl);if(u===null)return;const n=normalizeJsonUrl(u);if(!n)return;try{const remote=await loadRemoteModel(n);setModel(remote);setSourceUrl(n);localStorage.setItem('enterprise-capacity-mapper:source-url',n);notify('Source JSON distante chargée');}catch(e){notify(e.message)}}}>↗ JSON distant</button><label className="button">↑ Import<input hidden type="file" accept=".json,application/json" onChange={importJson}/></label></div>
  </header>
  <div className="workspace">
   <aside><div className="panel-title">Inventaire SI <span>{apps.length}</span></div><input className="search" placeholder="Rechercher une application…" value={query} onChange={e=>setQuery(e.target.value)}/><div className="hint">Glissez une application vers une capacité pour créer une relation.</div>
   {filteredApps.map(a=><div key={a.id} className="app-item" draggable onDragStart={e=>e.dataTransfer.setData('app',a.id)}><div><b>{a.name}</b><small>{a.code} · {a.vendor||'—'}</small></div><span className={'badge '+a.status.toLowerCase().replace('é','e')}>{a.status}</span></div>)}
   </aside>
   <main>{mode==='impact'?<section className="impact"><div className="hero"><div><div className="eyebrow">SIMULATION D'IMPACT</div><h2>Projet / fonctionnalité</h2><p>Sélectionnez les capacités sollicitées pour calculer les applications touchées et les gaps.</p></div><div className="metric"><strong>{selected.length}</strong><span>capacités</span></div><div className="metric"><strong>{touched.length}</strong><span>applications</span></div><div className="metric danger"><strong>{gaps.length}</strong><span>gaps</span></div></div>
     <div className="impact-grid"><div className="impact-card"><h3>Capacités sollicitées</h3>{model.capabilities.map(c=><button key={c.id} className={'cap-select '+(selected.includes(c.id)?'selected':'')} onClick={()=>toggleCap(c.id)}>{selected.includes(c.id)?'✓':'○'} {c.code} — {c.name}</button>)}</div><div className="impact-card"><h3>Applications impactées</h3>{touched.length?<>{touched.map(a=><div className="result-row" key={a.id}><b>{a.name}</b><span>{a.status}</span></div>)}</>:<p className="empty">Aucune application impactée.</p>}{gaps.length>0&&<div className="gap-box"><b>⚠ {gaps.length} gap(s) de couverture</b>{gaps.map(c=><div key={c.id}>{c.code} — {c.name}</div>)}</div>}</div></div>
   </section>:<><div className="canvas-head"><div><div className="eyebrow">CAPABILITY MAP · V2</div><h2>Cartographie des capacités</h2><p>{model.metadata?.description||'Modélisez les capacités métier et leur couverture applicative.'}</p></div><div className="stats"><span>{model.domains.length} L0</span><span>{model.capabilities.length} L1</span><span>{apps.length} Apps</span><span>{redundancy.length} doublons</span></div></div>
    <div className="domains">{model.domains.map(d=><section className="domain" key={d.id}><div className="domain-head"><div><span className="code">{d.code}</span><h3>{d.name}</h3><p>{d.description}</p></div><div><button onClick={()=>openNew('capability',d.id)}>＋ L1</button><button className="ghost danger-text" onClick={()=>removeDomain(d.id)}>Suppr.</button></div></div><div className="caps">{model.capabilities.filter(c=>c.domainId===d.id).map(c=><div className={'cap '+(selected.includes(c.id)?'highlight':'')} key={c.id} onDragOver={e=>e.preventDefault()} onDrop={e=>onDrop(e,c.id)}><div className="cap-head"><div><span className="code">{c.code}</span><b>{c.name}</b></div><span className="count">{apps.filter(a=>(a.capabilityIds||[]).includes(c.id)).length}</span></div><p>{c.description}</p><div className="relations">{apps.filter(a=>(a.capabilityIds||[]).includes(c.id)).map(a=><div className="rel" key={a.id} draggable onDragStart={e=>e.dataTransfer.setData('app',a.id)}><span>◈</span>{a.name}<button onClick={()=>unassign(a.id,c.id)}>×</button></div>)}<div className="drop">Déposer une application ici</div></div></div>)}</div></section>)}</div>
   </>}</main>
  </div>
  {status&&<div className="toast">{status}</div>}
  {modal&&<Modal title={modal==='domain'?'Nouveau domaine L0':modal==='capability'?'Nouvelle capacité L1':'Nouvelle application'} onClose={()=>setModal(null)}><Field label="Nom" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><Field label="Code" value={form.code} onChange={e=>setForm({...form,code:e.target.value})}/>{modal==='capability'&&<label className="field"><span>Domaine</span><select value={form.domainId} onChange={e=>setForm({...form,domainId:e.target.value})}>{model.domains.map(d=><option value={d.id} key={d.id}>{d.code} — {d.name}</option>)}</select></label>}{modal==='app'&&<><Field label="Éditeur / fournisseur" value={form.vendor} onChange={e=>setForm({...form,vendor:e.target.value})}/><label className="field"><span>Statut</span><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Actif</option><option>Cible</option><option>Obsolète</option></select></label><label className="field"><span>Type</span><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option>SaaS</option><option>ERP</option><option>On-Premise</option><option>Shadow IT</option></select></label></>}<Field label="Description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/><div className="modal-actions"><button onClick={()=>setModal(null)}>Annuler</button><button className="primary" onClick={save}>Créer</button></div></Modal>}
 </div>
}
export default App;
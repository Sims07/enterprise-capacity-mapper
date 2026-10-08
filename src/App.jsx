import React,{useEffect,useMemo,useState} from 'react';
import {DEMO_MODEL} from './data/demoData.js';
import {exportModel,importModel,loadModel,saveModel} from './services/storage.js';
import {loadRemoteModel,normalizeJsonUrl} from './services/remote.js';

const uid=p=>`${p}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
const emptyForm={name:'',code:'',description:'',status:'Actif',type:'SaaS',vendor:'',domainId:'',capabilityIds:[]};
const DEFAULT_LAYOUTS={columns:[{id:'business',name:'Business',order:0},{id:'operations',name:'Operations',order:1},{id:'support',name:'Support',order:2}],layers:[{id:'strategic',name:'Stratégique',order:0},{id:'core',name:'Core / Value',order:1},{id:'support',name:'Support',order:2}]};

function Modal({title,children,onClose}){return <div className="modal-backdrop"><div className="modal"><div className="modal-head"><h2>{title}</h2><button onClick={onClose}>×</button></div>{children}</div></div>}
function Field({label,...p}){return <label className="field"><span>{label}</span><input {...p}/></label>}

function App(){
 const [model,setModel]=useState(()=>loadModel(DEMO_MODEL));
 const [mode,setMode]=useState('editor');
 const [sourceUrl,setSourceUrl]=useState(()=>localStorage.getItem('enterprise-capacity-mapper:source-url')||'');
 const [selected,setSelected]=useState([]);
 const [query,setQuery]=useState('');
 const [status,setStatus]=useState('');
 const [modal,setModal]=useState(null);
 const [form,setForm]=useState(emptyForm);
 const [editingDomainId,setEditingDomainId]=useState(null);
 const [layoutDraft,setLayoutDraft]=useState(null);
 const [layoutMode,setLayoutMode]=useState(model.layout?.mode||'matrix');

 useEffect(()=>saveModel(model),[model]);
 const apps=model.applications||[];
 const filteredApps=useMemo(()=>apps.filter(a=>(a.name+' '+a.code+' '+a.vendor).toLowerCase().includes(query.toLowerCase())),[apps,query]);
 const touched=apps.filter(a=>(a.capabilityIds||[]).some(id=>selected.includes(id)));
 const gaps=model.capabilities.filter(c=>selected.includes(c.id)&&!apps.some(a=>(a.capabilityIds||[]).includes(c.id)));
 const redundancy=model.capabilities.filter(c=>apps.filter(a=>(a.capabilityIds||[]).includes(c.id)).length>1);
 const notify=x=>{setStatus(x);setTimeout(()=>setStatus(''),2500)};
 const update=patch=>setModel(m=>({...m,...patch}));
 const layout=model.layout||{mode:'matrix',columns:DEFAULT_LAYOUTS.columns,layers:DEFAULT_LAYOUTS.layers};
 const columns=layout.columns?.length?layout.columns:DEFAULT_LAYOUTS.columns;
 const layers=layout.layers?.length?layout.layers:DEFAULT_LAYOUTS.layers;
 const zones=columns.flatMap(column=>layers.map(layer=>layout.zones?.find(zone=>zone.columnId===column.id&&zone.layerId===layer.id)||{id:`${column.id}:${layer.id}`,columnId:column.id,layerId:layer.id,name:column.name}));
 const setLayoutView=m=>{setLayoutMode(m);update({layout:{...layout,mode:m}})};
 const openLayoutEditor=()=>{setLayoutDraft({columns:columns.map(x=>({...x})),layers:layers.map(x=>({...x})),zones:zones.map(x=>({...x}))});setModal('layout')};
 const completeZones=(nextColumns,nextLayers,currentZones)=>nextColumns.flatMap(column=>nextLayers.map(layer=>currentZones.find(zone=>zone.columnId===column.id&&zone.layerId===layer.id)||{id:`${column.id}:${layer.id}`,columnId:column.id,layerId:layer.id,name:column.name}));
 const updateLayoutDraft=(kind,id,name)=>setLayoutDraft(d=>{
   const items=d[kind].map(x=>x.id===id?{...x,name}:x);
   const nextColumns=kind==='columns'?items:d.columns;
   const nextLayers=kind==='layers'?items:d.layers;
   return {...d,[kind]:items,zones:completeZones(nextColumns,nextLayers,d.zones)};
 });
 const updateZoneDraft=(columnId,layerId,name)=>setLayoutDraft(d=>({...d,zones:d.zones.map(zone=>zone.columnId===columnId&&zone.layerId===layerId?{...zone,name}:zone)}));
 const addLayoutItem=kind=>setLayoutDraft(d=>{
   const items=[...d[kind],{id:uid(kind==='columns'?'column':'layer'),name:kind==='columns'?'Nouvelle colonne':'Nouvelle layer',order:d[kind].length}];
   const nextColumns=kind==='columns'?items:d.columns;
   const nextLayers=kind==='layers'?items:d.layers;
   return {...d,[kind]:items,zones:completeZones(nextColumns,nextLayers,d.zones)};
 });
 const removeLayoutItem=(kind,id)=>setLayoutDraft(d=>{
   if(d[kind].length<=1)return d;
   const items=d[kind].filter(x=>x.id!==id).map((x,i)=>({...x,order:i}));
   const nextColumns=kind==='columns'?items:d.columns;
   const nextLayers=kind==='layers'?items:d.layers;
   return {...d,[kind]:items,zones:completeZones(nextColumns,nextLayers,d.zones)};
 });
 const saveLayout=()=>{
   if(!layoutDraft.columns.length||!layoutDraft.layers.length||[...layoutDraft.columns,...layoutDraft.layers,...layoutDraft.zones].some(x=>!x.name.trim())){notify('Chaque colonne, layer et zone doit avoir un nom');return}
   const columnIds=new Set(layoutDraft.columns.map(x=>x.id));
   const layerIds=new Set(layoutDraft.layers.map(x=>x.id));
   const nextColumns=layoutDraft.columns.map((x,i)=>({...x,name:x.name.trim(),order:i}));
   const nextLayers=layoutDraft.layers.map((x,i)=>({...x,name:x.name.trim(),order:i}));
   const validZones=layoutDraft.zones.filter(zone=>columnIds.has(zone.columnId)&&layerIds.has(zone.layerId)).map(zone=>({...zone,name:zone.name.trim()}));
   const zoneKeys=new Set(validZones.map(zone=>`${zone.columnId}:${zone.layerId}`));
   nextColumns.forEach(column=>nextLayers.forEach(layer=>{
     if(!zoneKeys.has(`${column.id}:${layer.id}`))validZones.push({id:`${column.id}:${layer.id}`,columnId:column.id,layerId:layer.id,name:column.name});
   }));
   update({layout:{...layout,columns:nextColumns,layers:nextLayers,zones:validZones},domains:model.domains.map((d,i)=>({...d,layout:{...(d.layout||{}),columnId:columnIds.has(d.layout?.columnId)?d.layout.columnId:nextColumns[i%nextColumns.length].id,layerId:layerIds.has(d.layout?.layerId)?d.layout.layerId:nextLayers[0].id}}))});
   setModal(null);
   notify('Structure de la cartographie enregistrée');
 };
 const createBlankMap=()=>{
   if(!window.confirm('Créer une cartographie vierge ? Les domaines, capacités et applications actuels seront supprimés.'))return;
   update({metadata:{...model.metadata,name:'Nouvelle cartographie',description:''},domains:[],capabilities:[],applications:[]});
   setSelected([]);
   setMode('editor');
   notify('Cartographie vierge créée');
 };
 const placeDomain=(domainId,columnId,layerId)=>{
   if(!domainId)return;
   update({layout:{...layout,mode:layoutMode,columns,layers},domains:model.domains.map(d=>d.id===domainId?{...d,layout:{...(d.layout||{}),columnId:columnId||d.layout?.columnId||columns[0].id,layerId:layerId||d.layout?.layerId||layers[0].id}}:d)});
 };
 const openNew=(kind,parent)=>{setEditingDomainId(null);setForm({...emptyForm,domainId:parent||'',capabilityIds:parent?[parent]:[]});setModal(kind)};
 const openEditDomain=d=>{setEditingDomainId(d.id);setForm({...emptyForm,name:d.name,code:d.code,description:d.description||''});setModal('edit-domain')};
 const save=()=>{
   if(!form.name.trim()){notify('Le nom est obligatoire');return}
   if(modal==='domain')update({domains:[...model.domains,{id:uid('l0'),code:form.code||'CAP',name:form.name,description:form.description,color:'indigo',layout:{columnId:columns[0].id,layerId:layers[0].id}}]});
   if(modal==='edit-domain')update({domains:model.domains.map(d=>d.id===editingDomainId?{...d,name:form.name.trim(),code:form.code.trim()||d.code,description:form.description}:d)});
   if(modal==='capability')update({capabilities:[...model.capabilities,{id:uid('l1'),domainId:form.domainId,code:form.code||'CAP-01',name:form.name,description:form.description}]});
   if(modal==='app')update({applications:[...apps,{id:uid('app'),name:form.name,code:form.code||'APP',type:form.type,status:form.status,vendor:form.vendor,capabilityIds:form.capabilityIds,description:form.description}]});
   setModal(null);
 };
 const removeDomain=id=>{
   const caps=model.capabilities.filter(c=>c.domainId===id).map(c=>c.id);
   update({domains:model.domains.filter(d=>d.id!==id),capabilities:model.capabilities.filter(c=>c.domainId!==id),applications:apps.map(a=>({...a,capabilityIds:(a.capabilityIds||[]).filter(x=>!caps.includes(x))}))});
   notify('Domaine et dépendances supprimés');
 };
 const toggleCap=id=>setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
 const assign=(appId,capId)=>update({applications:apps.map(a=>a.id===appId?{...a,capabilityIds:Array.from(new Set([...(a.capabilityIds||[]),capId]))}:a)});
 const unassign=(appId,capId)=>update({applications:apps.map(a=>a.id===appId?{...a,capabilityIds:(a.capabilityIds||[]).filter(x=>x!==capId)}:a)});
 const onDrop=(e,capId)=>{e.preventDefault();const id=e.dataTransfer.getData('app');if(id)assign(id,capId)};
 const importJson=async e=>{const f=e.target.files?.[0];if(!f)return;try{update(await importModel(f));notify('Cartographie importée')}catch(err){notify(err.message)}e.target.value=''};

 const DomainCard=({d})=><section className="domain" draggable onDragStart={e=>e.dataTransfer.setData('domain',d.id)} key={d.id}>
   <div className="domain-head"><div><span className="code">{d.code}</span><h3>{d.name}</h3><p>{d.description}</p></div><div><button onClick={()=>openEditDomain(d)}>Modifier</button><button onClick={()=>openNew('capability',d.id)}>＋ L1</button><button className="ghost danger-text" onClick={()=>removeDomain(d.id)}>Suppr.</button></div></div>
   <div className="caps">{model.capabilities.filter(c=>c.domainId===d.id).map(c=><div className={'cap '+(selected.includes(c.id)?'highlight':'')} key={c.id} onDragOver={e=>e.preventDefault()} onDrop={e=>onDrop(e,c.id)}>
     <div className="cap-head"><div><span className="code">{c.code}</span><b>{c.name}</b></div><span className="count">{apps.filter(a=>(a.capabilityIds||[]).includes(c.id)).length}</span></div>
     <p>{c.description}</p>
     <div className="relations">{apps.filter(a=>(a.capabilityIds||[]).includes(c.id)).map(a=><div className="rel" key={a.id} draggable onDragStart={e=>e.dataTransfer.setData('app',a.id)}><span>◈</span>{a.name}<button onClick={()=>unassign(a.id,c.id)}>×</button></div>)}<div className="drop">Déposer une application ici</div></div>
   </div>)}</div>
 </section>;

 const matrixView=<div className="map map-matrix">{layers.map(layer=><div className="map-row" key={layer.id} style={{gridTemplateColumns:`120px repeat(${columns.length}, minmax(220px, 1fr))`}}>
   <div className="axis-label">{layer.name}</div>
   {columns.map(col=><div className="map-cell" key={col.id} data-zone-key={`${col.id}:${layer.id}`} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();placeDomain(e.dataTransfer.getData('domain'),col.id,layer.id)}}>
     <div className="cell-label">{zones.find(zone=>zone.columnId===col.id&&zone.layerId===layer.id)?.name||col.name}</div>
     {model.domains.filter(d=>(d.layout?.columnId||columns[0].id)===col.id&&(d.layout?.layerId||layers[0].id)===layer.id).map(d=><DomainCard d={d} key={d.id}/>)}
   </div>)}
 </div>)}</div>;

 const domainsView=<div className="domains">{model.domains.map(d=><div key={d.id} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const id=e.dataTransfer.getData('domain');if(id&&id!==d.id){const target=d.layout||{};placeDomain(id,target.columnId,target.layerId)}}}><DomainCard d={d}/></div>)}</div>;
 const columnsView=<div className="layout-strip" style={{gridTemplateColumns:`repeat(${columns.length}, minmax(0, 1fr))`}}>{columns.map(col=><div className="layout-group" key={col.id}><div className="layout-group-title">{col.name}</div>{model.domains.filter(d=>(d.layout?.columnId||columns[0].id)===col.id).map(d=><div className="layout-chip" draggable key={d.id} onDragStart={e=>e.dataTransfer.setData('domain',d.id)} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();placeDomain(e.dataTransfer.getData('domain'),col.id,d.layout?.layerId)}}>{d.code} · {d.name}</div>)}</div>)}</div>;
 const layersView=<div className="layout-strip layers-strip" style={{gridTemplateColumns:`repeat(${layers.length}, minmax(0, 1fr))`}}>{layers.map(layer=><div className="layout-group" key={layer.id}><div className="layout-group-title">{layer.name}</div>{model.domains.filter(d=>(d.layout?.layerId||layers[0].id)===layer.id).map(d=><div className="layout-chip" key={d.id}>{d.code} · {d.name}</div>)}</div>)}</div>;
 const editorMap=layoutMode==='matrix'?matrixView:domainsView;

 return <div className="app">
  <header><div><div className="eyebrow">ENTERPRISE ARCHITECTURE</div><h1>Capacity Mapper</h1></div>
   <div className="toolbar"><button className={mode==='editor'?'active':''} onClick={()=>setMode('editor')}>▦ Cartographie</button><button className={mode==='impact'?'active':''} onClick={()=>setMode('impact')}>⚡ Impact</button><button onClick={()=>openNew('domain')}>＋ Domaine L0</button><button onClick={()=>openNew('app')}>＋ Application</button><button onClick={openLayoutEditor}>⚙ Structure</button><button onClick={createBlankMap}>Nouvelle cartographie</button><button onClick={()=>exportModel(model)}>↓ Export</button><button onClick={async()=>{const u=prompt('URL du fichier JSON public (GitHub raw ou URL HTTPS)',sourceUrl);if(u===null)return;const n=normalizeJsonUrl(u);if(!n)return;try{const remote=await loadRemoteModel(n);setModel(remote);setSourceUrl(n);localStorage.setItem('enterprise-capacity-mapper:source-url',n);notify('Source JSON distante chargée')}catch(e){notify(e.message)}}}>↗ JSON distant</button><label className="button">↑ Import<input hidden type="file" accept=".json,application/json" onChange={importJson}/></label></div>
  </header>
  <div className="workspace">
   <aside><div className="panel-title">Inventaire SI <span>{apps.length}</span></div><input className="search" placeholder="Rechercher une application…" value={query} onChange={e=>setQuery(e.target.value)}/><div className="hint">Glissez une application vers une capacité pour créer une relation.</div>{filteredApps.map(a=><div key={a.id} className="app-item" draggable onDragStart={e=>e.dataTransfer.setData('app',a.id)}><div><b>{a.name}</b><small>{a.code} · {a.vendor||'—'}</small></div><span className={'badge '+a.status.toLowerCase().replace('é','e')}>{a.status}</span></div>)}</aside>
   <main>{mode==='impact'?<section className="impact"><div className="hero"><div><div className="eyebrow">SIMULATION D'IMPACT</div><h2>Projet / fonctionnalité</h2><p>Sélectionnez les capacités sollicitées pour calculer les applications touchées et les gaps.</p></div><div className="metric"><strong>{selected.length}</strong><span>capacités</span></div><div className="metric"><strong>{touched.length}</strong><span>applications</span></div><div className="metric danger"><strong>{gaps.length}</strong><span>gaps</span></div></div><div className="impact-grid"><div className="impact-card"><h3>Capacités sollicitées</h3>{model.capabilities.map(c=><button key={c.id} className={'cap-select '+(selected.includes(c.id)?'selected':'')} onClick={()=>toggleCap(c.id)}>{selected.includes(c.id)?'✓':'○'} {c.code} — {c.name}</button>)}</div><div className="impact-card"><h3>Applications impactées</h3>{touched.length?touched.map(a=><div className="result-row" key={a.id}><b>{a.name}</b><span>{a.status}</span></div>):<p className="empty">Aucune application impactée.</p>}{gaps.length>0&&<div className="gap-box"><b>⚠ {gaps.length} gap(s) de couverture</b>{gaps.map(c=><div key={c.id}>{c.code} — {c.name}</div>)}</div>}</div></div></section>:<>
    <div className="canvas-head"><div><div className="eyebrow">CAPABILITY MAP · V3</div><h2>Cartographie des capacités</h2><p>{model.metadata?.description||'Modélisez les capacités métier et leur couverture applicative.'}</p></div><div className="layout-tools"><label>Vue <select value={layoutMode} onChange={e=>setLayoutView(e.target.value)}><option value="free">Libre</option><option value="columns">Colonnes</option><option value="layers">Layers</option><option value="matrix">Colonnes + Layers</option></select></label><div className="stats"><span>{model.domains.length} L0</span><span>{model.capabilities.length} L1</span><span>{apps.length} Apps</span><span>{redundancy.length} doublons</span></div></div></div>
    {layoutMode==='columns'?columnsView:layoutMode==='layers'?layersView:editorMap}
   </>}</main>
  </div>
  {status&&<div className="toast">{status}</div>}
  {modal==='layout'&&layoutDraft&&<Modal title="Personnaliser la structure" onClose={()=>setModal(null)}><p className="structure-hint">Renommez les axes et donnez un nom différent à chaque zone, au croisement d’une colonne et d’un layer.</p>{[['columns','Colonnes'],['layers','Layers']].map(([kind,title])=><section className="structure-section" key={kind}><h3>{title}</h3>{layoutDraft[kind].map((item,index)=><div className="structure-row" key={item.id}><label className="field"><span>{title.slice(0,-1)} {index+1}</span><input value={item.name} onChange={e=>updateLayoutDraft(kind,item.id,e.target.value)}/></label><button className="structure-remove" disabled={layoutDraft[kind].length===1} onClick={()=>removeLayoutItem(kind,item.id)}>Supprimer</button></div>)}<button className="structure-add" onClick={()=>addLayoutItem(kind)}>＋ Ajouter {kind==='columns'?'une colonne':'un layer'}</button></section>)}<section className="structure-section zone-editor"><h3>Zones de la matrice</h3>{layoutDraft.zones.map(zone=>{const column=layoutDraft.columns.find(x=>x.id===zone.columnId);const layer=layoutDraft.layers.find(x=>x.id===zone.layerId);return <label className="field zone-row" data-zone-key={`${zone.columnId}:${zone.layerId}`} key={`${zone.columnId}:${zone.layerId}`}><span>{column.name} · {layer.name}</span><input value={zone.name} onChange={e=>updateZoneDraft(zone.columnId,zone.layerId,e.target.value)}/></label>})}</section><div className="modal-actions"><button onClick={()=>setModal(null)}>Annuler</button><button className="primary" onClick={saveLayout}>Enregistrer</button></div></Modal>}
  {modal&&modal!=='layout'&&<Modal title={modal==='domain'?'Nouveau domaine L0':modal==='edit-domain'?'Modifier le domaine L0':modal==='capability'?'Nouvelle capacité L1':'Nouvelle application'} onClose={()=>setModal(null)}><Field label="Nom" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><Field label="Code" value={form.code} onChange={e=>setForm({...form,code:e.target.value})}/>{modal==='capability'&&<label className="field"><span>Domaine</span><select value={form.domainId} onChange={e=>setForm({...form,domainId:e.target.value})}>{model.domains.map(d=><option value={d.id} key={d.id}>{d.code} — {d.name}</option>)}</select></label>}{modal==='app'&&<><Field label="Éditeur / fournisseur" value={form.vendor} onChange={e=>setForm({...form,vendor:e.target.value})}/><label className="field"><span>Statut</span><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Actif</option><option>Cible</option><option>Obsolète</option></select></label><label className="field"><span>Type</span><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option>SaaS</option><option>ERP</option><option>On-Premise</option><option>Shadow IT</option></select></label></>}<Field label="Description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/><div className="modal-actions"><button onClick={()=>setModal(null)}>Annuler</button><button className="primary" onClick={save}>{modal==='edit-domain'?'Enregistrer':'Créer'}</button></div></Modal>}
 </div>
}
export default App;

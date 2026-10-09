import React,{useEffect,useMemo,useState} from 'react';
import {DEMO_MODEL} from './data/demoData.js';
import {exportModel,importModel,loadModel,saveModel} from './services/storage.js';
import NewMapWizard from './components/NewMapWizard.jsx';
import TogafGuide from './components/TogafGuide.jsx';

const SOURCE_URL_KEY='enterprise-capacity-mapper:source-url';
const VISUAL_PREFS_KEY='enterprise-capacity-mapper:visual-preferences';
const uid=p=>`${p}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
const emptyForm={name:'',code:'',description:'',status:'Actif',type:'SaaS',vendor:'',domainId:'',capabilityIds:[],columnId:'',layerId:'',columnSpan:'1'};
const DEFAULT_LAYOUTS={columns:[{id:'business',name:'Business',order:0},{id:'operations',name:'Operations',order:1},{id:'support',name:'Support',order:2}],layers:[{id:'strategic',name:'Stratégique',order:0},{id:'core',name:'Core / Value',order:1},{id:'support',name:'Support',order:2}]};

function Modal({title,children,onClose}){return <div className="modal-backdrop"><div className="modal"><div className="modal-head"><h2>{title}</h2><button onClick={onClose}>×</button></div>{children}</div></div>}
function Field({label,required=false,error,...p}){return <label className={'field '+(error?'has-error':'')}><span>{label}{required&&<b className="required" aria-hidden="true"> *</b>}</span><input aria-required={required} aria-invalid={!!error} {...p}/>{error&&<small className="field-error">{error}</small>}</label>}

function App(){
 const [model,setModel]=useState(()=>loadModel(DEMO_MODEL));
 const [mode,setMode]=useState('editor');
 const [presentation,setPresentation]=useState(false);
 const [inventoryCollapsed,setInventoryCollapsed]=useState(false);
 const [visualPrefs,setVisualPrefs]=useState(()=>{try{return {theme:'classic',density:'comfortable',coverageMode:'domain',...JSON.parse(localStorage.getItem(VISUAL_PREFS_KEY)||'{}')}}catch{return {theme:'classic',density:'comfortable',coverageMode:'domain'}}});
 const [mapQuery,setMapQuery]=useState('');
 const [sourceUrl,setSourceUrl]=useState(()=>localStorage.getItem(SOURCE_URL_KEY)||'');
 const [selected,setSelected]=useState([]);
 const [query,setQuery]=useState('');
 const [status,setStatus]=useState('');
 const [modal,setModal]=useState(null);
 const [guideOpen,setGuideOpen]=useState(false);
 const [form,setForm]=useState(emptyForm); const [formErrors,setFormErrors]=useState({});
 const [editingDomainId,setEditingDomainId]=useState(null);
 const [editingCapabilityId,setEditingCapabilityId]=useState(null);
 const [layoutDraft,setLayoutDraft]=useState(null);
 const [layoutMode,setLayoutMode]=useState(model.layout?.mode||'matrix');
 const depth=model.layout?.depth===1?1:2;
 const mappedItems=depth===1?model.domains:model.capabilities;
 const relationIds=item=>item.capabilityIds||[];
 const coverageCount=id=>apps.filter(a=>relationIds(a).includes(id)).length;
 const coverageState=id=>{const n=coverageCount(id);return n===0?'gap':n===1?'covered':'redundant'};
 const coverageSymbol=id=>coverageState(id)==='gap'?'✕':coverageState(id)==='redundant'?'⇄':'✓';
 const relationLabel=depth===1?'domaine N0':'capacité N1';

 useEffect(()=>saveModel(model),[model]);
 useEffect(()=>{localStorage.setItem(VISUAL_PREFS_KEY,JSON.stringify(visualPrefs))},[visualPrefs]);
 const apps=model.applications||[];
 const filteredApps=useMemo(()=>apps.filter(a=>(a.name+' '+a.code+' '+a.vendor).toLowerCase().includes(query.toLowerCase())),[apps,query]);
 const touched=apps.filter(a=>relationIds(a).some(id=>selected.includes(id)));
 const gaps=mappedItems.filter(c=>selected.includes(c.id)&&!apps.some(a=>relationIds(a).includes(c.id)));
 const redundancy=mappedItems.filter(c=>apps.filter(a=>relationIds(a).includes(c.id)).length>1);
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
   const previous=d[kind].find(x=>x.id===id);
   const items=d[kind].map(x=>x.id===id?{...x,name}:x);
   const nextColumns=kind==='columns'?items:d.columns;
   const nextLayers=kind==='layers'?items:d.layers;
   const syncedZones=kind==='columns'&&previous?d.zones.map(z=>z.columnId===id&&z.name===previous.name?{...z,name}:z):d.zones;
   return {...d,[kind]:items,zones:completeZones(nextColumns,nextLayers,syncedZones)};
 });
 const updateZoneDraft=(columnId,layerId,name)=>setLayoutDraft(d=>({...d,zones:d.zones.map(zone=>zone.columnId===columnId&&zone.layerId===layerId?{...zone,name}:zone)}));
 const addLayoutItem=kind=>setLayoutDraft(d=>{
   const items=[...d[kind],{id:uid(kind==='columns'?'column':'layer'),name:kind==='columns'?'Nouvelle colonne':'Nouveau layer',order:d[kind].length}];
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

 // Assistant « Nouvelle cartographie » : aucune donnée n'est modifiée avant la validation finale.
 const openWizard=()=>setModal('wizard');
 const closeWizard=()=>setModal(null);
 const createMap=({name,description,layout:nextLayout,backup})=>{
   if(backup)exportModel(model);
   setModel(m=>({...m,metadata:{...m.metadata,name,description},layout:nextLayout,domains:[],capabilities:[],applications:[]}));
   setSelected([]);
   setLayoutMode('matrix');
   setMode('editor');
   setSourceUrl('');
   localStorage.removeItem(SOURCE_URL_KEY);
   setModal(null);
   notify(backup?'Cartographie créée · sauvegarde JSON téléchargée':'Cartographie créée');
 };

 const placementAvailable=(domainId,columnId,layerId,columnSpan)=>{
   const start=columns.findIndex(c=>c.id===columnId);
   const span=Number(columnSpan)||1;
   if(start<0||span<1||start+span>columns.length)return false;
   return !model.domains.some(d=>{
     if(d.id===domainId||(d.layout?.layerId||layers[0].id)!==layerId)return false;
     const otherStart=columns.findIndex(c=>c.id===(d.layout?.columnId||columns[0].id));
     const otherSpan=Math.max(1,Number(d.layout?.columnSpan)||1);
     if(otherStart<0)return false;
     // Plusieurs domaines peuvent être empilés dans la même cellule si leur étendue est identique.
     if(otherStart===start&&otherSpan===span)return false;
     // Les étendues qui se croisent sur des colonnes différentes restent interdites.
     return start<otherStart+otherSpan&&otherStart<start+span;
   });
 };
 const placeDomain=(domainId,columnId,layerId)=>{
   if(!domainId)return;
   const moving=model.domains.find(d=>d.id===domainId);
   const targetColumn=columnId||moving?.layout?.columnId||columns[0].id;
   const targetLayer=layerId||moving?.layout?.layerId||layers[0].id;
   if(moving&&!placementAvailable(domainId,targetColumn,targetLayer,moving.layout?.columnSpan||1)){notify('Déplacement impossible : cette étendue chevaucherait un autre domaine ou dépasserait la matrice.');return}
   update({layout:{...layout,mode:layoutMode,columns,layers},domains:model.domains.map(d=>d.id===domainId?{...d,layout:{...(d.layout||{}),columnId:targetColumn,layerId:targetLayer}}:d)});
 };
 const openNew=(kind,parent,place)=>{setEditingDomainId(null);setEditingCapabilityId(null);setFormErrors({});setForm({...emptyForm,domainId:parent||'',capabilityIds:parent?[parent]:[],columnId:place?.columnId||columns[0].id,layerId:place?.layerId||layers[0].id,columnSpan:'1'});setModal(kind)};
 const openEditDomain=d=>{setEditingDomainId(d.id);setEditingCapabilityId(null);setFormErrors({});setForm({...emptyForm,name:d.name,code:d.code,description:d.description||'',columnId:d.layout?.columnId||columns[0].id,layerId:d.layout?.layerId||layers[0].id,columnSpan:String(d.layout?.columnSpan||1)});setModal('edit-domain')};
 const openEditCapability=c=>{setEditingCapabilityId(c.id);setFormErrors({});setForm({...emptyForm,name:c.name});setModal('edit-capability')};
 const save=()=>{
   const errors={};
   if(!form.name.trim())errors.name='Le nom est obligatoire.';
   if(modal!=='edit-capability'&&!form.code.trim())errors.code='Le code est obligatoire.';
   if(modal==='capability'&&!form.domainId)errors.domainId='Le domaine est obligatoire.';
   if(modal==='app'&&!form.vendor.trim())errors.vendor='L’éditeur / fournisseur est obligatoire.';
   if((modal==='domain'||modal==='edit-domain')&&!placementAvailable(modal==='edit-domain'?editingDomainId:null,form.columnId||columns[0].id,form.layerId||layers[0].id,form.columnSpan))errors.columnSpan='Cette étendue chevauche un autre domaine ou dépasse les colonnes disponibles.';
   if(Object.keys(errors).length){setFormErrors(errors);notify('Vérifiez les champs signalés.');return}
   setFormErrors({});
   if(modal==='domain')update({domains:[...model.domains,{id:uid('l0'),code:form.code||'CAP',name:form.name,description:form.description,color:'indigo',layout:{columnId:form.columnId||columns[0].id,layerId:form.layerId||layers[0].id,columnSpan:Number(form.columnSpan)||1}}]});
   if(modal==='edit-domain')update({domains:model.domains.map(d=>d.id===editingDomainId?{...d,name:form.name.trim(),code:form.code.trim()||d.code,description:form.description,layout:{...(d.layout||{}),columnId:form.columnId||d.layout?.columnId||columns[0].id,layerId:form.layerId||d.layout?.layerId||layers[0].id,columnSpan:Number(form.columnSpan)||1}}:d)});
   if(modal==='edit-capability')update({capabilities:model.capabilities.map(c=>c.id===editingCapabilityId?{...c,name:form.name.trim()}:c)});
   if(modal==='capability')update({capabilities:[...model.capabilities,{id:uid('l1'),domainId:form.domainId,code:form.code||'CAP-01',name:form.name,description:form.description}]});
   if(modal==='app')update({applications:[...apps,{id:uid('app'),name:form.name,code:form.code||'APP',type:form.type,status:form.status,vendor:form.vendor,capabilityIds:form.capabilityIds,description:form.description}]});
   setModal(null);
 };
 const removeDomain=id=>{
   const caps=model.capabilities.filter(c=>c.domainId===id).map(c=>c.id);
   const ids=new Set(depth===1?[id]:caps);
   update({domains:model.domains.filter(d=>d.id!==id),capabilities:model.capabilities.filter(c=>c.domainId!==id),applications:apps.map(a=>({...a,capabilityIds:relationIds(a).filter(x=>!ids.has(x))}))});
   notify('Domaine et dépendances supprimés');
 };
 const toggleCap=id=>setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
 const assign=(appId,capId)=>update({applications:apps.map(a=>a.id===appId?{...a,capabilityIds:Array.from(new Set([...(a.capabilityIds||[]),capId]))}:a)});
 const unassign=(appId,capId)=>update({applications:apps.map(a=>a.id===appId?{...a,capabilityIds:(a.capabilityIds||[]).filter(x=>x!==capId)}:a)});
 const onDrop=(e,capId)=>{e.preventDefault();const id=e.dataTransfer.getData('app');if(id)assign(id,capId)};
 const importJson=async e=>{const f=e.target.files?.[0];if(!f)return;try{update(await importModel(f));notify('Cartographie importée')}catch(err){notify(err.message)}e.target.value=''};

 const DomainCard=({d})=><section className={'domain '+(depth===1?'depth-one':'')} draggable onDragStart={e=>e.dataTransfer.setData('domain',d.id)} onDragOver={e=>depth===1&&e.preventDefault()} onDrop={e=>{if(depth===1){e.preventDefault();onDrop(e,d.id)}}} key={d.id}>
   <div className="domain-head"><div><span className="code">{d.code}</span><h3>{d.name}</h3><p>{d.description}</p></div><div className="domain-actions"><button className="secondary" onClick={()=>openEditDomain(d)}>Modifier</button>{depth===2&&<button className="primary-soft" onClick={()=>openNew('capability',d.id)}>＋ N1</button>}<button className="ghost danger-text" onClick={()=>removeDomain(d.id)}>Supprimer</button></div></div>
   {depth===1?<div className="relations domain-relations">{apps.filter(a=>relationIds(a).includes(d.id)).map(a=><div className="rel" key={a.id} draggable onDragStart={e=>e.dataTransfer.setData("app",a.id)}><span>◈</span>{a.name}<button onClick={()=>unassign(a.id,d.id)}>×</button></div>)}<div className="drop">Déposer une application ici</div></div>:<div className="caps">{model.capabilities.filter(c=>c.domainId===d.id).map(c=><div className={'cap '+(selected.includes(c.id)?'highlight ':'')+(visualPrefs.coverageMode==='coverage'?'coverage-'+coverageState(c.id):'')} key={c.id} onDragOver={e=>e.preventDefault()} onDrop={e=>onDrop(e,c.id)}>
     <div className="cap-head"><div><span className="code">{c.code}</span><b>{c.name}</b></div><span className={'count '+(visualPrefs.coverageMode==='coverage'?'coverage-count':'')}>{visualPrefs.coverageMode==='coverage'&&<b aria-label={coverageState(c.id)}>{coverageSymbol(c.id)} </b>}{coverageCount(c.id)}</span><button className="cap-edit" type="button" title="Renommer" aria-label={`Renommer ${c.name}`} onClick={()=>openEditCapability(c)}>✎</button></div>
     <p>{c.description}</p>
     <div className="relations">{apps.filter(a=>(a.capabilityIds||[]).includes(c.id)).map(a=><div className="rel" key={a.id} draggable onDragStart={e=>e.dataTransfer.setData('app',a.id)}><span>◈</span>{a.name}<button onClick={()=>unassign(a.id,c.id)}>×</button></div>)}<div className="drop">Déposer une application ici</div></div>
   </div>)}</div>}
 </section>;

 const matrixView=<div className="map map-matrix">
   <div className="map-row map-head" style={{gridTemplateColumns:`120px repeat(${columns.length}, minmax(220px, 1fr))`}}><div/>{columns.map(col=><div className="col-head" key={col.id}>{col.name}</div>)}</div>
   {layers.map(layer=><div className="map-row" key={layer.id} style={{gridTemplateColumns:`120px repeat(${columns.length}, minmax(220px, 1fr))`}}>
   <div className="axis-label">{layer.name}</div>
   {columns.map((col,index)=>{
     const coveredByPrevious=model.domains.some(d=>(d.layout?.layerId||layers[0].id)===layer.id&&columns.findIndex(c=>c.id===(d.layout?.columnId||columns[0].id))<index&&columns.findIndex(c=>c.id===(d.layout?.columnId||columns[0].id))+Math.max(1,Number(d.layout?.columnSpan)||1)>index);
     if(coveredByPrevious)return null;
     const here=model.domains.filter(d=>(d.layout?.columnId||columns[0].id)===col.id&&(d.layout?.layerId||layers[0].id)===layer.id&&(d.name+' '+d.code+' '+(d.description||'')).toLowerCase().includes(mapQuery.toLowerCase()));
     const span=Math.max(1,Math.min(columns.length-index,Number(here[0]?.layout?.columnSpan)||1));
     const zone=zones.find(z=>z.columnId===col.id&&z.layerId===layer.id);
     const zoneLabel=zone?.name&&zone.name!==col.name?zone.name:'';
     return <div className="map-cell" key={col.id} data-zone-key={`${col.id}:${layer.id}`} style={{gridColumn:span>1?`span ${span}`:undefined}} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();placeDomain(e.dataTransfer.getData('domain'),col.id,layer.id)}}>
       {zoneLabel&&<div className="cell-label">{zoneLabel}</div>}
       {here.map(d=><DomainCard d={d} key={d.id}/>)}
       <button className={'cell-add'+(here.length?'':' empty')} onClick={()=>openNew('domain',null,{columnId:col.id,layerId:layer.id})}>＋ Ajouter un domaine ici</button>
     </div>;
   })}
 </div>)}</div>;

 const visibleDomains=model.domains.filter(d=>(d.name+' '+d.code+' '+(d.description||'')).toLowerCase().includes(mapQuery.toLowerCase()));
 const domainsView=<div className="domains">{visibleDomains.map(d=><div key={d.id} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const id=e.dataTransfer.getData('domain');if(id&&id!==d.id){const target=d.layout||{};placeDomain(id,target.columnId,target.layerId)}}}><DomainCard d={d}/></div>)}</div>;
 const columnsView=<div className="layout-strip" style={{gridTemplateColumns:`repeat(${columns.length}, minmax(0, 1fr))`}}>{columns.map(col=><div className="layout-group" key={col.id}><div className="layout-group-title">{col.name}</div>{model.domains.filter(d=>(d.layout?.columnId||columns[0].id)===col.id&&(d.name+' '+d.code+' '+(d.description||'')).toLowerCase().includes(mapQuery.toLowerCase())).map(d=><div className="layout-chip" draggable key={d.id} onDragStart={e=>e.dataTransfer.setData('domain',d.id)} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();placeDomain(e.dataTransfer.getData('domain'),col.id,d.layout?.layerId)}}>{d.code} · {d.name}</div>)}</div>)}</div>;
 const layersView=<div className="layout-strip layers-strip" style={{gridTemplateColumns:`repeat(${layers.length}, minmax(0, 1fr))`}}>{layers.map(layer=><div className="layout-group" key={layer.id}><div className="layout-group-title">{layer.name}</div>{model.domains.filter(d=>(d.layout?.layerId||layers[0].id)===layer.id&&(d.name+' '+d.code+' '+(d.description||'')).toLowerCase().includes(mapQuery.toLowerCase())).map(d=><div className="layout-chip" key={d.id}>{d.code} · {d.name}</div>)}</div>)}</div>;
 const posterView=<div className={'map map-matrix poster-map '+(visualPrefs.coverageMode==='coverage'?'poster-coverage':'poster-domain')}>
   <div className="poster-titlebar"><span>B · Poster + heatmap de couverture</span><div className="coverage-switch" role="group" aria-label="Coloration de la cartographie"><button type="button" data-testid="coverage-mode-domain" className={visualPrefs.coverageMode==='domain'?'active':''} aria-pressed={visualPrefs.coverageMode==='domain'} onClick={()=>setVisualPrefs(p=>({...p,coverageMode:'domain'}))}>Par domaine</button><button type="button" data-testid="coverage-mode-coverage" className={visualPrefs.coverageMode==='coverage'?'active':''} aria-pressed={visualPrefs.coverageMode==='coverage'} onClick={()=>setVisualPrefs(p=>({...p,coverageMode:'coverage'}))}>Par couverture</button></div></div>
   <div className="map-row map-head" style={{gridTemplateColumns:`120px repeat(${columns.length}, minmax(150px, 1fr))`}}><div/>{columns.map(col=><div className="col-head" key={col.id}>{col.name}</div>)}</div>
   {layers.map(layer=><div className="map-row" key={layer.id} style={{gridTemplateColumns:`120px repeat(${columns.length}, minmax(150px, 1fr))`}}><div className="axis-label">{layer.name}</div>{columns.map((col,index)=>{const coveredByPrevious=model.domains.some(d=>(d.layout?.layerId||layers[0].id)===layer.id&&columns.findIndex(c=>c.id===(d.layout?.columnId||columns[0].id))<index&&columns.findIndex(c=>c.id===(d.layout?.columnId||columns[0].id))+Math.max(1,Number(d.layout?.columnSpan)||1)>index);if(coveredByPrevious)return null;const here=model.domains.filter(d=>(d.layout?.columnId||columns[0].id)===col.id&&(d.layout?.layerId||layers[0].id)===layer.id&&(d.name+' '+d.code+' '+(d.description||'')).toLowerCase().includes(mapQuery.toLowerCase()));const span=Math.max(1,Math.min(columns.length-index,Number(here[0]?.layout?.columnSpan)||1));return <div className="map-cell poster-cell" key={col.id} data-zone-key={`${col.id}:${layer.id}`} style={{gridColumn:span>1?`span ${span}`:undefined}} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();placeDomain(e.dataTransfer.getData('domain'),col.id,layer.id)}}>{here.map(d=><section className={'poster-domain-card domain-color-'+(['indigo','blue','teal','green','amber','rose','purple'].includes(d.color)?d.color:'indigo')} key={d.id} draggable onDragStart={e=>e.dataTransfer.setData('domain',d.id)}><header className="poster-domain-head"><strong>{d.name}</strong><span>{d.code} · {model.capabilities.filter(c=>c.domainId===d.id).length} N1</span></header><div className="poster-cap-list">{model.capabilities.filter(c=>c.domainId===d.id).map(c=>{const count=coverageCount(c.id);return <button type="button" className={'poster-cap '+(visualPrefs.coverageMode==='coverage'?'coverage-'+coverageState(c.id):'')} key={c.id} onClick={()=>openEditCapability(c)} title={c.description||c.name}><span>{c.name}</span><b>{visualPrefs.coverageMode==='coverage'?coverageSymbol(c.id)+' ':''}{count}</b></button>})}{depth===2&&<button className="poster-add-cap" onClick={()=>openNew('capability',d.id)}>＋ N1</button>}</div></section>)}<button className="cell-add poster-add-domain" onClick={()=>openNew('domain',null,{columnId:col.id,layerId:layer.id})}>＋ Ajouter un domaine</button></div>})}</div>)} 
   <div className="poster-footnote">{visualPrefs.coverageMode==='coverage' ? '✓ Couvert · ⇄ Redondance · ✕ Gap' : 'Une couleur par domaine N0, le chiffre indique le nombre d’applications'}</div>
 </div>;
 const editorMap=layoutMode==='matrix'?matrixView:domainsView;

 return <div className={'app theme-'+visualPrefs.theme+' density-'+visualPrefs.density+(presentation?' presentation-mode':'')}>
  <header><div><div className="eyebrow">ENTERPRISE ARCHITECTURE</div><h1>Capacity Mapper</h1></div>
   <div className="toolbar"><div className="toolbar-switch"><button className={mode==='editor'?'active':''} onClick={()=>setMode('editor')}>▦ Cartographie</button><button className={mode==='impact'?'active':''} onClick={()=>setMode('impact')}>⚡ Impact</button></div><div className="toolbar-actions"><button className="secondary" onClick={()=>setPresentation(v=>!v)} aria-pressed={presentation} data-testid="presentation-toggle">{presentation?'↙ Quitter la présentation':'⛶ Présentation'}</button><button className="secondary" onClick={openWizard}>＋ Nouvelle cartographie</button><button className="secondary" onClick={()=>exportModel(model)}>↓ Export</button><button className="secondary" onClick={async()=>{const u=prompt('URL du fichier JSON public (GitHub raw ou URL HTTPS)',sourceUrl);if(u===null)return;const n=normalizeJsonUrl(u);if(!n)return;try{const remote=await loadRemoteModel(n);setModel(remote);setSourceUrl(n);localStorage.setItem(SOURCE_URL_KEY,n);notify('Source JSON distante chargée')}catch(e){notify(e.message)}}}>↗ Source JSON</button><label className="button secondary">↑ Import<input hidden type="file" accept=".json,application/json" onChange={importJson}/></label></div></div>
  </header>
  <div className={'workspace '+(inventoryCollapsed?'inventory-collapsed':'')}>
   <aside id="app-inventory"><div className="panel-title"><span>Inventaire SI <em>{apps.length}</em></span><button className="side-add" onClick={()=>openNew('app')}>＋ Application</button></div><input className="search" placeholder="Rechercher une application…" value={query} onChange={e=>setQuery(e.target.value)}/><div className="hint">Glissez une application vers un élément de cartographie pour créer une relation.</div>{filteredApps.map(a=><div key={a.id} className="app-item" draggable onDragStart={e=>e.dataTransfer.setData('app',a.id)}><div><b>{a.name}</b><small>{a.code} · {a.vendor||'—'}</small></div><span className={'badge '+a.status.toLowerCase().replace('é','e')}>{a.status}</span></div>)}</aside>
   <main>{mode==='impact'?<section className="impact"><div className="hero"><div><div className="eyebrow">SIMULATION D'IMPACT</div><h2>Projet / fonctionnalité</h2><p>Sélectionnez les capacités métier sollicitées : on cherche « ce que l’entreprise doit savoir faire », pas une liste d’applications ou de processus.</p></div><div className="metric"><strong>{selected.length}</strong><span>{relationLabel}s</span></div><div className="metric"><strong>{touched.length}</strong><span>applications</span></div><div className="metric danger"><strong>{gaps.length}</strong><span>gaps</span></div></div><div className="impact-grid"><div className="impact-card"><h3>Éléments sollicités</h3><p className="context-help">N0 : grand domaine métier. N1 : capacité détaillée et relativement stable. Exemple : N0 « Relation client » → N1 « Gestion des réclamations ».</p>{mappedItems.map(c=><button key={c.id} className={'cap-select '+(selected.includes(c.id)?'selected':'')} onClick={()=>toggleCap(c.id)}>{selected.includes(c.id)?'✓':'○'} {c.code} — {c.name}</button>)}</div><div className="impact-card"><h3>Applications impactées</h3>{touched.length?touched.map(a=><div className="result-row" key={a.id}><b>{a.name}</b><span>{a.status}</span></div>):<p className="empty">Aucune application impactée.</p>}{gaps.length>0&&<div className="gap-box"><b>⚠ {gaps.length} gap(s) de couverture</b>{gaps.map(c=><div key={c.id}>{c.code} — {c.name}</div>)}</div>}</div></div></section>:<>
    <div className="canvas-head"><button className="secondary inventory-toggle inventory-toggle-rail" onClick={()=>setInventoryCollapsed(v=>!v)} aria-expanded={!inventoryCollapsed} aria-controls="app-inventory" aria-label={inventoryCollapsed?"Afficher l’inventaire des applications":"Masquer l’inventaire des applications"} title={inventoryCollapsed?"Afficher l’inventaire des applications":"Masquer l’inventaire des applications"}><span className="menu-glyph" aria-hidden="true"></span></button><div className="canvas-title"><div className="eyebrow">CAPABILITY MAP · V3 · {depth} NIVEAU{depth===2?"X":""}</div><h2>Cartographie des capacités</h2></div><div className="canvas-actions"><button className="primary" onClick={()=>openNew('domain')}>＋ Domaine N0</button><button className="secondary" onClick={openLayoutEditor}>⚙ Structure</button><details className="visual-settings"><summary aria-label="Configuration de la cartographie" title="Configuration de la cartographie">⚙ <span>Configuration</span></summary><div className="visual-toolbar" aria-label="Options de présentation"><label>Thème <select aria-label="Thème visuel" data-testid="visual-theme" value={visualPrefs.theme} onChange={e=>setVisualPrefs(p=>({...p,theme:e.target.value}))}><option value="classic">Classique</option><option value="executive">Exécutif</option><option value="contrast">Contraste</option></select></label><label>Densité <select aria-label="Densité de la carte" data-testid="visual-density" value={visualPrefs.density} onChange={e=>setVisualPrefs(p=>({...p,density:e.target.value}))}><option value="comfortable">Confortable</option><option value="compact">Compacte</option></select></label><label className="map-filter">Filtrer les domaines <input aria-label="Filtrer les domaines" data-testid="map-filter" placeholder="Nom ou code N0…" value={mapQuery} onChange={e=>setMapQuery(e.target.value)}/></label><span className="filter-count" aria-live="polite">{mapQuery?`${visibleDomains.length} / ${model.domains.length} domaines`: 'Tous les domaines'}</span></div></details><button className="help-icon" onClick={()=>setGuideOpen(true)} aria-label="Aide sur N0, N1 et TOGAF" title="Comprendre N0, N1 et TOGAF">?</button></div></div>    <div className="layout-tools"><label>Vue <select value={layoutMode} onChange={e=>setLayoutView(e.target.value)}><option value="free">Libre</option><option value="columns">Colonnes</option><option value="layers">Layers</option><option value="matrix">Colonnes + Layers</option></select></label><div className="stats"><span>{model.domains.length} N0</span>{depth===2&&<span>{model.capabilities.length} N1</span>}<span>{apps.length} Apps</span><span>{redundancy.length} doublons</span></div></div>
    {visualPrefs.coverageMode==='coverage'&&<div className="coverage-legend" aria-label="Légende de couverture"><span className="legend-covered">✓ Couvert · 1 application</span><span className="legend-redundant">⇄ Redondance · plusieurs applications</span><span className="legend-gap">✕ Gap · aucune application</span></div>}{layoutMode==='columns'?columnsView:layoutMode==='layers'?layersView:layoutMode==='matrix'?posterView:editorMap}
   </>}</main>
  </div>
  {status&&<div className="toast">{status}</div>}
  {modal==='wizard'&&<NewMapWizard model={model} onCancel={closeWizard} onCreate={createMap}/>}
  {guideOpen&&<TogafGuide onClose={()=>setGuideOpen(false)}/>} 
  {modal==='layout'&&layoutDraft&&<Modal title="Personnaliser la structure" onClose={()=>setModal(null)}><p className="structure-hint">Renommez les colonnes et les layers. Le nom d’une zone (croisement d’une colonne et d’un layer) n’apparaît sur la carte que s’il diffère du nom de la colonne.</p>{[['columns','Colonnes'],['layers','Layers']].map(([kind,title])=><section className="structure-section" key={kind}><h3>{title}</h3>{layoutDraft[kind].map((item,index)=><div className="structure-row" key={item.id}><label className="field"><span>{title.slice(0,-1)} {index+1}</span><input value={item.name} onChange={e=>updateLayoutDraft(kind,item.id,e.target.value)}/></label><button className="structure-remove" disabled={layoutDraft[kind].length===1} onClick={()=>removeLayoutItem(kind,item.id)}>Supprimer</button></div>)}<button className="structure-add" onClick={()=>addLayoutItem(kind)}>＋ Ajouter {kind==='columns'?'une colonne':'un layer'}</button></section>)}<section className="structure-section zone-editor"><h3>Zones de la matrice</h3>{layoutDraft.zones.map(zone=>{const column=layoutDraft.columns.find(x=>x.id===zone.columnId);const layer=layoutDraft.layers.find(x=>x.id===zone.layerId);return <label className="field zone-row" data-zone-key={`${zone.columnId}:${zone.layerId}`} key={`${zone.columnId}:${zone.layerId}`}><span>{column.name} · {layer.name}</span><input value={zone.name} onChange={e=>updateZoneDraft(zone.columnId,zone.layerId,e.target.value)}/></label>})}</section><div className="modal-actions"><button onClick={()=>setModal(null)}>Annuler</button><button className="primary" onClick={saveLayout}>Enregistrer</button></div></Modal>}
  {modal&&modal!=='layout'&&modal!=='wizard'&&<Modal title={modal==='edit-capability'?'Renommer la capacité N1':modal==='domain'?'Nouveau domaine N0':modal==='edit-domain'?'Modifier le domaine N0':modal==='capability'?'Nouvelle capacité N1':'Nouvelle application'} onClose={()=>setModal(null)}>
   {(modal==='domain'||modal==='edit-domain')&&<div className="field-guidance"><b>N0 — Domaine métier</b><span>Regroupe un ensemble large et cohérent de capacités. Utilisez un nom court, stable et métier, par exemple « Relation client », « Finance » ou « Supply Chain ».</span></div>}
   {(modal==='capability'||modal==='edit-capability')&&<div className="field-guidance"><b>N1 — Capacité</b><span>Décrit ce que l’entreprise est capable de faire, sans décrire un processus, une équipe ou une application. Préférez un nom : « Gestion des commandes », plutôt que « Gérer les commandes ».</span></div>}
   <Field label="Nom" required error={formErrors.name} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
   {modal!=='edit-capability'&&<>
    <Field label="Code" required error={formErrors.code} value={form.code} onChange={e=>setForm({...form,code:e.target.value})}/>
    {modal==='capability'&&<label className={'field '+(formErrors.domainId?'has-error':'')}><span>Domaine <b className="required" aria-hidden="true"> *</b></span><select value={form.domainId} onChange={e=>setForm({...form,domainId:e.target.value})}>{model.domains.map(d=><option value={d.id} key={d.id}>{d.code} — {d.name}</option>)}</select>{formErrors.domainId&&<small className="field-error">{formErrors.domainId}</small>}</label>}
    {(modal==='domain'||modal==='edit-domain')&&<><label className="field"><span>Colonne</span><select value={form.columnId} onChange={e=>setForm({...form,columnId:e.target.value})}>{columns.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label><label className="field"><span>Ligne (layer)</span><select value={form.layerId} onChange={e=>setForm({...form,layerId:e.target.value})}>{layers.map(l=><option value={l.id} key={l.id}>{l.name}</option>)}</select></label><label className={'field '+(formErrors.columnSpan?'has-error':'')}><span>Étendue sur les colonnes</span><select value={form.columnSpan} onChange={e=>setForm({...form,columnSpan:e.target.value})}>{columns.slice( Math.max(0,columns.findIndex(c=>c.id===form.columnId))).map((c,i)=><option key={c.id} value={i+1}>{i+1} colonne{i?'s':''}</option>)}</select>{formErrors.columnSpan&&<small className="field-error">{formErrors.columnSpan}</small>}<small className="field-help">La capacité couvrira les colonnes adjacentes à partir de la colonne choisie.</small></label></>}
    {modal==='app'&&<><Field label="Éditeur / fournisseur" required error={formErrors.vendor} value={form.vendor} onChange={e=>setForm({...form,vendor:e.target.value})}/><label className="field"><span>Statut</span><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Actif</option><option>Cible</option><option>Obsolète</option></select></label><label className="field"><span>Type</span><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option>SaaS</option><option>ERP</option><option>On-Premise</option><option>Shadow IT</option></select></label></>}
    <Field label="Description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
   </>}
   <div className="modal-actions"><button onClick={()=>setModal(null)}>Annuler</button><button className="primary" onClick={save}>{modal==='edit-domain'||modal==='edit-capability'?'Enregistrer':'Créer'}</button></div>
  </Modal>}
 </div>
}
export default App;

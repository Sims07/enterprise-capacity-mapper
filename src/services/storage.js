const KEY='enterprise-capacity-mapper:model:v3';
const LOCAL_MAPS_KEY='enterprise-capacity-mapper:local-maps:v1';
const RECENT_MAPS_KEY='enterprise-capacity-mapper:recent-maps:v1';
const LEGACY=['ea_canvas_l0','ea_canvas_l1','ea_canvas_apps'];
export function loadModel(fallback){
  try{
    const raw=localStorage.getItem(KEY);
    if(raw){const model=JSON.parse(raw); if(model?.schemaVersion===3)return model; if(model?.schemaVersion===2)return migrateV2(model);}
    const legacy=legacyModel();
    return legacy?migrateV2(legacy):migrateV2(fallback);
  }catch{return fallback;}
}
function legacyModel(){
  try{
    const domains=JSON.parse(localStorage.getItem(LEGACY[0]));
    const capabilities=JSON.parse(localStorage.getItem(LEGACY[1]));
    const apps=JSON.parse(localStorage.getItem(LEGACY[2]));
    if(!domains||!capabilities||!apps)return null;
    return {schemaVersion:2,metadata:{name:'Cartographie migrée',updatedAt:new Date().toISOString()},domains,capabilities:capabilities.map(x=>({...x,domainId:x.l0Id})),applications:apps.map(x=>({...x,capabilityIds:x.l1Id?[x.l1Id]:[]}))};
  }catch{return null;}
}
export function saveModel(model){localStorage.setItem(KEY,JSON.stringify({...normalizeModel(model),metadata:{...model.metadata,updatedAt:new Date().toISOString()}}));}
export function loadLocalMaps(){
  return loadMapCollection(LOCAL_MAPS_KEY,'La bibliothèque locale de cartographies est invalide.');
}
export function saveLocalMap({id,name,model}){
  const cleanName=name.trim();
  if(!cleanName)throw new Error('Le nom de la cartographie est obligatoire.');
  const entries=loadLocalMaps();
  const saved={id:id||`local-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,name:cleanName,model:validateModel(model),updatedAt:new Date().toISOString()};
  const index=entries.findIndex(entry=>entry.id===saved.id);
  if(index<0)entries.push(saved);
  else entries[index]=saved;
  localStorage.setItem(LOCAL_MAPS_KEY,JSON.stringify(entries));
  return saved;
}
export function loadRecentMaps(){
  return loadMapCollection(RECENT_MAPS_KEY,'La liste des cartographies récentes est invalide.');
}
export function recordRecentMap({id,name,model}){
  const entries=loadRecentMaps();
  const recent={id,name:name.trim()||model.metadata?.name||'Cartographie sans nom',model:validateModel(model),openedAt:new Date().toISOString()};
  const remaining=entries.filter(entry=>entry.id!==id);
  const next=[recent,...remaining].slice(0,10);
  localStorage.setItem(RECENT_MAPS_KEY,JSON.stringify(next));
  return recent;
}
export function updateRecentMap({id,name,model}){
  const entries=loadRecentMaps();
  const index=entries.findIndex(entry=>entry.id===id);
  if(index<0)return recordRecentMap({id,name,model});
  const recent={...entries[index],name:name.trim()||model.metadata?.name||'Cartographie sans nom',model:validateModel(model)};
  entries[index]=recent;
  localStorage.setItem(RECENT_MAPS_KEY,JSON.stringify(entries));
  return recent;
}
function loadMapCollection(key,errorMessage){
  const raw=localStorage.getItem(key);
  if(!raw)return [];
  const entries=JSON.parse(raw);
  if(!Array.isArray(entries))throw new Error(errorMessage);
  return entries.map(entry=>{
    if(!entry||typeof entry.id!=='string'||typeof entry.name!=='string'||!entry.name.trim()||!entry.model)throw new Error(errorMessage);
    return {...entry,model:validateModel(entry.model)};
  });
}
export function exportModel(model){
  const blob=new Blob([JSON.stringify(model,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a');
  a.href=url;a.download=`enterprise-capacity-mapper-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);
}
export function validateModel(model){
  model=normalizeModel(model);
  if(!model||model.schemaVersion!==3||!Array.isArray(model.domains)||!Array.isArray(model.capabilities)||!Array.isArray(model.applications))throw new Error('Format de cartographie invalide ou version non supportée.');
  const domainIds=new Set(model.domains.map(x=>x.id)); const capIds=new Set(model.capabilities.map(x=>x.id));
  if(model.capabilities.some(x=>!domainIds.has(x.domainId)))throw new Error('Une capacité référence un domaine inexistant.');
  if(model.applications.some(x=>x.capabilityIds?.some(id=>!capIds.has(id))))throw new Error('Une application référence une capacité inexistante.');
  return model;
}
export async function importModel(file){const text=await file.text();return validateModel(JSON.parse(text));}
function migrateV2(model){return normalizeModel({...model,schemaVersion:3});}
function normalizeModel(model){
 if(!model)return model;
 const layout=model.layout||{mode:'matrix',columns:[{id:'customer',name:'Client',order:0},{id:'product',name:'Produit',order:1},{id:'operations',name:'Opérations',order:2},{id:'support',name:'Support',order:3}],layers:[{id:'strategic',name:'Stratégique',order:0},{id:'core',name:'Core / Value',order:1},{id:'support',name:'Support',order:2}]};
 const columns=layout.columns?.length?layout.columns:[{id:'default',name:'Général',order:0}]; const layers=layout.layers?.length?layout.layers:[{id:'default',name:'Principal',order:0}];
 return {...model,schemaVersion:3,layout:{...layout,mode:layout.mode||'matrix',columns,layers},domains:(model.domains||[]).map((d,i)=>({...d,layout:{...(d.layout||{}),columnId:d.layout?.columnId||columns[i%columns.length].id,layerId:d.layout?.layerId||layers[0].id}}))};
}


// Chargement optionnel d'un modèle JSON distant (GitHub Pages / dépôt GitHub).
export async function loadRemoteModel(url){
  const response=await fetch(url,{cache:'no-store'});
  if(!response.ok)throw new Error(`Impossible de charger le JSON distant (${response.status}).`);
  return validateModel(await response.json());
}
export function normalizeJsonUrl(input){
  const value=input.trim();
  if(!value)return '';
  if(value.includes('github.com')&&value.includes('/blob/')){
    const u=new URL(value);
    const parts=u.pathname.split('/').filter(Boolean);
    if(parts.length>=5)return `https://raw.githubusercontent.com/${parts[0]}/${parts[1]}/${parts.slice(3).join('/')}`;
  }
  return value;
}

const KEY='enterprise-capacity-mapper:model:v2';
const LEGACY=['ea_canvas_l0','ea_canvas_l1','ea_canvas_apps'];
export function loadModel(fallback){
  try{
    const raw=localStorage.getItem(KEY);
    if(raw){const model=JSON.parse(raw); if(model?.schemaVersion===2)return model;}
    const legacy=legacyModel();
    return legacy||fallback;
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
export function saveModel(model){localStorage.setItem(KEY,JSON.stringify({...model,metadata:{...model.metadata,updatedAt:new Date().toISOString()}}));}
export function exportModel(model){
  const blob=new Blob([JSON.stringify(model,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a');
  a.href=url;a.download=`enterprise-capacity-mapper-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);
}
export function validateModel(model){
  if(!model||model.schemaVersion!==2||!Array.isArray(model.domains)||!Array.isArray(model.capabilities)||!Array.isArray(model.applications))throw new Error('Format de cartographie invalide ou version non supportée.');
  const domainIds=new Set(model.domains.map(x=>x.id)); const capIds=new Set(model.capabilities.map(x=>x.id));
  if(model.capabilities.some(x=>!domainIds.has(x.domainId)))throw new Error('Une capacité référence un domaine inexistant.');
  if(model.applications.some(x=>x.capabilityIds?.some(id=>!capIds.has(id))))throw new Error('Une application référence une capacité inexistante.');
  return model;
}
export async function importModel(file){const text=await file.text();return validateModel(JSON.parse(text));}
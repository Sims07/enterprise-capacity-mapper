import {validateModel} from './storage.js';
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
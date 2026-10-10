const key=element=>element.id||element.classList[0]||element.tagName;
const sceneOwned=new Set(['arena-scene','arena-actor-labels','arena-hit-label','arena-command-flash']);

// Update the HUD without removing the WebGL canvas or restarting its frame loop.
function patchScene(current,fresh){
 current.className=fresh.className;
 current.setAttribute('aria-label',fresh.getAttribute('aria-label'));
 const remaining=new Map([...current.children].map(e=>[key(e),e]));
 const children=[...fresh.children];
 for(let i=0;i<children.length;i++){
  const child=children[i];
  const id=key(child),old=remaining.get(id);remaining.delete(id);
  if(sceneOwned.has(id)&&old){
   if(child.hasAttribute('aria-label'))old.setAttribute('aria-label',child.getAttribute('aria-label'));
   continue;
  }
  if(old)old.replaceWith(child);
  else{
   const next=children.slice(i+1).map(key).map(k=>remaining.get(k)).find(Boolean);
   current.insertBefore(child,next||null);
  }
 }
 for(const old of remaining.values())old.remove();
}

export function patchArenaPage(current,fresh){
 const stage=current.querySelector('.cinema-arena');
 const remaining=new Map([...current.children].map(e=>[key(e),e]));
 const children=[...fresh.children];
 current.className=fresh.className;
 for(let i=0;i<children.length;i++){
  const child=children[i],id=key(child),old=remaining.get(id);remaining.delete(id);
  if(child.classList.contains('cinema-arena')&&stage){patchScene(stage,child);continue;}
  if(old)old.replaceWith(child);
  else{
   const next=children.slice(i+1).map(key).map(k=>remaining.get(k)).find(Boolean);
   current.insertBefore(child,next||null);
  }
 }
 for(const old of remaining.values())old.remove();
}

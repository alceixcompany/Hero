export const COVER_HP=72;
export function createTerrain(){return {version:1,cover:[0,1].flatMap(side=>[0,3].map(slot=>({side,slot,hp:COVER_HP,maxHp:COVER_HP})))};}
export function coverAt(b,side,slot){return b?.terrain?.cover?.find(c=>c.side===side&&c.slot===slot)??null;}
export function hasCover(b,f){return f.slot%3===0&&(coverAt(b,f.side,f.slot)?.hp??COVER_HP)>0;}
// Destruction is decided by the authoritative battle, using actual hits and no extra RNG.
export function damageTerrain(b,event,lookup){
 b.terrain??=createTerrain();if(event.dodge)return [];
 const h=lookup(event.attacker),heavy=['hulk','thor','groot','marvel'].includes(h.id);
 const changes=[];
 for(const hit of event.hits){
  const f=b.fighters[1-event.side].find(f=>f.id===hit.id),cover=f&&coverAt(b,f.side,f.slot);
  if(!cover||cover.hp<=0)continue;
  const force=hit.damage+hit.absorbed;if(force<=0)continue;
  const damage=Math.max(6,Math.round(force*(heavy?event.special?1.2:.8:h.combat==='ranged'?.65:.45)));
  const before=cover.hp;cover.hp=Math.max(0,before-damage);
  changes.push({...cover,before,damage:before-cover.hp,broken:cover.hp===0});
 }
 return changes;
}
export function duelState(b,health=f=>f.hp){
 if(!b||b.done)return null;
 const living=b.fighters.map(fs=>fs.filter(f=>health(f)>0));
 return living.every(fs=>fs.length===1)?{ids:living.map(fs=>fs[0].id)}:null;
}

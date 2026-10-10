export const ROLES=[
 {id:'assault',name:'Ön safa saldır',short:'HÜCUM',desc:'Ön saftaki rakipleri baskılar. Standart saldırı gücü.'},
 {id:'hunt',name:'Zayıf rakibi avla',short:'AVCI',desc:'En düşük can oranına sahip ulaşılabilir rakibi seçer. Hız 8+ veya uçuş varsa arka safa sızar; saldırı −%8.'},
 {id:'protect',name:'Komşunu koru',short:'KORUMA',desc:'Tur başına bir kez komşunun doğrudan hasarının %30’unu üstlenir. Saldırısı −%15.'}
];
export const ZONES=[
 {id:'cover',name:'Siper',symbol:'◇',desc:'Menzilli vuruşlardan −%20 hasar; saldırı −%8. Alan saldırıları siperi aşar.'},
 {id:'open',name:'Açık alan',symbol:'↯',desc:'Saldırı +%8; doğrudan alınan hasar +%8.'},
 {id:'high',name:'Yüksek platform',symbol:'△',desc:'Menzilli saldırı +%8, uçabiliyorsa +%12. Yerdeki kahramanların girişimi −1.'}
];
export const rowOf=slot=>Math.floor(slot/3),laneOf=slot=>slot%3;
export const adjacent=(a,b)=>Number.isInteger(a)&&Number.isInteger(b)&&Math.abs(rowOf(a)-rowOf(b))+Math.abs(laneOf(a)-laneOf(b))===1;
export const zoneOf=slot=>ZONES[laneOf(slot)]||ZONES[1];
export function validPlan(team,plan){return Array.isArray(plan)&&plan.length===team.length&&new Set(plan.map(p=>p?.id)).size===team.length&&new Set(plan.map(p=>p?.slot)).size===team.length&&plan.every(p=>p&&team.includes(p.id)&&Number.isInteger(p.slot)&&p.slot>=0&&p.slot<6&&ROLES.some(r=>r.id===p.role));}
export function defaultPlan(team,lookup){
 const sorted=[...team].sort((a,b)=>{const ha=lookup(a),hb=lookup(b);return (hb.stats[3]+(hb.combat==='melee'?3:0))-(ha.stats[3]+(ha.combat==='melee'?3:0));});
 const slots=[1,0,4,3,5];
 return sorted.map((id,i)=>{const h=lookup(id);return {id,slot:slots[i],role:i===0&&team.length>1&&h.stats[3]>=8?'protect':h.stats[2]>=8?'hunt':'assault'};});
}
export function resolvedPlan(team,plan,lookup){return validPlan(team,plan)?plan.map(({id,slot,role})=>({id,slot,role})):defaultPlan(team,lookup);}
export function positionFor(slot,side){return [(side===0?-1:1)*(rowOf(slot)===0?2.6:5.6),laneOf(slot)===2?.65:0,(laneOf(slot)-1)*3.2];}
export function selectTarget(b,attacker,opponents,randomTarget,focus,lookup){
 if(!b.strategy)return {target:opponents.find(f=>f.id===focus)||randomTarget,screened:false,flank:false};
 const h=lookup(attacker.id),flank=attacker.role==='hunt'&&(h.flight||attacker.stats[2]>=8);
 const fronts=opponents.filter(f=>rowOf(f.slot)===0);
 const reachable=h.combat==='melee'&&!flank&&fronts.length?fronts:opponents;
 const intended=opponents.find(f=>f.id===focus);
 let target=intended&&reachable.includes(intended)?intended:null;
 if(!target){const candidates=attacker.role==='hunt'?reachable.filter(f=>f.hp/f.maxHp===Math.min(...reachable.map(x=>x.hp/x.maxHp))):reachable.filter(f=>rowOf(f.slot)===0);const choices=candidates.length?candidates:reachable;target=choices.includes(randomTarget)?randomTarget:choices[0];}
 return {target,screened:!!(target&&rowOf(target.slot)===1&&fronts.length&&h.combat==='ranged'&&!flank),flank:!!(flank&&target&&rowOf(target.slot)===1),intercepted:intended&&target!==intended?intended.id:null};
}

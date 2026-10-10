// Shared by the browser and both room transports. Charging never applies damage.
export const CLIMAX_WINDUP=4000;
export const CLIMAXES={
 thor:{name:'Göklerin gazabı',kind:'storm',color:'#a6dcff',threshold:.7,multiplier:1.45},
 ironman:{name:'Tam cephanelik',kind:'arsenal',color:'#ffcb79',threshold:.65,multiplier:1.5},
 wanda:{name:'Kaosun yükselişi',kind:'chaos',color:'#ff477e',threshold:.65,multiplier:1.45}
};
export function climaxReady(f){const p=CLIMAXES[f.id];return !!(p&&f.hp>0&&!f.climaxUsed&&f.actions>=2&&(f.hp/f.maxHp<=p.threshold||f.actions>=5));}
export function chargeClimax(b,attacker,target){
 const spec=CLIMAXES[attacker.id];attacker.climaxUsed=true;
 const pending={attacker:attacker.id,target:target.id,side:attacker.side,...spec,windup:CLIMAX_WINDUP,interrupted:false};b.pendingClimax=pending;
 const event={type:'charge',round:b.round,attacker:attacker.id,target:target.id,side:attacker.side,damage:0,absorbed:0,hits:[],terrain:[],defeated:[],extras:['Rakip 4 saniyede kalkan, savunma veya karşı hamle seçebilir.'],strategy:[],special:false,dodge:false,crit:false,finisher:false,knockout:false,skill:spec.name,climax:{...pending,phase:'charge'}};
 b.events.push(event);return event;
}
export function underClimax(b,side){return !!(b?.pendingClimax&&b.pendingClimax.side!==side&&!b.pendingClimax.interrupted);}

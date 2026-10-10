// Statistics follow actual damage and consumed shields, never animation frames.
export function metrics(f){return f.metrics??={damage:0,protection:0,healing:0,knockouts:0};}
export function grantShield(f,amount,source=null){
 const granted=Math.max(0,Math.min(amount,60-f.shield));
 f.shieldSources??=[];
 const tracked=f.shieldSources.reduce((n,s)=>n+s.amount,0);
 if(tracked<f.shield)f.shieldSources.push({id:null,amount:f.shield-tracked});
 if(granted)f.shieldSources.push({id:source,amount:granted});
 f.shield+=granted;return granted;
}
export function absorbShield(b,f,amount){
 const absorbed=Math.min(f.shield,Math.max(0,amount));let left=absorbed;
 f.shieldSources??=[];
 const tracked=f.shieldSources.reduce((n,s)=>n+s.amount,0);
 if(tracked<f.shield)f.shieldSources.unshift({id:null,amount:f.shield-tracked});
 for(const source of f.shieldSources){const used=Math.min(left,source.amount);source.amount-=used;left-=used;const owner=b.fighters[f.side].find(x=>x.id===source.id);if(owner)metrics(owner).protection+=used;if(!left)break;}
 f.shieldSources=f.shieldSources.filter(s=>s.amount>0);f.shield-=absorbed;return absorbed;
}
export function battleHighlights(b){
 const fighters=b.fighters.flat().map(f=>({id:f.id,side:f.side,...(f.metrics||{damage:0,protection:0,healing:0,knockouts:0})}));
 const best=key=>fighters.filter(f=>f[key]>0).sort((a,c)=>c[key]-a[key]||a.id.localeCompare(c.id))[0]??null;
 const candidates=b.events.filter(e=>(b.winner===null||e.side===b.winner)&&e.hits?.some(h=>h.damage>0));
 const turning=candidates.reduce((best,e)=>{const knockouts=e.defeated?.length||0,damage=e.hits.reduce((n,h)=>n+h.damage,0);return !best||knockouts>best.knockouts||knockouts===best.knockouts&&damage>best.damage?{event:e,knockouts,damage}:best;},null)?.event??null;
 return {damage:best('damage'),protection:best('protection'),turning};
}

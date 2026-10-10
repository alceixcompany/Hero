import {hero,visibleLots} from './engine.mjs?v=6';
export function auctionLots(game,portrait){
  return `<section class="pool-section"><div class="section-line"><h2>AÇILAN KAHRAMANLAR</h2><span class="muted">${Math.min(game.round,10)} / 10 tamamlandı</span></div><div class="pool">${visibleLots(game).map(({id,index:i})=>{
    if(!id)return `<div class="pool-card sealed" aria-label="${i+1}. karakter gizli"><span class="pool-number">${String(i+1).padStart(2,'0')}</span><span class="sealed-emblem">N</span><strong>GİZLİ</strong><span class="pool-type">Sırası gelince açılır</span></div>`;
    const x=hero(id),lot=game.history.find(t=>t.id===id&&!t.reinforcement);
    return `<button class="pool-card ${i===game.round&&game.phase==='auction'?'current':''} ${i<game.round?'sold':''}" data-action="detail" data-id="${id}">${portrait(x)}<div class="pool-shade"></div><span class="pool-number">${String(i+1).padStart(2,'0')}</span>${lot?`<span class="owner-marker ${lot.winner===null?'unsold':'p'+lot.winner}">${lot.winner===null?'PAS':`P${lot.winner+1} · ${lot.price} ◈`}</span>`:i===game.round&&game.phase==='auction'?'<span class="current-marker">ŞİMDİ</span>':''}<strong>${x.name}</strong><span class="pool-type">${x.type}</span></button>`;
  }).join('')}</div><p class="sealed-note">Sıradaki kahramanlar gizli. Her karakter yalnızca kendi açık artırması başladığında açılır.</p></section>`;
}

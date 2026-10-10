// Reset on a new lot or bidding turn, while keeping a player's draft through room polls.
export function auctionSelection(game,previous={},{scope='local'}={}){
 const key=[scope,game.pool.join(','),game.round,game.turn,game.bid].join('|');
 const min=game.bid+1,budget=game.players[game.turn].coins;
 const amount=key===previous.key&&Number.isInteger(previous.amount)?previous.amount:min;
 return {key,amount:Math.max(min,Math.min(amount,budget))};
}

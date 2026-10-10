import test from 'node:test';
import assert from 'node:assert/strict';
import {auctionSelection} from '../dist/auction-selection.mjs';
import {auctionShow} from '../dist/auction-ui.mjs';
import {newGame,bid,pass} from '../dist/engine.mjs';

test('a new hero starts at 1 after an expensive sale in local, bot and online games',()=>{
 for(const mode of ['local','bot','online']){
  const game=newGame(['Ada','Emir'],mode);let selection=auctionSelection(game,{}, {scope:mode});
  bid(game,11);selection=auctionSelection(game,selection,{scope:mode});assert.equal(selection.amount,12);
  pass(game);selection=auctionSelection(game,selection,{scope:mode});
  assert.equal(game.round,1);assert.equal(game.bid,0);assert.equal(selection.amount,1);assert.equal(game.turn,1);
  // A second sale opens for the other player, independently of the previous bid.
  bid(game,8);selection=auctionSelection(game,selection,{scope:mode});pass(game);
  assert.equal(auctionSelection(game,selection,{scope:mode}).amount,1);
 }
});
test('room updates keep the draft on the same turn but a new turn, lot or room resets it',()=>{
 const g=newGame();let choice=auctionSelection(g,{}, {scope:'ROOMAA'});choice.amount=7;
 assert.equal(auctionSelection(structuredClone(g),choice,{scope:'ROOMAA'}).amount,7);
 assert.equal(auctionSelection(g,choice,{scope:'ROOMBB'}).amount,1);
 pass(g);assert.equal(auctionSelection(g,choice,{scope:'ROOMAA'}).amount,1);
 pass(g);assert.equal(auctionSelection(g,choice,{scope:'ROOMAA'}).amount,1);
 choice=auctionSelection(g,{}, {scope:'ROOMAA'});choice.amount=20;g.players[g.turn].coins=3;
 assert.equal(auctionSelection(g,choice,{scope:'ROOMAA'}).amount,3);
 bid(g,3);assert.equal(auctionSelection(g,choice,{scope:'ROOMAA'}).amount,4);
});
test('auction announces the starter, current bidder and online ownership without leaking future heroes',()=>{
 const g=newGame(['Ada','Emir'],'online');
 const render=side=>auctionShow(g,{portrait:()=>'',esc:s=>String(s),icon:()=>'',playerPanel:()=>'',ready:()=>'',selectedBid:g.bid+1,room:{side,connected:true,pending:false,slots:[{connected:true},{connected:true}]}});
 assert.match(render(0),/SIRA SENDE/);assert.match(render(1),/SIRA RAKİBİNDE/);
 assert.match(render(0),/İlk teklif: Ada · Açılış 1 coin/);
 bid(g,9);const html=render(1);assert.match(html,/SIRA SENDE/);assert.match(html,/Teklifi yükselt: en az 10 coin/);assert.match(html,/BU KARAKTERİ BAŞLATAN<\/small><b>Ada/);
 pass(g);assert.match(render(1),/İlk teklif: Emir · Açılış 1 coin/);assert.match(render(1),/BU KARAKTERİ BAŞLATAN<\/small><b>Emir/);
});

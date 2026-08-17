'use strict';
const assert=require('node:assert/strict');
const R=require('../assets/regula-strigoi-1.js');

function take(state,color,id,to){
  const piece=state.reserve[color].find(candidate=>candidate.id===id);
  state.reserve[color]=state.reserve[color].filter(candidate=>candidate.id!==id);
  state.board[to].push(piece);
}
function move(kind,id,from,to){return{kind,id,size:id[1],from,to};}
function test(name,fn){try{fn();console.log(`ok - ${name}`);}catch(error){console.error(`not ok - ${name}`);throw error;}}

test('trei Strigoi castiga instant',()=>{
  const state=R.createState();
  take(state,'b','bL1',0);take(state,'b','bL2',1);
  const result=R.applyMove(state,move('r','bL3',null,2),'b');
  assert.equal(result.ok,true);assert.equal(state.winner,'b');assert.equal(state.over,true);assert.equal(state.pendingThreats.length,0);
});

test('o linie mixta devine pending threat cu defender explicit',()=>{
  const state=R.createState();
  take(state,'b','bL1',0);take(state,'b','bM1',1);
  R.applyMove(state,move('r','bS1',null,2),'b');
  assert.equal(state.winner,null);assert.equal(state.turn,'o');assert.equal(state.pendingThreats.length,1);
  assert.deepEqual(state.pendingThreats[0],{id:'b:0-1-2',attacker:'b',defender:'o',line:[0,1,2]});
  assert.ok(R.legalMoves(state).every(candidate=>candidate.kind==='r'&&[1,2].includes(candidate.to)));
});

test('o piesa mutata de pe tabla nu poate bloca amenintarea',()=>{
  const state=R.createState();
  take(state,'b','bL1',0);take(state,'b','bM1',1);take(state,'o','oL1',4);
  R.applyMove(state,move('r','bS1',null,2),'b');
  const result=R.applyMove(state,move('b','oL1',4,2),'o');
  assert.equal(result.ok,false);assert.equal(result.reason,'must-block-all');assert.equal(state.winner,null);
});

test('o singura mutare din rezerva poate bloca doua amenintari la intersectie',()=>{
  const state=R.createState();
  take(state,'b','bL1',0);take(state,'b','bL2',8);take(state,'b','bM1',3);take(state,'b','bL3',5);
  R.applyMove(state,move('r','bS1',null,4),'b');
  assert.equal(state.pendingThreats.length,2);
  const blocks=R.legalMoves(state);
  assert.ok(blocks.length>0);assert.ok(blocks.every(candidate=>candidate.kind==='r'&&candidate.to===4));
  const result=R.applyMove(state,blocks.find(candidate=>candidate.size==='M'),'o');
  assert.equal(result.ok,true);assert.equal(state.winner,null);assert.equal(state.pendingThreats.filter(t=>t.attacker==='b').length,0);
});

test('atacatorul castiga daca doua amenintari nu pot fi blocate de aceeasi mutare',()=>{
  const state=R.createState();
  take(state,'b','bS1',0);take(state,'b','bM1',8);take(state,'b','bS2',3);take(state,'b','bM2',5);
  R.applyMove(state,move('r','bL1',null,4),'b');
  assert.equal(state.winner,'b');assert.equal(state.over,true);assert.equal(state.pendingThreats.length,2);
});

test('linia adversarului descoperita asteapta urmatoarea tura a defenderului',()=>{
  const state=R.createState();
  take(state,'o','oL1',0);take(state,'o','oS1',1);take(state,'o','oM1',2);take(state,'b','bL1',2);
  const first=R.applyMove(state,move('b','bL1',2,3),'b');
  assert.equal(first.ok,true);assert.equal(state.turn,'o');assert.equal(state.winner,null);
  assert.equal(state.pendingThreats[0].attacker,'o');assert.equal(state.pendingThreats[0].defender,'b');
  R.applyMove(state,move('r','oS2',null,8),'o');
  assert.equal(state.turn,'b');assert.equal(state.winner,null);assert.equal(R.pendingFor(state,'b').length,1);
});

test('pending threats se rezolva inaintea victoriei noi a defenderului',()=>{
  const state=R.createState();
  take(state,'b','bL1',0);take(state,'b','bM1',1);take(state,'o','oL1',5);take(state,'o','oL2',8);
  R.applyMove(state,move('r','bS1',null,2),'b');
  const block=R.legalMoves(state).find(candidate=>candidate.id==='oL3'&&candidate.to===2);
  assert.ok(block);
  R.applyMove(state,block,'o');
  assert.equal(state.winner,'o');assert.equal(state.pendingThreats.filter(t=>t.attacker==='b').length,0);
});

test('clone load si reset includ pending threats si winner state',()=>{
  const state=R.createState();
  take(state,'b','bL1',0);take(state,'b','bM1',1);R.applyMove(state,move('r','bS1',null,2),'b');
  const saved=R.cloneState(state);state.pendingThreats=[];state.winner='o';state.over=true;
  R.loadState(state,saved);
  assert.equal(state.pendingThreats.length,1);assert.equal(state.winner,null);assert.equal(state.over,false);
  state.winner='b';state.over=true;
  const terminal=R.cloneState(state);state.winner=null;state.over=false;R.loadState(state,terminal);
  assert.equal(state.winner,'b');assert.equal(state.over,true);
  R.resetState(state);
  assert.equal(state.pendingThreats.length,0);assert.equal(state.winner,null);assert.equal(state.over,false);assert.equal(state.turn,'b');
});

test('AI si hint sunt constranse automat la un block legal',()=>{
  const state=R.createState();
  take(state,'b','bL1',0);take(state,'b','bM1',1);R.applyMove(state,move('r','bS1',null,2),'b');
  const best=R.bestMove(state,'o').m;
  assert.ok(best);assert.equal(best.kind,'r');assert.ok([1,2].includes(best.to));
  assert.ok(R.isLegalBlockMove(state,best,R.pendingFor(state,'o'),'o'));
});

test('o linie mixta este presiune, nu victorie imediata',()=>{
  const state=R.createState();
  take(state,'b','bL1',0);take(state,'b','bM1',1);
  const immediate=R.immediateWin(state,'b');
  assert.equal(immediate,null);
  const next=R.cloneState(state);R.applyMove(next,move('r','bS1',null,2),'b');
  assert.equal(next.winner,null);assert.ok(R.scoreState(next,'b')>R.scoreState(state,'b'));
});


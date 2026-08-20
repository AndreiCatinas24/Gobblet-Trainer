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

test('fiecare jucator are doua piese din fiecare marime',()=>{
  const state=R.createState();
  for(const color of['b','o']){
    assert.equal(state.reserve[color].length,6);
    for(const size of['L','M','S'])assert.equal(state.reserve[color].filter(piece=>piece.size===size).length,2);
  }
});

test('o linie completa cu ambii Strigoi devine aproape castigatoare',()=>{
  const state=R.createState();
  take(state,'b','bL1',0);take(state,'b','bL2',1);
  const result=R.applyMove(state,move('r','bM1',null,2),'b');
  assert.equal(result.ok,true);assert.equal(state.winner,null);assert.equal(state.over,false);assert.equal(state.pendingThreats.length,1);
  assert.ok(R.legalMoves(state).every(candidate=>candidate.kind==='r'&&candidate.size==='L'&&candidate.to===2));
});

test('o linie mixta devine pending threat cu defender explicit',()=>{
  const state=R.createState();
  take(state,'b','bL1',0);take(state,'b','bM1',1);
  R.applyMove(state,move('r','bS1',null,2),'b');
  assert.equal(state.winner,null);assert.equal(state.turn,'o');assert.equal(state.pendingThreats.length,1);
  assert.deepEqual(state.pendingThreats[0],{id:'b:0-1-2',attacker:'b',defender:'o',line:[0,1,2]});
  assert.ok(R.legalMoves(state).every(candidate=>candidate.kind==='r'&&[1,2].includes(candidate.to)));
});

test('o piesa suficient de mare mutata de pe tabla poate bloca amenintarea',()=>{
  const state=R.createState();
  take(state,'b','bL1',0);take(state,'b','bM1',1);take(state,'o','oL1',4);
  R.applyMove(state,move('r','bS1',null,2),'b');
  const result=R.applyMove(state,move('b','oL1',4,2),'o');
  assert.equal(result.ok,true);assert.equal(state.winner,null);assert.equal(state.pendingThreats.filter(t=>t.attacker==='b').length,0);
});

test('o aparare cu piesa de pe tabla pierde imediat daca ridicarea descopera linia adversarului',()=>{
  const state=R.createState();
  take(state,'o','oL1',0);take(state,'o','oL2',1);take(state,'o','oS2',2);take(state,'b','bL1',2);
  take(state,'o','oM1',3);take(state,'o','oS1',4);take(state,'o','oM2',5);
  state.pendingThreats=[{id:'o:3-4-5',attacker:'o',defender:'b',line:[3,4,5]}];
  const candidate=R.legalMoves(state,'b').find(item=>item.kind==='b'&&item.id==='bL1'&&item.from===2&&item.to===3);
  assert.ok(candidate);
  const result=R.applyMove(state,candidate,'b');
  assert.equal(result.ok,true);assert.equal(result.revealedWin,true);assert.equal(state.winner,'o');assert.equal(state.over,true);
  assert.equal(R.top(state,2).id,'oS2');assert.equal(R.top(state,3).id,'oM1');
  assert.ok(result.revealedLines.some(line=>line.join('-')==='0-1-2'));
});

test('piesele proprii pot merge pe liber sau peste o piesa proprie mai mica',()=>{
  const state=R.createState();
  take(state,'b','bM1',0);take(state,'b','bS1',1);
  const moves=R.basicMoves(state,'b');
  assert.ok(moves.some(candidate=>candidate.kind==='b'&&candidate.id==='bM1'&&candidate.from===0&&candidate.to===1));
  assert.ok(moves.some(candidate=>candidate.kind==='b'&&candidate.id==='bM1'&&candidate.from===0&&candidate.to===2));
  assert.ok(moves.some(candidate=>candidate.kind==='r'&&candidate.id==='bL1'&&candidate.to===0));
});

test('o singura mutare din rezerva poate bloca doua amenintari la intersectie',()=>{
  const state=R.createState();
  take(state,'b','bL1',0);take(state,'b','bM1',8);take(state,'b','bL2',3);take(state,'b','bM2',5);
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

test('orice mutare de pe tabla pierde imediat daca ridicarea descopera linia adversarului',()=>{
  const state=R.createState();
  take(state,'o','oL1',0);take(state,'o','oS1',1);take(state,'o','oM1',2);take(state,'b','bL1',2);
  const result=R.applyMove(state,move('b','bL1',2,3),'b');
  assert.equal(result.ok,true);assert.equal(result.revealedWin,true);assert.equal(state.winner,'o');assert.equal(state.over,true);
  assert.equal(R.top(state,2).id,'oM1');assert.equal(R.top(state,3),null);
  assert.ok(result.revealedLines.some(line=>line.join('-')==='0-1-2'));
});

test('pending threats se rezolva inaintea scanarii liniei noi a defenderului',()=>{
  const state=R.createState();
  take(state,'b','bL1',0);take(state,'b','bM1',1);take(state,'o','oL1',5);take(state,'o','oL2',8);
  R.applyMove(state,move('r','bS1',null,2),'b');
  const block=R.legalMoves(state).find(candidate=>candidate.id==='oM1'&&candidate.to===2);
  assert.ok(block);
  R.applyMove(state,block,'o');
  assert.equal(state.winner,null);assert.equal(state.pendingThreats.filter(t=>t.attacker==='b').length,0);
  assert.equal(state.pendingThreats.filter(t=>t.attacker==='o').length,1);assert.equal(state.turn,'b');
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
  take(state,'b','bL1',0);take(state,'b','bM1',1);take(state,'o','oL1',4);R.applyMove(state,move('r','bS1',null,2),'b');
  const best=R.bestMove(state,'o').m;
  assert.ok(best);assert.ok([1,2].includes(best.to));
  assert.ok(R.isLegalBlockMove(state,best,R.pendingFor(state,'o'),'o'));
});

test('o linie mixta este presiune, nu victorie imediata',()=>{
  const state=R.createState();
  take(state,'b','bM1',0);take(state,'b','bS1',1);
  const immediate=R.immediateWin(state,'b');
  assert.equal(immediate,null);
  const next=R.cloneState(state);R.applyMove(next,move('r','bS2',null,2),'b');
  assert.equal(next.winner,null);assert.ok(R.scoreState(next,'b')>R.scoreState(state,'b'));
});

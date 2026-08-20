(()=>{
'use strict';
const E=window.RegulaStrigoi1;
if(!E)throw new Error('regula_strigoi_1 engine is missing');
const IMG={b:{L:'assets/mask-large.svg',M:'assets/mask-medium-transparent.svg',S:'assets/mask-small-white.svg?v=20260820b'},o:{L:'assets/mask-large-orange.svg',M:'assets/mask-medium-orange-transparent.svg',S:'assets/mask-small-white-orange.svg?v=20260820b'}};
const TYPE_NAME={S:'Moroi',M:'Pricolici',L:'Strigoi'},PIECES_PER_SIZE=2;
const TAUNTS=['Mama ta știe ce faci?','Ești de belea, vai de mama ta.','Nu mai plânge! Nu mai suferi!','Ai în cap loc doar pentru manele.','Cred că e nevoie să închizi Pornhub.','Ești slab la minte, dar ai alte calități.','Cine te recomandă? Mama ta?','Atât de slab nu am mai văzut.','De asta nu ne vizitează extratereștrii.','Mai bine joci Bambilici cu copiii.','Lasă-te, că nu e de tine.'];
let game,selected,history,log,hintMove=null,impactCell=null,aiTimer=null,impactTimer=null,lastTaunt=-1;
const $=id=>document.getElementById(id),top=i=>E.top(game,i),name=color=>color==='b'?'albastru':'portocaliu';
function clone(){return E.cloneState(game);}
function load(state){E.loadState(game,state);}
function moves(color=game.turn){return E.legalMoves(game,color);}
function legalDestinations(id,from){return moves('b').filter(move=>move.id===id&&move.from===from).map(move=>move.to);}
function activeThreats(color){return game.pendingThreats.filter(threat=>threat.attacker===color&&E.isThreatIntact(game,threat));}
function dueThreats(color=game.turn){return E.pendingFor(game,color);}
function desc(move){return!move?'—':move.kind==='r'?`${TYPE_NAME[move.size]} → ${move.to+1}`:`${TYPE_NAME[move.size]}: ${move.from+1} → ${move.to+1}`;}
function msg(text){$('coach').textContent=text;}
function randomTaunt(){let index=Math.floor(Math.random()*TAUNTS.length);if(TAUNTS.length>1&&index===lastTaunt)index=(index+1+Math.floor(Math.random()*(TAUNTS.length-1)))%TAUNTS.length;lastTaunt=index;return TAUNTS[index];}
function showTaunt(){const banner=$('aiTauntBanner');if(!banner)return;banner.innerHTML=`<span class="ai-taunt-label">AI gândește...</span><strong>${randomTaunt()}</strong>`;banner.hidden=false;}
function clearTaunt(){const banner=$('aiTauntBanner');if(!banner)return;banner.hidden=true;banner.innerHTML='';}
function clearTimers(){if(aiTimer){clearTimeout(aiTimer);aiTimer=null;}if(impactTimer){clearTimeout(impactTimer);impactTimer=null;}clearTaunt();}
function pieceHTML(piece){return`<img class="mask-art team-${piece.color} size-${piece.size}" src="${IMG[piece.color][piece.size]}" alt="${TYPE_NAME[piece.size]}">`;}
function threatCells(){
  const result={b:new Set(),o:new Set(),due:new Set()};
  game.pendingThreats.filter(threat=>E.isThreatIntact(game,threat)).forEach(threat=>{
    threat.line.forEach(index=>result[threat.attacker].add(index));
    if(threat.defender===game.turn)threat.line.forEach(index=>result.due.add(index));
  });
  return result;
}
function renderBoard(){
  let legal=[];
  if(selected){
    const piece=selected.kind==='r'?game.reserve.b.find(item=>item.id===selected.id):top(selected.from);
    if(piece)legal=legalDestinations(piece.id,selected.from);
  }
  const marked=threatCells(),board=$('board'),defenseMoves=dueThreats('b').length?moves('b').filter(move=>move.kind==='b'):[];
  board.innerHTML='';
  for(let index=0;index<9;index++){
    const cell=document.createElement('button');
    cell.type='button';
    const vulnerable=(marked.b.has(index)?' vulnerable vulnerable-b':'')+(marked.o.has(index)?' vulnerable vulnerable-o':'')+(marked.due.has(index)?' threat-due':'');
    cell.className='cell'+(legal.includes(index)?' legal':'')+(hintMove&&hintMove.to===index?' hint-target':'')+(impactCell===index?' ai-impact':'')+vulnerable;
    cell.innerHTML=`<span class="num">${index+1}</span>`+(game.board[index].length>1?`<span class="stack">×${game.board[index].length}</span>`:'');
    const piece=top(index);
    cell.setAttribute('aria-label',piece?`Căsuța ${index+1}: ${TYPE_NAME[piece.size]} ${name(piece.color)}, teanc de ${game.board[index].length}`:`Căsuța ${index+1}: liberă`);
    if(piece){
      const node=document.createElement('div');
      node.className=`piece ${piece.size}${selected&&selected.id===piece.id?' selected':''}${defenseMoves.some(move=>move.from===index)?' board-defense-option':''}`;
      node.innerHTML=pieceHTML(piece);
      node.onclick=event=>{event.stopPropagation();if(piece.color==='b'&&!selected)selectBoard(index);else playTo(index);};
      cell.appendChild(node);
    }
    cell.onclick=()=>{const current=top(index);if(current&&current.color==='b'&&!selected)selectBoard(index);else playTo(index);};
    board.appendChild(cell);
  }
}
function groupTemplate(title,subtitle,cssClass,piecesList){
  const group=document.createElement('div');
  group.className='reserve-group';
  group.innerHTML=`<div class="reserve-head"><strong>${title}</strong><span>${subtitle}</span></div><div class="reserve-row ${cssClass}"></div>`;
  const row=group.querySelector('.reserve-row'),forced=dueThreats('b').length>0;
  piecesList.forEach(piece=>{
    const available=moves('b').some(move=>move.id===piece.id);
    const node=document.createElement('div');
    node.className=`piece ${piece.size}${selected&&selected.id===piece.id?' selected':''}${forced&&available?' defense-option':''}${forced&&!available?' defense-unavailable':''}`;
    node.setAttribute('role','button');node.tabIndex=0;node.setAttribute('aria-label',`${TYPE_NAME[piece.size]} albastru din rezervă`);
    node.innerHTML=pieceHTML(piece);
    node.onclick=()=>selectReserve(piece.id);
    node.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectReserve(piece.id);}};
    row.appendChild(node);
  });
  return group;
}
function renderReserve(){
  const groups=$('reserveGroups');groups.innerHTML='';
  const sorted={L:game.reserve.b.filter(piece=>piece.size==='L'),M:game.reserve.b.filter(piece=>piece.size==='M'),S:game.reserve.b.filter(piece=>piece.size==='S')};
  groups.appendChild(groupTemplate('Strigoi',`${sorted.L.length}/${PIECES_PER_SIZE} în rezervă`,'large',sorted.L));
  groups.appendChild(groupTemplate('Pricolici',`${sorted.M.length}/${PIECES_PER_SIZE} în rezervă`,'medium',sorted.M));
  groups.appendChild(groupTemplate('Moroi',`${sorted.S.length}/${PIECES_PER_SIZE} în rezervă`,'small',sorted.S));
}
function renderThreatBanner(){
  const banner=$('threatBanner');if(!banner)return;
  const pending=game.pendingThreats.filter(threat=>E.isThreatIntact(game,threat));
  if(game.over||!pending.length){banner.hidden=true;banner.textContent='';return;}
  const due=dueThreats();
  banner.hidden=false;
  const boardDefenseAvailable=due.length&&moves().some(move=>move.kind==='b');
  banner.className=`threat-banner${due.length?' is-due':''}${boardDefenseAvailable?' has-board-defense':''}`;
  if(due.length){
    if(game.turn==='b'){
      banner.textContent=`APROAPE CÂȘTIG: rupe ${due.length===1?'linia roșie':'toate liniile roșii'} cu o mască mai mare din rezervă sau mutând una albastră de pe tablă peste o mască portocalie mai mică. ${boardDefenseAvailable?'Măștile albastre care pot apăra pulsează verde. ':''}Atenție: dacă ridicarea unei măști descoperă o linie portocalie completă, AI câștigă imediat.`;
    }else{
      banner.textContent=`AI trebuie să rupă ${due.length===1?'linia roșie':'toate liniile roșii'} în această tură. Poate folosi rezerva sau o mască portocalie deja de pe tablă; dacă ridicarea ei descoperă o linie albastră completă, câștigi imediat.`;
    }
  }else{
    banner.textContent=`${pending.length} ${pending.length===1?'linie aproape câștigătoare':'linii aproape câștigătoare'}. Conturul roșu arată căsuțele implicate.`;
  }
}
function render(){
  const due=dueThreats();
  $('status').textContent=game.over?(game.winner==='b'?'Ai câștigat':'AI a câștigat'):(due.length?(game.turn==='b'?'APROAPE CÂȘTIG — rupe linia roșie':'AI apără linia roșie'):(game.turn==='b'?'Rândul tău':'AI gândește...'));
  renderThreatBanner();renderBoard();renderReserve();
  $('mine').textContent=activeThreats('b').length;$('theirs').textContent=activeThreats('o').length;$('eval').textContent=E.scoreState(game,'b');
  const rows=$('historyRows');rows.innerHTML='';
  log.forEach((entry,index)=>{const row=document.createElement('div');row.className='row';row.innerHTML=`<div>${index+1}</div><div>${entry.b}</div><div>${entry.o}</div>`;rows.appendChild(row);});
}
function selectReserve(id){
  if(game.turn!=='b'||game.over)return;
  const piece=game.reserve.b.find(item=>item.id===id);if(!piece)return;
  if(!moves('b').some(move=>move.id===id)){msg('În această tură trebuie să rupi toate liniile roșii cu o singură piesă potrivită din rezervă sau de pe tablă.');return;}
  selected={kind:'r',id:piece.id,size:piece.size,from:null};render();
}
function selectBoard(index){
  if(game.turn!=='b'||game.over)return;
  const piece=top(index);if(piece&&piece.color==='b'){
    if(dueThreats('b').length&&!moves('b').some(move=>move.kind==='b'&&move.from===index)){msg('Această piesă nu poate rupe toate liniile roșii. Alege una care pulsează verde sau o piesă potrivită din rezervă.');return;}
    selected={kind:'b',id:piece.id,size:piece.size,from:index};
    if(dueThreats('b').length)msg('Poți muta această mască peste o mască portocalie mai mică din linia roșie. Atenție la ce se află sub ea: dacă ridicarea descoperă o linie portocalie completă, pierzi imediat.');
    render();
  }
}
function playTo(index){
  if(game.turn!=='b'||game.over||!selected)return;
  const candidates=moves('b'),chosen=candidates.find(move=>move.id===selected.id&&move.from===selected.from&&move.to===index);
  if(!chosen){msg(dueThreats('b').length?'Blocaj ilegal. Folosește o piesă suficient de mare din rezervă sau de pe tablă, peste o piesă portocalie mai mică din linia roșie.':'Mutare ilegală. O piesă poate acoperi doar o piesă mai mică.');return;}
  const before=clone(),recommendation=E.bestMove(game,'b').m;
  history.push({state:before,log:JSON.parse(JSON.stringify(log))});
  const result=E.applyMove(game,chosen,'b');
  selected=null;hintMove=null;log.push({b:desc(chosen),o:''});
  if(result.winner){
    const reason=result.revealedWin&&result.winner==='o'?'Ai ridicat o mască pentru apărare și ai descoperit dedesubt o linie portocalie completă. AI câștigă imediat.':null;
    finish(result.winner,reason);return;
  }
  const created=result.createdThreats.filter(threat=>threat.attacker==='b').length;
  if(created)msg(`${created===1?'Linie aproape câștigătoare creată':'Linii aproape câștigătoare create'}. AI are exact această tură pentru a ${created===1?'o':'le'} rupe.`);
  else msg(desc(chosen)===desc(recommendation)?`Foarte bine. ${desc(chosen)} este recomandarea motorului.`:`Ai jucat ${desc(chosen)}. Motorul preferă ${desc(recommendation)}.`);
  $('hintBox').textContent=`Ultima ta mutare: ${desc(chosen)}. AI răspunde în 3 secunde.`;
  render();showTaunt();if(aiTimer)clearTimeout(aiTimer);aiTimer=setTimeout(()=>{aiTimer=null;ai();},3000);
}
function ai(){
  clearTaunt();if(game.over){finish(game.winner);return;}
  const best=E.bestMove(game,'o').m;
  if(!best){if(game.winner)finish(game.winner);else{game.turn='b';render();}return;}
  const result=E.applyMove(game,best,'o');impactCell=best.to;if(log.length)log[log.length-1].o=desc(best);
  try{if(navigator.vibrate)navigator.vibrate(35);}catch(error){}
  if(result.winner){
    const reason=result.revealedWin&&result.winner==='b'?'AI a ridicat o mască pentru apărare și a descoperit o linie albastră completă. Ai câștigat imediat.':`AI a jucat ${desc(best)}. Lovitură decisivă.`;
    msg(reason);render();impactTimer=setTimeout(()=>{impactTimer=null;impactCell=null;finish(result.winner,reason);},900);return;
  }
  const due=dueThreats('b');
  msg(due.length?`AI a jucat ${desc(best)}. Ai o singură tură pentru a rupe ${due.length===1?'linia roșie':'toate liniile roșii'}. Poți folosi și o mască albastră deja de pe tablă dacă este suficient de mare.`:`AI a jucat ${desc(best)}. Încearcă să creezi o linie aproape câștigătoare.`);
  render();impactTimer=setTimeout(()=>{impactTimer=null;impactCell=null;render();},900);
}
function hint(){
  if(game.turn!=='b'||game.over)return;
  const best=E.bestMove(game,'b');if(!best.m)return;
  hintMove=best.m;selected={kind:best.m.kind,id:best.m.id,size:best.m.size,from:best.m.from};
  $('hintBox').textContent=`Mutarea recomandată: ${desc(best.m)}. Piesa este selectată, iar destinația este marcată cu mov.`;
  msg(dueThreats('b').length?`Blocaj legal recomandat: ${desc(best.m)}.`:`Sugestie: joacă ${desc(best.m)}.`);render();
}
function analyze(){
  if(game.turn!=='b'||game.over)return;
  const best=E.bestMove(game,'b'),score=E.scoreState(game,'b'),due=dueThreats('b');
  msg(due.length?`Poziție critică: trebuie să blochezi ${due.length===1?'amenințarea':'toate amenințările'} acum. Poți folosi rezerva sau o piesă proprie de pe tablă. Cea mai bună mutare: ${desc(best.m)}.`:`Poziție: ${score>60?'avantaj albastru':score<-60?'avantaj portocaliu':'aproape egal'}. Cea mai bună mutare: ${desc(best.m)}.`);
}
function undo(){
  if(!history.length)return;clearTimers();const entry=history.pop();load(entry.state);log=entry.log;selected=null;hintMove=null;impactCell=null;
  $('loseOverlay').classList.remove('show');msg('Am revenit înaintea ultimei tale mutări, inclusiv cu amenințările și câștigătorul restaurate.');render();
}
function fireworks(){const box=$('fireworks'),colors=['#4d94ff','#8b5cf6','#72e4ff','#ff8b41','#ffffff'];box.innerHTML='';for(let burst=0;burst<7;burst++){const x=10+Math.random()*80,y=10+Math.random()*55;for(let index=0;index<18;index++){const spark=document.createElement('span');spark.className='fire';spark.style.left=x+'vw';spark.style.top=y+'vh';spark.style.background=colors[Math.floor(Math.random()*colors.length)];const angle=Math.random()*Math.PI*2,distance=50+Math.random()*90;spark.style.setProperty('--x',Math.cos(angle)*distance+'px');spark.style.setProperty('--y',Math.sin(angle)*distance+'px');spark.style.animationDelay=burst*.08+'s';box.appendChild(spark);}}setTimeout(()=>box.innerHTML='',1700);}
function finish(winner,reason){
  clearTaunt();game.winner=winner;game.over=true;
  if(winner==='b')msg(reason||'Ai câștigat. Bravo.');else{msg(reason||'AI a câștigat. Ai fost învins în Arena Strigoilor.');$('loseOverlay').classList.add('show');fireworks();}
  render();
}
function reset(){
  clearTimers();game=E.createState();selected=null;history=[];log=[];hintMove=null;impactCell=null;$('loseOverlay').classList.remove('show');
  $('hintBox').textContent='„Mutarea optimă” selectează piesa recomandată și marchează cu mov căsuța recomandată. Tu confirmi mutarea.';
  msg('Selectează una dintre cele 6 măști albastre. Orice linie completă devine roșie și trebuie apărată de adversar în următoarea sa tură.');render();
}
$('hint').onclick=hint;$('analyze').onclick=analyze;$('undo').onclick=undo;$('newgame').onclick=reset;$('closePopup').onclick=()=>$('loseOverlay').classList.remove('show');$('loseOverlay').onclick=event=>{if(event.target===$('loseOverlay'))$('loseOverlay').classList.remove('show');};reset();
})();
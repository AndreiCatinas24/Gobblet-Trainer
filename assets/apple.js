(()=>{
'use strict';
const E=window.RegulaStrigoi1;
if(!E)throw new Error('regula_strigoi_1 engine is missing');
const IMG={b:{L:'assets/mask-large.svg',M:'assets/mask-medium-transparent.svg',S:'assets/mask-medium.svg'},o:{L:'assets/mask-large-orange.svg',M:'assets/mask-medium-orange-transparent.svg',S:'assets/mask-small-orange.svg'}};
const TYPE_NAME={S:'Moroi',M:'Pricolici',L:'Strigoi'},TYPE_DESC={L:'mÄƒÈ™ti mari',M:'mÄƒÈ™ti medii',S:'mÄƒÈ™ti mici'};
const TAUNTS=['Mama ta È™tie ce faci?','EÈ™ti de belea, vai de mama ta.','Nu mai plÃ¢nge! Nu mai suferi!','Ai Ã®n cap loc doar pentru manele.','Cred cÄƒ e nevoie sÄƒ Ã®nchizi Pornhub.','EÈ™ti slab la minte, dar ai alte calitÄƒÈ›i.','Cine te recomandÄƒ? Mama ta?','AtÃ¢t de slab nu am mai vÄƒzut.','De asta nu ne viziteazÄƒ extratereÈ™trii.','Mai bine joci Bambilici cu copiii.','LasÄƒ-te, cÄƒ nu e de tine.'];
let game,selected,history,log,hintMove=null,impactCell=null,aiTimer=null,impactTimer=null,lastTaunt=-1;
const $=id=>document.getElementById(id),top=i=>E.top(game,i),name=color=>color==='b'?'albastru':'portocaliu';
function clone(){return E.cloneState(game);}
function load(state){E.loadState(game,state);}
function moves(color=game.turn){return E.legalMoves(game,color);}
function legalDestinations(id,from){return moves('b').filter(move=>move.id===id&&move.from===from).map(move=>move.to);}
function activeThreats(color){return game.pendingThreats.filter(threat=>threat.attacker===color&&E.isThreatIntact(game,threat));}
function dueThreats(color=game.turn){return E.pendingFor(game,color);}
function desc(move){return!move?'â€”':move.kind==='r'?`${TYPE_NAME[move.size]} â†’ ${move.to+1}`:`${TYPE_NAME[move.size]}: ${move.from+1} â†’ ${move.to+1}`;}
function msg(text){$('coach').textContent=text;}
function randomTaunt(){let index=Math.floor(Math.random()*TAUNTS.length);if(TAUNTS.length>1&&index===lastTaunt)index=(index+1+Math.floor(Math.random()*(TAUNTS.length-1)))%TAUNTS.length;lastTaunt=index;return TAUNTS[index];}
function showTaunt(){const banner=$('aiTauntBanner');if(!banner)return;banner.innerHTML=`<span class="ai-taunt-label">AI gÃ¢ndeÈ™te...</span><strong>${randomTaunt()}</strong>`;banner.hidden=false;}
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
  const marked=threatCells(),board=$('board');
  board.innerHTML='';
  for(let index=0;index<9;index++){
    const cell=document.createElement('button');
    const vulnerable=(marked.b.has(index)?' vulnerable vulnerable-b':'')+(marked.o.has(index)?' vulnerable vulnerable-o':'')+(marked.due.has(index)?' threat-due':'');
    cell.className='cell'+(legal.includes(index)?' legal':'')+(hintMove&&hintMove.to===index?' hint-target':'')+(impactCell===index?' ai-impact':'')+vulnerable;
    cell.innerHTML=`<span class="num">${index+1}</span>`+(game.board[index].length>1?`<span class="stack">Ã—${game.board[index].length}</span>`:'');
    const piece=top(index);
    if(piece){
      const node=document.createElement('div');
      node.className=`piece ${piece.size}${selected&&selected.id===piece.id?' selected':''}`;
      node.innerHTML=pieceHTML(piece);
      node.onclick=event=>{event.stopPropagation();if(piece.color==='b')selectBoard(index);else playTo(index);};
      cell.appendChild(node);
    }
    cell.onclick=()=>playTo(index);
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
    node.innerHTML=pieceHTML(piece);
    node.onclick=()=>selectReserve(piece.id);
    row.appendChild(node);
  });
  return group;
}
function renderReserve(){
  const groups=$('reserveGroups');groups.innerHTML='';
  const sorted={L:game.reserve.b.filter(piece=>piece.size==='L'),M:game.reserve.b.filter(piece=>piece.size==='M'),S:game.reserve.b.filter(piece=>piece.size==='S')};
  groups.appendChild(groupTemplate('Strigoi',TYPE_DESC.L,'large',sorted.L));
  groups.appendChild(groupTemplate('Pricolici',TYPE_DESC.M,'medium',sorted.M));
  groups.appendChild(groupTemplate('Moroi',TYPE_DESC.S,'small',sorted.S));
}
function renderThreatBanner(){
  const banner=$('threatBanner');if(!banner)return;
  const pending=game.pendingThreats.filter(threat=>E.isThreatIntact(game,threat));
  if(game.over||!pending.length){banner.hidden=true;banner.textContent='';return;}
  const due=dueThreats();
  banner.hidden=false;
  banner.className=`threat-banner${due.length?' is-due':''}`;
  if(due.length){
    banner.textContent=game.turn==='b'?`AMENINÈšARE: blocheazÄƒ ${due.length===1?'linia vulnerabilÄƒ':'toate liniile vulnerabile'} cu o mascÄƒ din rezervÄƒ.`:`AI trebuie sÄƒ blocheze ${due.length===1?'linia vulnerabilÄƒ':'toate liniile vulnerabile'} Ã®n aceastÄƒ turÄƒ.`;
  }else{
    banner.textContent=`${pending.length} ${pending.length===1?'linie vulnerabilÄƒ activÄƒ':'linii vulnerabile active'}. Conturul pulsatoriu aratÄƒ cÄƒsuÈ›ele implicate.`;
  }
}
function render(){
  const due=dueThreats();
  $('status').textContent=game.over?(game.winner==='b'?'Ai cÃ¢È™tigat':'AI a cÃ¢È™tigat'):(due.length?(game.turn==='b'?'AMENINÈšARE â€” trebuie sÄƒ blochezi':'AI blocheazÄƒ ameninÈ›area'):(game.turn==='b'?'RÃ¢ndul tÄƒu':'AI gÃ¢ndeÈ™te...'));
  renderThreatBanner();renderBoard();renderReserve();
  $('mine').textContent=activeThreats('b').length;$('theirs').textContent=activeThreats('o').length;$('eval').textContent=E.scoreState(game,'b');
  const rows=$('historyRows');rows.innerHTML='';
  log.forEach((entry,index)=>{const row=document.createElement('div');row.className='row';row.innerHTML=`<div>${index+1}</div><div>${entry.b}</div><div>${entry.o}</div>`;rows.appendChild(row);});
}
function selectReserve(id){
  if(game.turn!=='b'||game.over)return;
  const piece=game.reserve.b.find(item=>item.id===id);if(!piece)return;
  if(!moves('b').some(move=>move.id===id)){msg('ÃŽn aceastÄƒ turÄƒ trebuie sÄƒ blochezi toate liniile vulnerabile cu o singurÄƒ piesÄƒ potrivitÄƒ din rezervÄƒ.');return;}
  selected={kind:'r',id:piece.id,size:piece.size,from:null};render();
}
function selectBoard(index){
  if(game.turn!=='b'||game.over)return;
  if(dueThreats('b').length){msg('Blocajul este legal doar cu o piesÄƒ venitÄƒ din rezervÄƒ.');return;}
  const piece=top(index);if(piece&&piece.color==='b'){selected={kind:'b',id:piece.id,size:piece.size,from:index};render();}
}
function playTo(index){
  if(game.turn!=='b'||game.over||!selected)return;
  const candidates=moves('b'),chosen=candidates.find(move=>move.id===selected.id&&move.from===selected.from&&move.to===index);
  if(!chosen){msg(dueThreats('b').length?'Blocaj ilegal. FoloseÈ™te o piesÄƒ suficient de mare din rezervÄƒ, pe o cÄƒsuÈ›Äƒ vulnerabilÄƒ comunÄƒ tuturor ameninÈ›Äƒrilor.':'Mutare ilegalÄƒ. O piesÄƒ poate acoperi doar o piesÄƒ mai micÄƒ.');return;}
  const before=clone(),recommendation=E.bestMove(game,'b').m;
  history.push({state:before,log:JSON.parse(JSON.stringify(log))});
  const result=E.applyMove(game,chosen,'b');
  selected=null;hintMove=null;log.push({b:desc(chosen),o:''});
  if(result.winner){finish(result.winner);return;}
  const created=result.createdThreats.filter(threat=>threat.attacker==='b').length;
  if(created)msg(`${created===1?'Linie vulnerabilÄƒ creatÄƒ':'Linii vulnerabile create'}. AI are exact aceastÄƒ turÄƒ pentru a ${created===1?'o':'le'} bloca.`);
  else msg(desc(chosen)===desc(recommendation)?`Foarte bine. ${desc(chosen)} este recomandarea motorului.`:`Ai jucat ${desc(chosen)}. Motorul preferÄƒ ${desc(recommendation)}.`);
  $('hintBox').textContent=`Ultima ta mutare: ${desc(chosen)}. AI rÄƒspunde Ã®n 3 secunde.`;
  render();showTaunt();if(aiTimer)clearTimeout(aiTimer);aiTimer=setTimeout(()=>{aiTimer=null;ai();},3000);
}
function ai(){
  clearTaunt();if(game.over){finish(game.winner);return;}
  const best=E.bestMove(game,'o').m;
  if(!best){if(game.winner)finish(game.winner);else{game.turn='b';render();}return;}
  const result=E.applyMove(game,best,'o');impactCell=best.to;if(log.length)log[log.length-1].o=desc(best);
  try{if(navigator.vibrate)navigator.vibrate(35);}catch(error){}
  if(result.winner){msg(`AI a jucat ${desc(best)}. LoviturÄƒ decisivÄƒ.`);render();impactTimer=setTimeout(()=>{impactTimer=null;impactCell=null;finish(result.winner);},900);return;}
  const due=dueThreats('b');
  msg(due.length?`AI a jucat ${desc(best)}. Ai o singurÄƒ turÄƒ pentru a bloca ${due.length===1?'linia vulnerabilÄƒ':'toate liniile vulnerabile'}.`:`AI a jucat ${desc(best)}. VerificÄƒ dacÄƒ poÈ›i crea o linie vulnerabilÄƒ sau trei Strigoi.`);
  render();impactTimer=setTimeout(()=>{impactTimer=null;impactCell=null;render();},900);
}
function hint(){
  if(game.turn!=='b'||game.over)return;
  const best=E.bestMove(game,'b');if(!best.m)return;
  hintMove=best.m;selected={kind:best.m.kind,id:best.m.id,size:best.m.size,from:best.m.from};
  $('hintBox').textContent=`Mutarea recomandatÄƒ: ${desc(best.m)}. Piesa este selectatÄƒ, iar destinaÈ›ia este marcatÄƒ cu mov.`;
  msg(dueThreats('b').length?`Blocaj legal recomandat: ${desc(best.m)}.`:`Sugestie: joacÄƒ ${desc(best.m)}.`);render();
}
function analyze(){
  if(game.turn!=='b'||game.over)return;
  const best=E.bestMove(game,'b'),score=E.scoreState(game,'b'),due=dueThreats('b');
  msg(due.length?`PoziÈ›ie criticÄƒ: trebuie sÄƒ blochezi ${due.length===1?'ameninÈ›area':'toate ameninÈ›Äƒrile'} acum. Cea mai bunÄƒ mutare: ${desc(best.m)}.`:`PoziÈ›ie: ${score>60?'avantaj albastru':score<-60?'avantaj portocaliu':'aproape egal'}. Cea mai bunÄƒ mutare: ${desc(best.m)}.`);
}
function undo(){
  if(!history.length)return;clearTimers();const entry=history.pop();load(entry.state);log=entry.log;selected=null;hintMove=null;impactCell=null;
  $('loseOverlay').classList.remove('show');msg('Am revenit Ã®naintea ultimei tale mutÄƒri, inclusiv cu ameninÈ›Äƒrile È™i cÃ¢È™tigÄƒtorul restaurate.');render();
}
function fireworks(){const box=$('fireworks'),colors=['#4d94ff','#8b5cf6','#72e4ff','#ff8b41','#ffffff'];box.innerHTML='';for(let burst=0;burst<7;burst++){const x=10+Math.random()*80,y=10+Math.random()*55;for(let index=0;index<18;index++){const spark=document.createElement('span');spark.className='fire';spark.style.left=x+'vw';spark.style.top=y+'vh';spark.style.background=colors[Math.floor(Math.random()*colors.length)];const angle=Math.random()*Math.PI*2,distance=50+Math.random()*90;spark.style.setProperty('--x',Math.cos(angle)*distance+'px');spark.style.setProperty('--y',Math.sin(angle)*distance+'px');spark.style.animationDelay=burst*.08+'s';box.appendChild(spark);}}setTimeout(()=>box.innerHTML='',1700);}
function finish(winner){
  clearTaunt();game.winner=winner;game.over=true;
  if(winner==='b')msg('Ai cÃ¢È™tigat. Bravo.');else{msg('AI a cÃ¢È™tigat. Ai fost Ã®nvins Ã®n Arena Strigoilor.');$('loseOverlay').classList.add('show');fireworks();}
  render();
}
function reset(){
  clearTimers();game=E.createState();selected=null;history=[];log=[];hintMove=null;impactCell=null;$('loseOverlay').classList.remove('show');
  $('hintBox').textContent='â€žMutarea optimÄƒâ€ selecteazÄƒ piesa recomandatÄƒ È™i marcheazÄƒ cu mov cÄƒsuÈ›a recomandatÄƒ. Tu confirmi mutarea.';
  msg('SelecteazÄƒ o mascÄƒ albastrÄƒ din rezervÄƒ. Doar trei Strigoi cÃ¢È™tigÄƒ instant; o linie mixtÄƒ devine vulnerabilÄƒ.');render();
}
$('hint').onclick=hint;$('analyze').onclick=analyze;$('undo').onclick=undo;$('newgame').onclick=reset;$('closePopup').onclick=()=>$('loseOverlay').classList.remove('show');$('loseOverlay').onclick=event=>{if(event.target===$('loseOverlay'))$('loseOverlay').classList.remove('show');};reset();
})();


(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.RegulaStrigoi1=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const SIZE={S:1,M:2,L:3};
  const LINES=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

  function other(color){return color==='b'?'o':'b';}
  function pieces(color){
    return ['L1','L2','M1','M2','S1','S2'].map(code=>({id:color+code,color,size:code[0]}));
  }
  function createState(){
    return{board:Array.from({length:9},()=>[]),reserve:{b:pieces('b'),o:pieces('o')},turn:'b',pendingThreats:[],winner:null,over:false};
  }
  function cloneState(state){
    return{
      board:state.board.map(stack=>stack.map(piece=>({...piece}))),
      reserve:{b:state.reserve.b.map(piece=>({...piece})),o:state.reserve.o.map(piece=>({...piece}))},
      turn:state.turn,
      pendingThreats:(state.pendingThreats||[]).map(threat=>({...threat,line:[...threat.line]})),
      winner:state.winner||null,
      over:Boolean(state.over)
    };
  }
  function loadState(target,snapshot){
    const loaded=cloneState(snapshot);
    target.board=loaded.board;
    target.reserve=loaded.reserve;
    target.turn=loaded.turn;
    target.pendingThreats=loaded.pendingThreats;
    target.winner=loaded.winner;
    target.over=loaded.over;
    return target;
  }
  function resetState(target){return loadState(target,createState());}
  function top(state,index){const stack=state.board[index];return stack.length?stack[stack.length-1]:null;}
  function lineKey(attacker,line){return `${attacker}:${line.join('-')}`;}
  function visibleLine(state,line,color){return line.every(index=>{const piece=top(state,index);return piece&&piece.color===color;});}
  function completeLines(state,color){return LINES.filter(line=>visibleLine(state,line,color));}
  function vulnerableLines(state,color){return completeLines(state,color);}
  function isThreatIntact(state,threat){return visibleLine(state,threat.line,threat.attacker);}
  function pendingFor(state,defender){return(state.pendingThreats||[]).filter(threat=>threat.defender===defender&&isThreatIntact(state,threat));}

  function basicMoves(state,color){
    const result=[];
    state.reserve[color].forEach(piece=>{
      for(let to=0;to<9;to++){
        const target=top(state,to);
        if(!target||SIZE[piece.size]>SIZE[target.size])result.push({kind:'r',id:piece.id,size:piece.size,from:null,to});
      }
    });
    for(let from=0;from<9;from++){
      const piece=top(state,from);
      if(!piece||piece.color!==color)continue;
      for(let to=0;to<9;to++){
        if(to===from)continue;
        const target=top(state,to);
        if(!target||SIZE[piece.size]>SIZE[target.size])result.push({kind:'b',id:piece.id,size:piece.size,from,to});
      }
    }
    return result;
  }
  function moveMatches(a,b){return a&&b&&a.kind===b.kind&&a.id===b.id&&a.from===b.from&&a.to===b.to;}
  function isLegalBlockMove(state,move,threats,color){
    if(!threats.length)return false;
    const piece=move.kind==='r'?state.reserve[color].find(candidate=>candidate.id===move.id):top(state,move.from);
    if(!piece||piece.color!==color)return false;
    return threats.every(threat=>{
      if(threat.defender!==color||!threat.line.includes(move.to))return false;
      const target=top(state,move.to);
      return Boolean(target&&target.color===threat.attacker&&target.size!=='L'&&SIZE[piece.size]>SIZE[target.size]);
    });
  }
  function legalMoves(state,color=state.turn){
    if(state.over||color!==state.turn)return[];
    const moves=basicMoves(state,color);
    const expiring=pendingFor(state,color);
    return expiring.length?moves.filter(move=>isLegalBlockMove(state,move,expiring,color)):moves;
  }
  function setWinner(state,color){state.winner=color;state.over=true;}
  function addNewThreats(state){
    const existing=new Set(state.pendingThreats.map(threat=>lineKey(threat.attacker,threat.line)));
    const created=[];
    for(const attacker of['b','o']){
      for(const line of vulnerableLines(state,attacker)){
        const key=lineKey(attacker,line);
        if(existing.has(key))continue;
        const threat={id:key,attacker,defender:other(attacker),line:[...line]};
        state.pendingThreats.push(threat);
        created.push(threat);
        existing.add(key);
      }
    }
    return created;
  }
  function applyUnchecked(state,move,color){
    let piece;
    if(move.kind==='r'){
      const index=state.reserve[color].findIndex(candidate=>candidate.id===move.id);
      piece=state.reserve[color].splice(index,1)[0];
    }else{
      piece=state.board[move.from].pop();
    }
    state.board[move.to].push(piece);
  }
  function newlyRevealedLines(state,color,beforeKeys){
    return completeLines(state,color).filter(line=>!beforeKeys.has(line.join('-')));
  }
  function adjudicateNoDefense(state){
    if(state.over)return;
    const due=pendingFor(state,state.turn);
    if(due.length&&legalMoves(state,state.turn).length===0)setWinner(state,due[0].attacker);
  }
  function applyMove(state,move,color=state.turn){
    if(state.over||color!==state.turn)return{ok:false,reason:'not-your-turn'};
    const allowed=legalMoves(state,color);
    if(!allowed.some(candidate=>moveMatches(candidate,move)))return{ok:false,reason:pendingFor(state,color).length?'must-block-all':'illegal-move'};
    const expiring=pendingFor(state,color);

    if(move.kind==='b'){
      const opponent=other(color);
      const beforeOpponentLines=new Set(completeLines(state,opponent).map(line=>line.join('-')));
      const piece=state.board[move.from].pop();
      const revealedLines=newlyRevealedLines(state,opponent,beforeOpponentLines);
      if(revealedLines.length){
        setWinner(state,opponent);
        return{ok:true,winner:opponent,createdThreats:[],revealedWin:true,revealedLines:revealedLines.map(line=>[...line]),liftedPiece:piece};
      }
      state.board[move.to].push(piece);
    }else{
      applyUnchecked(state,move,color);
    }

    if(expiring.some(threat=>isThreatIntact(state,threat))){
      const surviving=expiring.find(threat=>isThreatIntact(state,threat));
      setWinner(state,surviving.attacker);
      return{ok:true,winner:state.winner,createdThreats:[]};
    }

    const expiringIds=new Set(expiring.map(threat=>threat.id));
    state.pendingThreats=state.pendingThreats.filter(threat=>!expiringIds.has(threat.id)&&isThreatIntact(state,threat));

    const createdThreats=addNewThreats(state);
    state.turn=other(color);
    adjudicateNoDefense(state);
    return{ok:true,winner:state.winner,createdThreats};
  }

  function nearLines(state,color){
    let count=0;
    for(const line of LINES){
      let mine=0,opponent=0,empty=0;
      for(const index of line){
        const piece=top(state,index);
        if(!piece)empty++;
        else if(piece.color===color)mine++;
        else opponent++;
      }
      if(mine===2&&opponent===0&&empty===1)count++;
    }
    return count;
  }
  function scoreState(state,color){
    if(state.winner===color)return 100000;
    if(state.winner&&state.winner!==color)return-100000;
    const opponent=other(color);
    let score=nearLines(state,color)*115-nearLines(state,opponent)*145;
    for(const threat of state.pendingThreats){
      if(threat.attacker===color)score+=1250;
      else score-=1450;
    }
    const center=top(state,4);
    if(center)score+=center.color===color?30:-30;
    for(const index of[0,2,6,8]){
      const piece=top(state,index);
      if(piece)score+=piece.color===color?8:-8;
    }
    score+=(state.reserve[color].length-state.reserve[opponent].length)*3;
    return score;
  }
  function immediateWin(state,color=state.turn){
    for(const move of legalMoves(state,color)){
      const next=cloneState(state);
      applyMove(next,move,color);
      if(next.winner===color)return move;
    }
    return null;
  }
  function bestMove(state,color=state.turn){
    const candidates=legalMoves(state,color);
    if(!candidates.length)return{m:null,v:scoreState(state,color)};
    let best=null,bestValue=-Infinity;
    for(const move of candidates){
      const next=cloneState(state);
      applyMove(next,move,color);
      let value=scoreState(next,color);
      if(!next.over&&next.turn===other(color)){
        const replies=legalMoves(next,next.turn);
        if(replies.length){
          let worst=Infinity;
          for(const reply of replies){
            const afterReply=cloneState(next);
            applyMove(afterReply,reply,next.turn);
            worst=Math.min(worst,scoreState(afterReply,color));
          }
          value=worst;
        }
      }
      if(move.to===4)value+=18;
      if(value>bestValue){bestValue=value;best=move;}
    }
    return{m:best,v:bestValue};
  }

  return{SIZE,LINES,other,pieces,createState,cloneState,loadState,resetState,top,completeLines,vulnerableLines,mixedLines:vulnerableLines,isThreatIntact,pendingFor,basicMoves,isLegalBlockMove,legalMoves,applyMove,nearLines,scoreState,immediateWin,bestMove};
});

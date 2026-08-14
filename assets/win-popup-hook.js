(()=>{
  const overlay=document.createElement('div');
  overlay.id='winOverlay';
  overlay.className='overlay';
  overlay.innerHTML='<div class="popup win-popup"><img alt="Ce fain ești copile"><h3>Ai câștigat</h3><p>Ce fain ești copile.</p><button id="closeWinPopup">Închide</button></div>';
  document.body.appendChild(overlay);

  const close=()=>overlay.classList.remove('show');
  overlay.querySelector('#closeWinPopup').addEventListener('click',close);
  overlay.addEventListener('click',e=>{if(e.target===overlay)close();});

  function victoryFireworks(){
    const box=document.getElementById('fireworks');
    if(!box)return;
    const colors=['#4d94ff','#8b5cf6','#72e4ff','#ffffff','#ffcf57'];
    box.innerHTML='';
    for(let b=0;b<9;b++){
      const bx=8+Math.random()*84,by=8+Math.random()*58;
      for(let i=0;i<20;i++){
        const s=document.createElement('span');
        s.className='fire';s.style.left=bx+'vw';s.style.top=by+'vh';
        s.style.background=colors[Math.floor(Math.random()*colors.length)];
        const a=Math.random()*Math.PI*2,d=55+Math.random()*105;
        s.style.setProperty('--x',Math.cos(a)*d+'px');
        s.style.setProperty('--y',Math.sin(a)*d+'px');
        s.style.animationDelay=b*.065+'s';box.appendChild(s);
      }
    }
    setTimeout(()=>box.innerHTML='',1900);
  }

  let shown=false;
  const status=document.getElementById('status');
  if(!status)return;
  const sync=()=>{
    const text=status.textContent.trim();
    if(text==='Ai câștigat'){
      if(!shown){shown=true;overlay.classList.add('show');victoryFireworks();}
    }else{
      shown=false;
      overlay.classList.remove('show');
    }
  };
  new MutationObserver(sync).observe(status,{childList:true,subtree:true,characterData:true});
  sync();
})();
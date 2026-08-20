(()=>{
  const SOURCES={
    'b-M':'assets/mask-data/medium-blue-144.txt?v=20260814s',
    'o-M':'assets/mask-data/medium-orange-144.txt?v=20260814s',
    'b-S':'assets/mask-data/small-blue-144.txt?v=20260820c',
    'o-S':'assets/mask-data/small-orange-144.txt?v=20260820c'
  };
  const masks={};
  let ready=false;

  function apply(root=document){
    if(!ready)return;
    root.querySelectorAll?.('.mask-art.size-M,.mask-art.size-S').forEach(img=>{
      const color=img.classList.contains('team-b')?'b':'o';
      const size=img.classList.contains('size-M')?'M':'S';
      const uri=masks[`${color}-${size}`];
      if(!uri)return;
      if(img.getAttribute('src')!==uri){
        img.setAttribute('src',uri);
        img.dataset.transparentMask='1';
      }
      const piece=img.closest('.piece');
      if(size==='S'&&piece){
        piece.classList.add('moroi-mirror-white');
        piece.style.setProperty('--moroi-source',`url("${uri}")`);

        let badge=piece.querySelector('.moroi-size-badge');
        if(!badge){
          badge=document.createElement('span');
          badge.textContent='S';
          badge.setAttribute('aria-hidden','true');
          piece.appendChild(badge);
        }
        badge.className=`moroi-size-badge team-${color}`;
      }
    });
  }

  Promise.all(Object.entries(SOURCES).map(async([key,path])=>{
    const r=await fetch(path,{cache:'no-store'});
    if(!r.ok)throw new Error(`${path}: ${r.status}`);
    const b64=(await r.text()).trim();
    if(!b64.startsWith('iVBORw0KGgo'))throw new Error(`Invalid PNG data: ${path}`);
    masks[key]='data:image/png;base64,'+b64;
  })).then(()=>{
    ready=true;
    apply();
    new MutationObserver(records=>{
      for(const record of records){
        record.addedNodes.forEach(node=>{
          if(node.nodeType===1){
            if(node.matches?.('.mask-art.size-M,.mask-art.size-S'))apply(node.parentElement||node);
            else apply(node);
          }
        });
      }
    }).observe(document.documentElement,{childList:true,subtree:true});
  }).catch(err=>console.warn('Transparent mask assets unavailable',err));

  /* Mobile UX: tapping a board square before choosing a mask jumps to the reserve. */
  const guideStyle=document.createElement('style');
  guideStyle.textContent=`
    .reserve-title{scroll-margin-top:18px}
    .reserve-groups.choose-mask-prompt .reserve-group{
      animation:chooseMaskPulse .72s ease-out 2;
    }
    @keyframes chooseMaskPulse{
      0%,100%{box-shadow:0 0 0 rgba(65,145,255,0)}
      45%{box-shadow:0 0 0 2px rgba(73,151,255,.72),0 0 26px rgba(34,112,255,.38)}
    }
    @media(prefers-reduced-motion:reduce){
      .reserve-groups.choose-mask-prompt .reserve-group{animation:none!important;box-shadow:0 0 0 2px rgba(73,151,255,.62)}
    }
  `;
  document.head.appendChild(guideStyle);

  let guideTimer=null;
  function guideToMasks(){
    const title=document.querySelector('.reserve-title');
    const groups=document.getElementById('reserveGroups');
    if(!title||!groups)return;
    title.scrollIntoView({behavior:'smooth',block:'start'});
    groups.classList.remove('choose-mask-prompt');
    void groups.offsetWidth;
    groups.classList.add('choose-mask-prompt');
    clearTimeout(guideTimer);
    guideTimer=setTimeout(()=>groups.classList.remove('choose-mask-prompt'),1600);
  }

  document.addEventListener('click',e=>{
    const cell=e.target.closest?.('.cell');
    if(!cell)return;
    const status=document.getElementById('status');
    if(!status||status.textContent.trim()!=='Rândul tău')return;
    if(document.querySelector('.piece.selected'))return;

    const tappedPiece=e.target.closest?.('.piece');
    /* A blue piece already on the board is itself a valid piece selection. */
    if(tappedPiece&&tappedPiece.querySelector('.mask-art.team-b'))return;

    e.preventDefault();
    e.stopImmediatePropagation();
    guideToMasks();
  },true);
})();
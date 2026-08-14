(()=>{
  const SOURCES={
    'b-M':'assets/mask-data/medium-blue-144.txt?v=20260814s',
    'o-M':'assets/mask-data/medium-orange-144.txt?v=20260814s',
    'b-S':'assets/mask-data/small-blue-144.txt?v=20260814s',
    'o-S':'assets/mask-data/small-orange-144.txt?v=20260814s'
  };
  const masks={};
  let ready=false;

  function apply(root=document){
    if(!ready)return;
    root.querySelectorAll?.('.mask-art.size-M,.mask-art.size-S').forEach(img=>{
      const color=img.classList.contains('team-b')?'b':'o';
      const size=img.classList.contains('size-M')?'M':'S';
      const uri=masks[`${color}-${size}`];
      if(uri&&img.getAttribute('src')!==uri){
        img.setAttribute('src',uri);
        img.dataset.transparentMask='1';
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
})();
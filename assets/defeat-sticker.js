(()=>{
  /* Arena Strigoilor uses a single taunt for the whole 3-second AI delay.
     apple.js calls setInterval only for rotating these taunts, so suppress that
     interval while keeping the first synchronous show() call intact. */
  const nativeSetInterval=window.setInterval;
  window.setInterval=function(fn,delay,...args){
    const src=typeof fn==='function'?Function.prototype.toString.call(fn):'';
    if(Number(delay)===900&&src.includes('ai-taunt-card'))return 0;
    return nativeSetInterval.call(window,fn,delay,...args);
  };

  const names=['01a','01b','01c','02','03','04a','04b','04c','05','06a','06b','06c','07','08'];
  const paths=names.map(n=>`assets/defeat-sticker/${n}.txt?v=20260814g`);
  Promise.all(paths.map(p=>fetch(p,{cache:'no-cache'}).then(r=>{
    if(!r.ok)throw new Error(`${p} ${r.status}`);
    return r.text();
  }))).then(parts=>{
    const data=parts.join('').trim();
    if(data.length!==93256)throw new Error(`Sticker data length ${data.length}, expected 93256`);
    const img=document.querySelector('#loseOverlay .popup img');
    if(!img)return;
    img.src='data:image/webp;base64,'+data;
    img.alt='Viața e grea Boss';
    img.dataset.hq='1';
  }).catch(err=>console.warn('Sticker HQ unavailable',err));
})();
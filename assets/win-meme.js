(()=>{
  const paths=['01','02','03','04','05','06'].map(n=>`assets/win-meme/${n}.txt?v=20260814w`);
  Promise.all(paths.map(path=>fetch(path,{cache:'no-store'}).then(r=>{
    if(!r.ok) throw new Error(`${path}: ${r.status}`);
    return r.text();
  }))).then(parts=>{
    const data=parts.join('').trim();
    if(data.length!==40000) throw new Error(`Win meme data length ${data.length}, expected 40000`);
    const img=document.querySelector('#winOverlay .popup img');
    if(!img) return;
    img.src='data:image/webp;base64,'+data;
    img.alt='Ce fain ești copile';
    img.dataset.ready='1';
  }).catch(err=>console.warn('Win meme unavailable',err));
})();
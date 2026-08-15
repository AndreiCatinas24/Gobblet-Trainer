(()=>{
  const board=document.getElementById('board');
  const instruction=document.getElementById('maskInstruction');
  const title=document.querySelector('.reserve-title');
  const groups=document.getElementById('reserveGroups');
  const status=document.getElementById('status');
  if(!board||!instruction||!title||!groups||!status)return;

  const copy=instruction.querySelector('.mask-instruction-copy');
  if(copy&&!copy.querySelector('.guide-word')){
    const words=copy.textContent.trim().split(/\s+/);
    copy.innerHTML=words.map((word,i)=>`<span class="guide-word" style="--i:${i}">${word}</span>`).join(' ');
  }

  let cleanupTimer=null,startTimer=null;

  function stopCue(){
    clearTimeout(cleanupTimer);
    clearTimeout(startTimer);
    instruction.classList.remove('guide-running','guide-box-pulse');
    title.classList.remove('guide-title-pulse');
    groups.classList.remove('guide-glow');
  }

  function cueMasks(){
    stopCue();
    title.scrollIntoView({behavior:'smooth',block:'start'});

    startTimer=setTimeout(()=>{
      instruction.classList.remove('guide-running','guide-box-pulse');
      title.classList.remove('guide-title-pulse');
      groups.classList.remove('guide-glow');
      void instruction.offsetWidth;

      instruction.classList.add('guide-running','guide-box-pulse');
      title.classList.add('guide-title-pulse');
      groups.classList.add('guide-glow');

      cleanupTimer=setTimeout(()=>{
        instruction.classList.remove('guide-running','guide-box-pulse');
        title.classList.remove('guide-title-pulse');
        groups.classList.remove('guide-glow');
      },4300);
    },600);
  }

  board.addEventListener('pointerup',event=>{
    const cell=event.target.closest('.cell');
    if(!cell)return;
    if(event.target.closest('.piece'))return;
    if(status.textContent.trim()!=='Rândul tău')return;
    if(document.querySelector('.piece.selected'))return;
    cueMasks();
  },true);
})();
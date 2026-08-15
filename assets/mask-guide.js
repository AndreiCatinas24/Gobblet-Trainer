(()=>{
  const board=document.getElementById('board');
  const instruction=document.getElementById('maskInstruction');
  const title=document.querySelector('.reserve-title');
  const groups=document.getElementById('reserveGroups');
  const status=document.getElementById('status');
  if(!board||!instruction||!title||!groups||!status)return;

  const copy=instruction.querySelector('.mask-instruction-copy');
  if(copy){
    const words=copy.textContent.trim().split(/\s+/);
    copy.innerHTML=words.map((word,i)=>`<span class="guide-word" style="--i:${i}">${word}</span>`).join(' ');
  }

  let cleanupTimer=null;
  function cueMasks(){
    instruction.classList.remove('guide-running');
    title.classList.remove('guide-title-pulse');
    groups.classList.remove('guide-glow');
    void instruction.offsetWidth;
    instruction.classList.add('guide-running');
    title.classList.add('guide-title-pulse');
    groups.classList.add('guide-glow');
    title.scrollIntoView({behavior:'smooth',block:'start'});
    clearTimeout(cleanupTimer);
    cleanupTimer=setTimeout(()=>{
      instruction.classList.remove('guide-running');
      title.classList.remove('guide-title-pulse');
      groups.classList.remove('guide-glow');
    },3200);
  }

  board.addEventListener('click',event=>{
    const cell=event.target.closest('.cell');
    if(!cell)return;
    if(event.target.closest('.piece'))return;
    if(status.textContent.trim()!=='Rândul tău')return;
    if(document.querySelector('.piece.selected'))return;
    cueMasks();
  },true);
})();
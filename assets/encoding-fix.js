(()=>{
  'use strict';
  const replacements=[
    ['CÄƒÈ›inaÈ™','Căținaș'],['È™','ș'],['È›','ț'],['Èš','Ț'],['È˜','Ș'],
    ['Äƒ','ă'],['Ä‚','Ă'],['Ã¢','â'],['Ã‚','Â'],['Ã®','î'],['ÃŽ','Î'],
    ['â€ž','„'],['â€','”'],['â€œ','“'],['â€™','’'],['â€”','—'],['â€“','–'],
    ['â†’','→'],['â†¶','↶'],['âœ¦','✦'],['Ã—','×'],['Â','']
  ];
  function fixText(value){
    if(!value)return value;
    let out=value;
    for(const [bad,good] of replacements)out=out.split(bad).join(good);
    return out;
  }
  function fixNode(root){
    if(!root)return;
    if(root.nodeType===Node.TEXT_NODE){
      const fixed=fixText(root.nodeValue);
      if(fixed!==root.nodeValue)root.nodeValue=fixed;
      return;
    }
    if(root.nodeType!==Node.ELEMENT_NODE&&root.nodeType!==Node.DOCUMENT_NODE)return;
    if(root.nodeType===Node.ELEMENT_NODE){
      for(const attr of ['aria-label','title','alt']){
        if(root.hasAttribute?.(attr)){
          const value=root.getAttribute(attr),fixed=fixText(value);
          if(fixed!==value)root.setAttribute(attr,fixed);
        }
      }
    }
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let node;
    while((node=walker.nextNode())){
      const fixed=fixText(node.nodeValue);
      if(fixed!==node.nodeValue)node.nodeValue=fixed;
    }
  }
  fixNode(document.body);
  new MutationObserver(records=>{
    for(const record of records){
      if(record.type==='characterData')fixNode(record.target);
      else record.addedNodes.forEach(fixNode);
    }
  }).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
})();

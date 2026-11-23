(() => {
  const key='mri.study.resume.v1';
  const root=new URL('./',document.baseURI);
  function safe(href) {
    const url=new URL(href,root);
    return url.origin===root.origin && ['practice.html','registry.html','academy.html','brain-atlas.html','study-center.html'].some(page=>url.pathname===new URL(page,root).pathname);
  }
  function read() {
    try {const value=JSON.parse(localStorage.getItem(key));return value?.version===1&&safe(value.href)?value:null;}
    catch{return null;}
  }
  function save(section,mode,topic,position,href=location.href) {
    if(!safe(href))return;
    try {localStorage.setItem(key,JSON.stringify({version:1,section,mode,topic,position,href,at:Date.now()}));}catch{}
  }
  function clear(section,mode) {
    const value=read();
    if(value?.section===section&&(!mode||value.mode===mode))try{localStorage.removeItem(key);}catch{}
  }
  function card(element) {
    const latest=read();
    const title=document.createElement('h2');
    const summary=document.createElement('p');
    const link=document.createElement('a');
    title.textContent='Continue Where You Left Off';
    summary.textContent=latest?[latest.section,latest.mode,latest.topic,latest.position,new Date(latest.at).toLocaleString()].filter(Boolean).join(' · ')
      :'Start a practice session or open an Academy lesson.';
    link.href=latest?.href??'./practice.html';
    link.textContent=latest?'Resume Studying':'Start Studying';
    element.replaceChildren(title,summary,link);
  }
  globalThis.StudyResume={read,save,clear,card};
})();

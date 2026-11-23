(() => {
  const destinations = [
    ['anatomy','Anatomy','./'],
    ['clinical','Clinical','./?section=clinical'],
    ['physics','Physics','./academy.html'],
    ['practice','Practice','./practice.html'],
    ['study','My Study Space','./?section=study']
  ];
  const nav=document.querySelector('[data-app-nav]');
  if(!nav)return;
  nav.classList.add('primary-nav');
  const home=document.createElement('a');
  home.className='app-mark';home.href='./';home.textContent='MRI Study Lab';
  nav.append(home);
  const links=document.createElement('div');links.className='primary-links';nav.append(links);
  for (const [id,label,url] of [...destinations,['settings','Settings','./?section=settings']]) {
    const link=document.createElement('a');
    link.href=url;link.textContent=label;link.dataset.section=id;
    if(id==='settings')link.classList.add('settings-link');
    links.append(link);
  }
  function active(id) {
    for(const link of links.children) {
      if(link.dataset.section===id)link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');
    }
  }
  const key='mri.navigation.v1';
  const get=name=>{try{return JSON.parse(sessionStorage.getItem(key+name));}catch{return null;}};
  const put=(name,value)=>{try{sessionStorage.setItem(key+name,JSON.stringify(value));}catch{}};
  const route=url=>url.pathname+url.search+url.hash;
  const locationRoute=()=>route(new URL(location.href));
  const pending=get('.pending');
  put('.pending',null);
  if (!Number.isInteger(history.state?.mriPosition)) {
    history.replaceState({...history.state,mriPosition:pending?.url===locationRoute()?pending.position:0},'');
    put('.limit',history.state.mriPosition);
  }
  const direction=document.createElement('div');
  direction.className='history-controls';
  direction.setAttribute('role','group');
  direction.setAttribute('aria-label','Page history');
  const controls=['Back','Forward'].map((label,i)=>{
    const button=document.createElement('button');
    button.type='button';button.textContent=label;button.onclick=()=>history.go(i?1:-1);
    direction.append(button);return button;
  });
  nav.append(direction);
  function refresh() {
    const index=history.state?.mriPosition??0;
    controls[0].disabled=index<=0;
    controls[1].disabled=index>=(get('.limit')??index);
  }
  function navigate(url,replace=false,extra={}) {
    const resolved=new URL(url,location.href);
    if(route(resolved)===locationRoute()&&!replace)return false;
    const index=(history.state?.mriPosition??0)+(replace?0:1);
    history[replace?'replaceState':'pushState']({...history.state,...extra,mriPosition:index},'',resolved);
    if(!replace)put('.limit',index);
    refresh();
    return true;
  }
  document.addEventListener('click',event=>{
    const anchor=event.target.closest?.('a[href]');
    if(!anchor||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||
      anchor.download||anchor.target&&anchor.target!=='_self')return;
    const url=new URL(anchor.href);
    if(url.origin!==location.origin||!url.pathname.startsWith(new URL('./',document.baseURI).pathname)||
      url.pathname===location.pathname&&url.search===location.search)return;
    put('.pending',{url:route(url),position:(history.state?.mriPosition??0)+1});
  });
  function open(url) {
    const next=new URL(url,location.href);
    put('.pending',{url:route(next),position:(history.state?.mriPosition??0)+1});
    location.assign(next);
  }
  window.addEventListener('popstate',refresh);
  window.addEventListener('pageshow',refresh);
  active(nav.dataset.appNav);refresh();
  globalThis.AppNavigation={active,navigate,open};
})();

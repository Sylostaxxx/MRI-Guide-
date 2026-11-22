(() => {
  const destinations = [
    ['anatomy','Anatomy','./'],
    ['clinical','Clinical','./?section=clinical'],
    ['physics','Physics','./?section=physics'],
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
  active(nav.dataset.appNav);
  globalThis.AppNavigation={active};
})();

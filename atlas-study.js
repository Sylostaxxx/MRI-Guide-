(() => {
  const bookmarkPrefix='mri.atlas.bookmark.';
  const notePrefix='mri.scan.note.';
  const regions={cerebra1:'brain',spine1:'spine',knee1:'knee',cardiac1:'cardiac',iac1:'iac',lumbar1:'lumbar',prostate1:'prostate'};
  const aliases={'cerebra1:62':'3','knee1:1':'1','cardiac1:1':'5','cerebra1:91':'3.1'};
  const noteKey=id=>notePrefix+id.replace(':','.');
  const noteAlias=id=>Object.hasOwn(aliases,id)?notePrefix+'system.'+aliases[id]:null;
  function readNote(id){
    const primary=localStorage.getItem(noteKey(id));
    const alias=noteAlias(id);
    return primary??(alias?localStorage.getItem(alias):null)??'';
  }
  function saveNote(id,value){localStorage.setItem(noteKey(id),value);}
  function link(id){
    const [pack,structure]=id.split(':');
    return './brain-atlas.html?'+new URLSearchParams({region:regions[pack],label:structure});
  }
  function savedBookmarks(){
    const records=[];
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(!key.startsWith(bookmarkPrefix))continue;
      const id=key.slice(bookmarkPrefix.length), [pack,label]=id.split(':');
      if(Object.hasOwn(regions,pack)&&/^\d+$/.test(label))records.push({id,name:localStorage.getItem(key)});
    }
    return records.sort((a,b)=>a.name.localeCompare(b.name));
  }
  function isBookmarked(id){return localStorage.getItem(bookmarkPrefix+id)!==null;}
  function toggleBookmark(id,name){
    if(isBookmarked(id))localStorage.removeItem(bookmarkPrefix+id);
    else localStorage.setItem(bookmarkPrefix+id,name);
  }
  globalThis.AtlasStudy={noteKey,readNote,saveNote,link,savedBookmarks,isBookmarked,toggleBookmark};
})();

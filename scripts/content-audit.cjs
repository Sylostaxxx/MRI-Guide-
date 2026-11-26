const path = require('node:path');
const fs = require('node:fs');
const root = path.resolve(__dirname,'..');
const html = fs.readFileSync(path.join(root,'practice.html'),'utf8');
const support = /^(registry-(?:blueprints|core|content|images|image-view|bank-[\w-]+|calculations)|study-focus|study-coverage|study-content|study-content-map|study-variants|study-review|lower-extremity|artifact-lessons|parameter-model|physics-lessons)$/;
for (const [,name] of html.matchAll(/<script src="\.\/([\w-]+)\.js"><\/script>/g)) {
  if (support.test(name)) require(path.join(root,name+'.js'));
}
for (const file of ['anatomy-plates','quiz-assets','study-content','study-coverage','physics-lessons']) require(path.join(root,file+'.js'));
const bank = RegistryContent.bank;
const normalize = stem=>stem.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const by = (items,key)=>Object.fromEntries([...new Set(items.map(key))].map(name=>[name,items.filter(item=>key(item)===name).length]));
const authored = bank.filter(q=>!q.pilot);
const active = authored.filter(q=>RegistryImageView.valid(q)&&(!q.image||fs.existsSync(path.join(root,RegistryImages[q.image].path))));
const invalid = authored.filter(q=>!active.includes(q)).map(q=>q.id);
const stems = new Map();
for(const q of active){
  const key=normalize(q.stem);
  const previous=stems.get(key)??[];
  previous.push(q.id);stems.set(key,previous);
}
const imageItems=active.filter(q=>q.image);
const registryFigures=new Set(imageItems.flatMap(q=>{
  const a=RegistryImages[q.image];return a.comparison?[a.path,RegistryImages[a.comparison].path]:[a.path];
}));
const manifests=['brain','spine','knee','cardiac'].map((name,index)=>{
  const file=index?'atlas/'+name+'/manifest.json':'atlas/manifest.json';
  const data=JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
  return {region:name,files:data.volumes.map(v=>v.path),labelIds:Object.keys(data.labels).length};
});
const report={
  authoredActive:active.length,allAuthored:bank.length,pilot:bank.filter(q=>q.pilot).length,
  generatedVariations:StudyVariants.variants.length,
  distinctNormalizedStems:stems.size,duplicateStems:[...stems.values()].filter(group=>group.length>1),
  invalidImageOrPrompt:invalid,explicitlyDisabled:RegistryImageView.disabled,
  realImageQuestions:imageItems.length,uniqueRegistryRasters:registryFigures.size,
  markedRegistryQuestions:imageItems.filter(q=>RegistryImages[q.image].marker).length,
  exactDuplicateItems:active.length-new Set(active.map(q=>[normalize(q.stem),q.image??'',...q.options.map(([label])=>normalize(label)).sort()].join('|'))).size,
  itemReviewStatus:by(active,q=>q.review??'not recorded'),
  imageQuestionsPendingIndependentReview:imageItems.length,
  textbookPlates:Object.keys(AnatomyPlates).length,validatedQuizPlates:Object.keys(QuizAssets).length,
  subjects:by(active,StudyReview.subject),
  focused:Object.fromEntries(Object.keys(StudyFocus.titles).map(focus=>[focus,active.filter(q=>StudyFocus.matches(q,focus)).length])),
  lowerExtremity:Object.fromEntries(Object.keys(LowerExtremity.regions).map(region=>[region,active.filter(q=>LowerExtremity.matches(q,region)).length])),
  legacyActivities:Object.fromEntries(Object.entries(StudyContent.cases).map(([name,cases])=>[name,cases.length])),
  lessons:PhysicsLessons.lessons.map(l=>({title:l.title,practice:active.filter(q=>StudyContentMap.lessonFor(q)===l.id).length})),
  artifactLessons:ArtifactAcademy.lessons.length,artifactStudyRasters:Object.keys(ArtifactAcademy.images).length,
  arrtCategories:by(active,q=>q.category),armritSubjects:by(active,q=>q.armritSubject),
  volumes:[...manifests,{region:'intracranial MRA',files:['./atlas/mra/chris_MRA.nii.gz'],labelIds:0}],
  anatomicalCoverage:StudyCoverage.rows
};
process.stdout.write(JSON.stringify(report,null,2)+'\n');

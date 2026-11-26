(() => {
  const {parameters,labels,idFor}=ParameterModel;
  for (const parameter of parameters) {
    for (const index of parameter.quiz) {
      const rule=parameter.effects[index];
      const values=Object.keys(labels);
      const wrong={
        '+':'An increase would require a mechanism that raises this outcome under the stated controls.',
        '-':'A decrease would require a mechanism that lowers this outcome under the stated controls.',
        '=':'Unchanged requires the governing quantity to stay fixed over this change.',
        '?':'For this question, the controls are sufficient to determine a direction.'
      };
      RegistryContent.add({id:idFor(parameter,index),category:'parameters',topic:'Parameter Lab · '+parameter.name,
        objective:rule.metric,studyOnly:true,
        difficulty:rule.direction==='?'?'Advanced':index===1?'Beginner':'Intermediate',
        stem:parameter.assumptions+' When '+parameter.name+' increases, what happens to '+rule.metric.toLowerCase()+'?',
        options:values.map(value=>[labels[value],value===rule.direction?rule.why:wrong[value]+' '+rule.why]),
        key:[values.indexOf(rule.direction)], hints:[
          'Focus on '+rule.metric.toLowerCase()+' and the quantities kept fixed in this experiment.',
          ({0:'Consider the signal per voxel and the source of noise separately.',1:'Count repetitions or shots, then account for time per shot.',
            2:'Compare the acquired sample dimensions with the physical field of view.',
            3:'Separate cumulative RF energy from energy deposited per unit time.',
            5:'Follow the dimensions of the acquired volume.',
            6:'Consider which sampled dimension or signal mixture produces the artifact.'})[index]
        ],
        parameterLesson:parameter.lesson,references:[parameter.source],related:'./parameter-lab.html?parameter='+parameter.id});
    }
  }
  const calculations=[
    ['etl-time','ETL', 'A 2D FSE acquisition has TR 600 ms, 192 phase lines, ETL 8 and NEX 2. Ignoring overhead, how long does it take?', '28.8 seconds','There are 24 shots per average. Two averages take 48 × 0.6 seconds.','14.4 seconds','This omits the second average.','230.4 seconds','This treats each echo as a separate shot.','The echo train acquires multiple phase lines after one excitation.','Divide phase lines by ETL, multiply by NEX, then use TR in seconds.','etl'],
    ['pixel-size','Phase pixel size','With phase FOV 192 mm and 128 acquired phase lines, what is the phase pixel pitch?', '1.5 mm','Divide 192 mm by 128 acquired samples.','0.67 mm','This reverses the ratio.','3 mm','This would fit 64 acquired samples.','Use the acquired matrix, before interpolation.','Divide phase FOV in millimeters by the number of phase samples.','matrix'],
    ['parallel-snr','Parallel SNR','A parallel acquisition uses R = 4 with g = 1.25 at the voxel. What fraction of full-sampling SNR remains, with all other conditions held constant?', '40%','The ratio is 1/(1.25 × √4) = 0.40.','50%','This assumes g = 1.','20%','This uses R where the denominator requires its square root.','Both fewer acquired lines and coil geometry contribute.','Use 1/(g√R), then express the fraction as a percentage.','parallel'],
    ['diffusion','Diffusion weighting','At fixed TE, tissue has ADC 0.001 mm²/s. In the monoexponential model, what fraction of b = 0 signal remains at b = 1000 s/mm²?', 'About 37%','The product b·ADC is 1, and e⁻¹ is about 0.368.','About 63%','This is the fraction lost.','About 100%','Positive ADC produces attenuation at nonzero b.','Check that b and ADC multiply to a dimensionless value.','Calculate exp(−b·ADC) to find the retained signal.','b-value']
  ];
  for(const [id,topic,stem,a,whyA,b,whyB,c,whyC,h1,h2,target] of calculations){
    const parameter=parameters.find(item=>item.id===target);
    RegistryContent.add({id:'param-calc-'+id,category:'parameters',topic:'Parameter Lab · '+topic,
      stem,options:[[a,whyA],[b,whyB],[c,whyC]],hints:[h1,h2],studyOnly:true,difficulty:'Registry',
      parameterLesson:parameter.lesson,references:[parameter.source],related:'./parameter-lab.html?parameter='+target});
  }
})();

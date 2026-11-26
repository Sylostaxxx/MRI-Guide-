(() => {
  const metrics = ['SNR', 'Acquisition time', 'Spatial detail', 'Average RF SAR', 'Contrast change', 'Coverage', 'Named artifact risk'];
  const sources = {
    physics:['Lugauer and Wetzl, Magnetic Resonance Imaging','https://www.ncbi.nlm.nih.gov/books/NBK546152/'],
    artifact:['Body MR Imaging: Artifacts, k-Space, and Solutions','https://pmc.ncbi.nlm.nih.gov/articles/PMC4613875/'],
    safety:['ACR MR Safety resources','https://www.acr.org/Clinical-Resources/Clinical-Tools-and-Reference/Radiology-Safety/MR-Safety']
  };
  // Outcomes describe an increase from a valid baseline, holding the stated conditions constant.
  const rows = [
    ['tr','TR','2D conventional spin echo; fixed TE, RF pulses per repetition, matrix, NEX, and slice count.','t1','physics',[0,1],
      ['+ More longitudinal recovery increases signal for the same tissue and noise.','+ More time per phase line.','= Sampling geometry stays fixed.','- The same RF energy is applied less frequently.','? T1 differences usually contribute less at long TR; contrast depends on the tissues.','= Fixed slice count and thickness preserve coverage.','? Longer scans may increase motion opportunity; no universal direction.']],
    ['te','TE','2D conventional spin echo; fixed TR, bandwidth, geometry and number of excitations.','t2','physics',[0,1],
      ['- Transverse relaxation reduces signal.','= Echo timing shifts inside the same TR.','= Pixel and slice dimensions stay fixed.','= With identical RF pulses, average deposited energy per TR stays fixed.','? Longer TE emphasizes transverse decay; contrast depends on the tissues.','= Fixed geometry preserves coverage.','? Longer TE can increase flow-related loss; spin echo refocuses some static off-resonance.']],
    ['fov','Phase FOV','2D Cartesian spin echo; increase phase FOV at fixed acquired matrix, readout FOV, thickness and timing.','k-space','artifact',[2,6],
      ['+ Larger voxels increase signal under fixed sampling and noise assumptions.','= The number of phase lines stays fixed.','- Larger phase pixels reduce nominal phase resolution.','= RF train is held constant.','= Intrinsic tissue weighting is fixed; boundaries may average differently.','+ Phase coverage increases.','- Phase wrap risk decreases as more anatomy fits inside the encoded FOV.']],
    ['nex','NSA / NEX','Repeat the same acquired data with independent noise; keep TR, RF duty cycle and geometry fixed.','k-space','physics',[0,3],
      ['+ SNR scales with the square root of the number of independent averages.','+ Acquisition time scales with averages.','= Averaging adds no spatial frequencies.','= The same rate of RF energy is maintained; total deposited energy can rise over the longer scan.','= Acquisition weighting is fixed.','= Geometry is fixed.','? Motion may blur or ghost across repeats; random noise decreases.']],
    ['etl','ETL / turbo factor','2D fast spin echo; fixed TR, NEX and phase lines, with extra echoes replacing shot repetitions.','t2','artifact',[1,6],
      ['? Signal depends on effective TE, echo ordering and refocusing schedule.','- More lines per shot reduce required shots when the shot count changes.','= Nominal acquired geometry is held fixed.','? Extra pulses per shot can increase RF load, depending on flip schedule and timing.','? Effective TE and stimulated echoes can change contrast.','= Fixed slice prescription.','? Echo-train blurring may grow; echo spacing, ordering and tissue T2 govern the effect.']],
    ['ti','TI','Idealized inversion recovery; independently adjustable TI within fixed TR and TE, with an unchanged inversion and readout train.','t1','physics',[0,1],
      ['? Signal may fall toward a null or rise beyond it.','= TI changes within a fixed repetition period.','= Sampled geometry is fixed.','= RF energy per TR is fixed.','? Nulling depends on the tissue T1 and inversion history.','= Slice geometry is fixed.','? Nulling of a desired or undesired tissue depends on its T1.']],
    ['matrix','Phase-encoding matrix','Fully sampled 2D Cartesian scan; fixed phase FOV, readout, TR, ETL, NEX and slice dimensions.','k-space','physics',[1,2],
      ['- Smaller voxels generally decrease SNR despite extra acquired phase lines.','+ More phase lines require more shots in conventional single-echo acquisition.','+ Smaller phase pixels improve nominal phase resolution.','= RF energy per repetition and repetition rate are held fixed.','= Intrinsic sequence weighting remains fixed.','= Prescribed FOV stays fixed.','? Higher acquired spatial frequencies may narrow Gibbs rings; the filtered point-spread function matters.']],
    ['flip','Excitation flip angle','RF-spoiled gradient echo at fixed TR, TE, geometry and RF pulse shape and duration.','flip-angle','physics',[0,1],
      ['? Steady-state signal rises toward a tissue’s Ernst angle and falls beyond it.','= One excitation remains in each TR.','= Geometry is fixed.','+ Increasing amplitude for the same pulse shape and duration increases deposited RF energy under the same loading.','? Different tissues have different Ernst angles and saturation.','= Geometry is fixed.','? Flow and inflow contrast vary with saturation.']],
    ['bandwidth','Receiver bandwidth','Fixed acquired readout matrix, geometry, TR, TE, RF settings and fat–water frequency offset. Bandwidth is Hz per acquired pixel.','k-space','artifact',[0,6],
      ['- Wider bandwidth admits more noise; SNR scales approximately with inverse square-root bandwidth.','= TR and the shot count are fixed, even though readout duration may shorten.','= Acquired pixel size is fixed.','= RX bandwidth does not itself change transmit RF energy.','= TE and contrast preparation are held fixed.','= Geometry is fixed.','- Fat–water displacement in pixels equals frequency offset divided by bandwidth per pixel.']],
    ['parallel','Parallel imaging factor R','Accelerated 2D Cartesian acquisition; fixed target geometry, TR, ETL, NEX and fully sampled reference. Ignore separate calibration overhead for the time estimate.','k-space','artifact',[0,1],
      ['- SNR relative to full sampling is approximately 1/(g√R), where the geometry factor varies spatially.','- Fewer acquired phase lines reduce ideal scan time.','= Target grid stays fixed if reconstruction succeeds.','? RF duty cycle can stay similar; changes to train, timing or sequence family can alter it.','? Shorter readouts can alter effective TE and signal losses if retimed.','= Target FOV and slice coverage are fixed.','? EPI distortion may decrease while unfolding errors and g-factor noise may rise.']],
    ['b-value','Diffusion b-value','Monoexponential diffusion approximation; same TE, TR, noise and geometry, with diffusion weighting independently changed.','k-space','physics',[0,1],
      ['- Signal decreases for positive ADC according to exp(−b·ADC).','= Fixed TR and shot count preserve time; a real scanner may require longer timing.','= Geometry is fixed.','= RF pulses are unchanged in this scenario.','? Higher b increases diffusion weighting; observed tissue contrast also depends on ADC and baseline signal.','= Geometry is fixed.','? Sensitivity to motion and eddy-current effects depends on gradient implementation.']],
    ['sat','Saturation bands','2D Cartesian scan; add spatial saturation pulses while preserving the achievable TR, slice prescription and imaging readout.','rf','safety',[1,3],
      ['? Intended spins are suppressed; overlap can lower signal in the image.','= Time stays fixed if the added preparation fits inside the same TR.','= Imaging geometry is fixed.','+ Added RF pulses increase energy per TR at fixed pulse and timing conditions.','? Depends on which stationary structures or inflowing spins are saturated.','= Acquired coverage is fixed; overlap can suppress part of it.','? Correct band placement may reduce unwanted flow signal, but coverage overlap can remove anatomy.']],
    ['thickness','Slice thickness','2D acquisition; fixed slice count, nonnegative fixed gap, timing and in-plane matrix/FOV.','k-space','physics',[2,6],
      ['+ Larger voxel volume increases signal under fixed noise conditions.','= Number of shots and TR stay fixed.','- Thicker slices reduce through-plane detail.','? Slice selection can change RF implementation depending on scanner constraints.','? Intrinsic weighting is fixed, but averaging can change apparent contrast.','+ The prescribed span increases with thicker slices.','+ Through-plane partial-volume effects become more likely.']],
    ['slices','Acquired slices','2D multislice acquisition; fixed slice thickness and gap. The scanner may require another package or longer TR when timing capacity is exceeded.','k-space','physics',[1,5],
      ['? Per-slice SNR may be similar at fixed timing and isolation; cross-talk and a changed TR can alter it.','? Unchanged if the slices fit in the same TR package; longer if an additional package or longer TR is necessary.','= Per-slice acquired geometry is fixed.','? More RF pulses per unit time can raise SAR if fitted into the same TR; scheduling matters.','? Nominal weighting is fixed if TR and TE stay fixed; interslice effects may matter.','+ More slices increase coverage with fixed thickness and gap.','? Interleaving and slice profiles determine cross-talk.']]
  ];
  const artifactMetrics={fov:'phase wrap risk',etl:'echo-train blurring',bandwidth:'type 1 chemical shift in pixels',thickness:'partial-volume averaging risk'};
  const labels = {'+':'Increase','-':'Decrease','=':'Unchanged','?':'Depends'};
  const parameters = rows.map(([id,name,assumptions,lesson,source,quiz,effects])=>({
    id,name,assumptions,lesson,source:sources[source],quiz,
    effects:effects.map((item,index)=>({metric:index===6?(artifactMetrics[id]??metrics[index]):metrics[index],direction:item[0],why:item.slice(2)}))
  }));
  const baseline = {tr:500,te:20,fov:220,matrix:160,thickness:4,nex:1,bandwidth:220,etl:4};
  function estimate(p) {
    const {tr,te,fov,matrix,thickness,nex,bandwidth,etl}=p;
    const pitch=fov/matrix;
    const signal=tissue=>MRIPhysics.spinEchoSignal(tr,te,...tissue);
    return {pitch,voxel:pitch*(220/192)*thickness,time:tr*Math.ceil(matrix/etl)*nex/1000,
      snrFactor:Math.sqrt(nex*baseline.bandwidth/bandwidth),shift:440/bandwidth,
      softTissue:signal([900,65]),fluid:signal([3000,220])};
  }
  const idFor=(parameter,metric)=>'param-'+parameter.id+'-'+metric;
  globalThis.ParameterModel={parameters,labels,baseline,estimate,idFor};
})();

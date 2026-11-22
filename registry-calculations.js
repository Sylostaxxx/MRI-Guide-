(() => {
  const f={
    larmor:([b])=>42.58*b, field:([mhz])=>mhz/42.58,
    recovery:([t,t1])=>100*(1-Math.exp(-t/t1)),
    decay:([t,t2])=>100*Math.exp(-t/t2),
    slew:([a,t])=>a/t, frequencyOffset:([g,cm])=>42580*g*cm/100,
    induction:([turns,flux,t])=>turns*flux/t,
    bandwidth:([sampleUs])=>1e6/sampleUs,
    alias:([freq,sample])=>Math.abs(freq-sample),
    inhomogeneity:([t2,t2s])=>1000/t2s-1000/t2,
    pixel:([fov,matrix])=>fov/matrix, voxel:([x,y,z])=>x*y*z,
    averages:([newN,oldN])=>Math.sqrt(newN/oldN),
    bandwidthSNR:([oldBW,newBW])=>Math.sqrt(oldBW/newBW),
    scanTime:([tr,phase,nex,etl])=>tr*phase*nex/etl/1000,
    nullTime:([t1])=>t1*Math.LN2,
    coverage:([n,t,g])=>n*t+(n-1)*g,
    chemShift:([hz,bw])=>hz/bw,
    acceleration:([a,r])=>a/r,
    cnr:([a,b,n])=>Math.abs(a-b)/n
  };
  function add(id,category,topic,formula,args,stem,unit,digits,reason,bad,pilot=false){
    const correct=f[formula](args);
    const format=value=>value.toFixed(digits)+(unit?' '+unit:'');
    const options=[[format(correct),reason],...bad.map(([v,why])=>[format(v),why])];
    RegistryContent.add({id,category,topic,stem,options,pilot,formula:{name:formula,args,digits,expected:correct}});
  }
  add('p31','physical','Larmor frequency','larmor',[3],
    'Using 42.58 MHz/T for protons, what is the resonance frequency at 3 T?','MHz',2,
    'Multiply the proton gyromagnetic ratio in MHz/T by B0.',[[42.58,'This is the value at 1 T.'],[14.19,'Dividing by field strength reverses the relationship.'],[85.16,'This corresponds to 2 T.']]);
  add('p32','physical','Field strength from resonance','field',[63.87],
    'A proton reference resonates at 63.87 MHz. Using 42.58 MHz/T, estimate B0.','T',2,
    'Divide resonance frequency by the proton gyromagnetic ratio.',[[0.67,'This reverses the division.'],[3,'A 3 T scanner would be near 127.74 MHz.'],[2,'A 2 T scanner would be near 85.16 MHz.']]);
  add('p33','physical','Longitudinal recovery','recovery',[800,800],
    'Longitudinal magnetization starts at zero. What percent of equilibrium has recovered after 800 ms if T1 is 800 ms?','%',1,
    'The recovery fraction is 1 − exp(−t/T1).',[[36.8,'This is the remaining deficit, not the recovered fraction.'],[50,'A T1 is not the recovery half-time.'],[100,'Exponential recovery is incomplete at one time constant.']]);
  add('p34','physical','Transverse decay','decay',[120,60],
    'An ideal transverse signal decays with T2 = 60 ms. What percentage remains at 120 ms?','%',1,
    'At two time constants, the remaining signal is exp(−2).',[[36.8,'This is the fraction after one time constant.'],[86.5,'This is the fraction lost.'],[50,'Two time constants do not describe one half-life.']]);
  add('p35','physical','Gradient slew rate','slew',[36,0.24],
    'A gradient ramps linearly from 0 to 36 mT/m in 0.24 ms. What is the slew rate?','T/m/s',0,
    'Divide gradient change by rise time; mT/ms is equivalent to T/s.',[[36,'This is amplitude, not amplitude change per second.'],[8,'Multiplying amplitude and time does not give slew rate.'],[240,'This treats 0.24 ms as a gradient specification.']]);
  add('p36','physical','Readout frequency offset','frequencyOffset',[0.02,5],
    'A 0.020 T/m readout gradient is applied. What is the magnitude of the proton frequency offset at 5 cm from isocenter? Use 42.58 MHz/T.','kHz',2,
    'The field offset is 0.020 × 0.05 = 0.001 T, which corresponds to 42.58 kHz.',[[4.26,'This uses a field offset of 0.0001 T.'],[85.16,'This is the offset at 10 cm.'],[425.80,'This is ten times the specified offset.']]);
  add('p37','physical','Faraday induction','induction',[6,0.002,0.04],
    'In an ideal six-turn coil, flux per turn changes by 0.002 Wb in 0.04 s. What is the average induced voltage magnitude?','V',2,
    'Faraday’s law gives N × |Δflux| / Δtime.',[[0.05,'This omits five turns.'],[1.20,'This overestimates the flux change or rate.'],[0.12,'This does not correctly divide total flux change by time.']]);
  add('p38','physical','Dwell time','bandwidth',[8],
    'Uniform samples are acquired every 8 microseconds. What is the sampling rate?','samples/s',0,
    'Sampling rate is the reciprocal of dwell time in seconds.',[[8000,'This is not the reciprocal of 8 microseconds.'],[800000,'This confuses the spacing with a sampling rate.'],[62500,'This corresponds to 16 microseconds.']]);
  add('p39','physical','Temporal aliasing','alias',[7,10],
    'A real 7 kHz sinusoid is sampled at 10 kHz. What lower frequency produces indistinguishable real samples, allowing a phase change?','kHz',0,
    'The component aliases to |10 − 7| = 3 kHz.',[[5,'This is the Nyquist frequency, not the alias.'],[7,'This is the original frequency above Nyquist.'],[17,'The sum is outside the lower-frequency range.']]);
  add('p40','physical','Effective additional dephasing','inhomogeneity',[80,40],
    'In a simple exponential model, T2 is 80 ms and T2-star is 40 ms. What is 1/T2-star − 1/T2 in s⁻¹?','s⁻¹',1,
    'Subtract the decay rates in inverse seconds: 25 − 12.5.',[[25,'This is the full T2-star decay rate.'],[40,'This is a time in milliseconds, not a rate.'],[0,'The effective decay includes added dephasing.']]);
  add('s27','parameters','Pixel spacing','pixel',[220,256],
    'What is the acquired spacing along an axis with 220 mm FOV and 256 samples?','mm',3,
    'Spacing = FOV / acquired samples.',[[1.164,'This inverts the ratio.'],[0.430,'This uses 512 samples.'],[0.688,'This would require 320 samples.']]);
  add('s28','parameters','Voxel volume','voxel',[0.8,1.2,4],
    'What is the volume of a voxel measuring 0.8 mm × 1.2 mm × 4 mm?','mm³',2,
    'Multiply the three perpendicular dimensions.',[[0.96,'This is in-plane area only.'],[6,'Adding lengths does not give volume.'],[4.80,'This omits the 0.8 mm dimension.']]);
  add('s29','parameters','SNR from averages','averages',[4,1],
    'If independent noise dominates, how does SNR change when NEX goes from 1 to 4 with other factors fixed?','×',2,
    'The ideal SNR ratio is the square root of the NEX ratio.',[[4,'This is the averaging or time ratio.'],[0.50,'This is the reciprocal of the SNR gain.'],[1,'Averaging reduces random fluctuations.']]);
  add('s30','parameters','Bandwidth and noise','bandwidthSNR',[160,640],
    'With signal otherwise fixed, bandwidth rises from 160 to 640 Hz/pixel. What is the approximate new-to-old SNR ratio?','×',2,
    'The simplified ratio is √(160/640) = 0.50.',[[2,'This describes the simplified noise increase.'],[0.25,'This omits the square root.'],[1,'Higher bandwidth usually changes accepted noise.']]);
  add('s31','parameters','Fast spin-echo time','scanTime',[3000,192,2,12],
    'Ignoring overhead, what is the acquisition time of a 2D FSE with TR 3 s, 192 phase steps, NEX 2 and ETL 12?','s',0,
    'Use TR × phase steps × NEX / ETL.',[[48,'This omits the second average.'],[576,'This does not account for the echo train length.'],[16,'This is the number of echo trains per average.']]);
  add('s32','parameters','Inversion null','nullTime',[250],
    'Assuming full recovery and perfect inversion, what TI approximately nulls a tissue with T1 = 250 ms?','ms',0,
    'The null occurs at TI = T1 ln(2).',[[250,'One T1 after inversion is beyond the null.'],[125,'One half of T1 is shorter than the null time.'],[500,'Two T1 periods are well beyond the null.']]);
  add('s33','parameters','Stack coverage','coverage',[12,4,1],
    'Twelve 4 mm slices are prescribed with a 1 mm gap between adjacent slices. What is the edge-to-edge stack extent?','mm',0,
    'Include 12 slice thicknesses and 11 gaps.',[[48,'This is the sampled thickness total, ignoring gaps.'],[60,'This counts one extra gap.'],[44,'This omits one slice and the gaps.']]);
  add('s34','parameters','Chemical-shift pixels','chemShift',[440,220],
    'If the fat-water offset is 440 Hz and the readout bandwidth is 220 Hz per pixel, what is the displacement magnitude?','pixels',1,
    'Divide the frequency difference by Hz per pixel.',[[0.5,'This inverts the division.'],[4,'This would require half the given bandwidth.'],[1,'The offset spans two bandwidth bins.']]);
  add('s35','parameters','Parallel imaging time','acceleration',[144,3],
    'An unaccelerated scan takes 144 seconds. Ignoring calibration and overhead, estimate the time with acceleration R = 3.','s',0,
    'The idealized time is the original time divided by R.',[[72,'This corresponds to R = 2.'],[432,'This multiplies the time by acceleration.'],[96,'This subtracts one third of the original time.']]);
  add('s36','parameters','Contrast-to-noise ratio','cnr',[120,80,8],
    'Two regions have mean signals of 120 and 80. Using a noise SD of 8, what is the simple CNR?','',1,
    'Divide the absolute signal difference by noise: 40/8.',[[15,'This computes SNR for the brighter region.'],[10,'This computes SNR for the darker region.'],[25,'This divides the sum instead of the difference.']]);
  globalThis.RegistryFormulas=f;
})();

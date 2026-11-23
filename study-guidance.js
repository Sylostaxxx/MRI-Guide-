(() => {
  const formulas={
    larmor:['Identify the nuclear species and the local static field.','The frequency changes in direct proportion to field strength.','Use f = (γ/2π) × B₀ with the given value in MHz/T and B₀ in tesla.','f = (γ/2π) × B₀'],
    field:['Identify which quantity is unknown and check its units.','The field is the resonance frequency divided by the frequency per unit field.','Rearrange f = (γ/2π) × B₀ for B₀. Keep the frequency units consistent.','B₀ = f / (γ/2π)'],
    recovery:['Track the longitudinal component after saturation.','The unrecovered fraction shrinks exponentially with the ratio of elapsed time to T1.','Find the remaining deficit e^(−t/T1), subtract it from one and convert to a percentage.','Mz/M0 = 1 − e^(−t/T1)'],
    decay:['Track how much transverse signal remains.','Divide elapsed time by the decay constant to count time constants.','Use e^(−t/T2) for the remaining fraction, then convert to a percentage.','Mxy/Mxy(0) = e^(−t/T2)'],
    slew:['Compare the gradient change with the time of the ramp.','A rate uses the change in the numerator and elapsed time in the denominator.','Divide amplitude change in mT/m by rise time in ms. Matching milli prefixes cancel.','Slew rate = ΔG/Δt'],
    frequencyOffset:['Translate position along the gradient into a difference in magnetic field.','Convert centimeters to meters before multiplying by the gradient in T/m.','Compute ΔB = G × distance, then multiply by the proton frequency per tesla and convert to kHz.','Δf = (γ/2π) × G × x'],
    induction:['Separate flux change from the time over which it occurs.','Each turn contributes to the total change in linked flux.','Use the number of turns times the magnitude of the flux change per turn divided by the time interval.','|V| = N × |ΔΦ|/Δt'],
    bandwidth:['The dwell time is the interval between samples.','The sampling rate is the reciprocal of that interval.','Convert microseconds to seconds and divide one by that duration.','Sampling rate = 1 / dwell time'],
    alias:['Compare the signal frequency to half the sampling frequency.','A real frequency above Nyquist can fold into the measured band.','Subtract the input frequency from the sampling rate and take the magnitude for this first fold.','First alias = |f_sample − f_signal|'],
    inhomogeneity:['Compare effective decay rates, using reciprocal time.','Convert both decay constants from milliseconds to seconds before taking reciprocals.','Subtract the intrinsic transverse decay rate from the measured effective transverse decay rate.','1/T2′ = 1/T2* − 1/T2'],
    pixel:['Use data from the same acquisition direction.','The field of view is distributed across the acquired samples.','Divide FOV in millimeters by the number of samples along that axis.','Spacing = FOV / samples'],
    voxel:['Identify the three perpendicular voxel dimensions.','The requested unit is cubic, so combine all three length measurements.','Multiply the two in-plane spacings by the slice thickness, all in millimeters.','Volume = Δx × Δy × Δz'],
    averages:['Separate the acquisition time change from the SNR change.','Independent random noise averages down with the square root of the number of repetitions.','Divide new NEX by original NEX and take the square root of that ratio.','SNR ratio = √(new NEX / old NEX)'],
    bandwidthSNR:['Consider how admitting more receiver noise affects SNR.','With constant signal in this model, SNR varies inversely with the square root of bandwidth.','Divide old bandwidth by new bandwidth and take the square root.','New/old SNR = √(old BW / new BW)'],
    scanTime:['Count the acquired phase steps per average.','Each fast spin-echo train covers multiple phase steps within a repetition.','Multiply TR by phase steps and averages, then divide by echo train length. Convert TR to seconds.','Time = TR × phase steps × NEX / ETL'],
    nullTime:['After ideal inversion, look for the longitudinal zero crossing.','The net longitudinal component crosses zero when the exponential term is one half.','Multiply the target tissue T1 by the natural logarithm of two.','TI = T1 × ln(2)'],
    coverage:['Count both slices and gaps between slices.','A stack has one fewer interslice gap than slices.','Multiply slice count by thickness, then add the number of gaps times the gap size.','Coverage = N × thickness + (N − 1) × gap'],
    chemShift:['Compare two quantities measured in frequency units.','Readout bandwidth per pixel tells you how much frequency difference maps to one pixel.','Divide the chemical-shift frequency difference by readout bandwidth per pixel.','Displacement = frequency offset / Hz per pixel'],
    acceleration:['Use the idealized case with no calibration overhead.','An acceleration factor represents the ratio between unaccelerated and accelerated acquisition work.','Divide the unaccelerated time by the acceleration factor.','Time = unaccelerated time / R'],
    cnr:['Compare the two tissues before considering the noise.','The contrast term is the absolute difference between the mean signals.','Divide the magnitude of the signal difference by the specified noise standard deviation.','CNR = |S₁ − S₂| / noise SD']
  };
  const concepts=[
    [/k.space|spatial frequency|zero fill|partial fourier/i,['Think in spatial frequency rather than an anatomical screen location.','Ask whether the change affects spacing between samples, the measured frequency extent, or reconstruction after acquisition.']],
    [/t1 |longitudinal|inversion|flair|stir/i,['Track the magnetization along the main field between pulses.','Sketch the recovery curve from its starting point and ask whether the timing samples recovery, saturation or a zero crossing.']],
    [/t2.star|susceptibility|dephasing|t2 |echo refocus/i,['Track transverse coherence at the time the echo is sampled.','Separate static frequency differences from intrinsic transverse relaxation and consider which effects RF refocusing can reverse.']],
    [/larmor|resonance|gyromagnetic/i,['Relate precession to the nucleus and the field at its location.','Distinguish cycles per second from angular rate and check field units before comparing values.']],
    [/flip angle|rf excitation|pulse integral/i,['Track the direction of net magnetization immediately before and after the pulse.','Separate the length of the transverse projection from the amount available for the next excitation.']],
    [/alias|wrap|nyquist|sampling/i,['Check how the sampled frequency or spatial extent relates to the unambiguous range.','Distinguish a folded signal from blur caused by losing high frequencies.']],
    [/bandwidth|chemical.shift/i,['Identify whether the question refers to transmission or receiver sampling.','Compare frequency per pixel with the offset before reasoning about displacement.']],
    [/diffusion|adc/i,['Compare diffusion-sensitive signal with the derived diffusion map.','Account for underlying T2 signal before interpreting a bright diffusion image.']],
    [/implant|conditional|screening|projectile/i,['Identify the specific hazard and the information needed before exposure.','Consider which documented device conditions must be checked for this scanner and planned examination.']],
    [/sar|burn|heating|rf safety/i,['Identify how RF energy could be deposited and where it might concentrate.','Distinguish local heating risk from whole-body averages and check whether the setup creates a conductive contact or loop.']]
  ];
  const itemHints={
    h01:['Sketch the access pathway from public space to the scanner.','Separate the room containing the bore from the restricted area outside it.'],
    h02:['Consider how people and equipment move from screening to the magnet room.','Distinguish a physical access barrier from the process of verifying a person or item.'],
    h03:['Treat MR labels as defined terms with different scopes.','Ask whether the label applies to any MR environment or only to a tested setup.'],
    h04:['Look for the missing facts about the implant itself.','A previous scan or a lower field alone cannot establish every applicable condition.'],
    h05:['Compare the three formal item designations.','Distinguish documented acceptable use under limits from a designation that identifies an unacceptable hazard.'],
    h07:['Separate displacement toward the magnet from an object turning in place.','Consider which mechanical quantity describes rotation about an axis.'],
    h09:['Approval of the monitor does not validate every cable arrangement.','Look for the option that controls both loop formation and skin contact under the equipment instructions.'],
    h11:['Focus on the exact exposure quantity written on the device label.','Gradient amplitude, image brightness, and a different RF metric cannot establish compliance with that stated quantity.'],
    h12:['A changing magnetic field can induce an electric field in tissue.','Look for the scanner subsystem that switches controlled spatial slopes rapidly.'],
    h13:['Separate acoustic exposure from the volume of the patient intercom.','A history of normal hearing does not prevent exposure during gradient switching.'],
    h14:['Consider what happens when a large volume of cold gas fills a room.','Ask how breathable air and the ability to reach an exit would be affected.'],
    h15:['Separate immediate patient care from the requirements for bringing equipment near the magnet.','Conventional emergency equipment may be hazardous in the scanner room even during a medical emergency.'],
    h17:['Consider whether a retained fragment could move or heat in the MR environment.','A localizer is still exposure. Resolve the uncertain injury history before considering any sequence.'],
    h18:['Assess the complete assembly, including regulator and transport accessories.','Color conventions and brief exposure cannot substitute for a verified device designation.'],
    h19:['Treat new localized burning during acquisition as a potentially important safety report.','Compare actions by how quickly they let staff assess the patient before further exposure.'],
    h20:['Consider how contact points affect local energy deposition.','Insulating pads control physical contact without altering the intrinsic gradient duty cycle.'],
    h21:['Assess immediate setup conditions for independent sources of avoidable exposure.','Spot configurations that leave conductive loops, unverified equipment, or inadequate separation.'],
    c01:['Use identifiers that belong to the person, not the room or schedule.','Compare the information from independent identifiers with the order before proceeding.'],
    c02:['Separate a voluntary informed decision from merely obtaining a signature.','Consider whether the patient has enough information and an opportunity to ask questions.'],
    c03:['Prioritize accurate two-way communication and confidentiality.','Distinguish qualified language support from relying on a convenient bystander.'],
    c04:['Consider what the patient needs to do and how they can alert staff.','Check understanding rather than assuming that information was understood after a single explanation.'],
    c05:['Consider who is authorized to receive the information and for what purpose.','The existence of a name or image in a record does not make it freely shareable.'],
    c08:['Identify reversible barriers to completing the exam before assuming the patient can tolerate it.','Communication, preparation and monitoring should follow the facility pathway.'],
    c09:['Ask for details that establish the prior agent, symptoms and severity.','Distinguish a reaction history from a blanket assumption about all contrast agents.'],
    c10:['New pain or swelling at the injection site can indicate leakage into tissue.','Consider which immediate action limits further exposure while allowing assessment.'],
    c11:['Risk assessment depends on patient factors and on the specific agent and purpose.','A current institutional policy is more reliable than assuming identical risk for all agents.'],
    c12:['Consider when contamination can be transferred between a patient, equipment and the next patient.','Glove use does not remove the need to follow the applicable hand hygiene steps.'],
    c13:['Separate physical cleaning from disinfection and check equipment compatibility.','A wipe used too briefly may fail to meet the required contact time.'],
    c14:['A critical message needs a reliable route to the authorized recipient.','Consider whether the communication pathway confirms receipt rather than leaving an unverified message.'],
    a01:['Identify the pulse that reverses phase spread from static offsets.','Distinguish RF refocusing from a reversal of the readout gradient.'],
    a02:['Track the number of echoes after one excitation.','Ask whether different phase-encoding lines can be acquired before the next excitation.'],
    a04:['Compare gradient rephasing with RF refocusing.','Ask which component of phase spread remains when the sequence lacks a refocusing RF pulse.'],
    a10:['Follow the readout trajectory immediately after excitation.','Compare a long train of alternating readouts with one separately excited line per repetition.'],
    a24:['Separate location along the stack from the direction of the two in-plane axes.','Look for a DICOM quantity that encodes two unit vectors in the patient coordinate system.'],
    a25:['Use physical geometry rather than the storage order of files.','Compare slice coordinates in the direction perpendicular to the image plane.'],
    a26:['Work down the DICOM hierarchy from study to series to a single object.','Select the identifier at the most specific level required by the question.'],
    s01:['Track recovery between excitations in the longitudinal direction.','A timing change that makes recovery more incomplete can emphasize differences in recovery rates.'],
    s02:['Consider when transverse magnetization is sampled after excitation.','A later echo provides more time for tissues with different transverse lifetimes to separate in signal.'],
    s07:['Hold the stated matrix fixed while changing the width covered.','The acquired sample spacing is a distance per sample in the same direction.'],
    s08:['Hold anatomical coverage fixed while changing how many samples span it.','More samples fit into the same distance only if the nominal spacing changes.']
  };
  function hints(question) {
    if(question.formula&&formulas[question.formula.name])return formulas[question.formula.name].slice(0,3);
    if(/^larmor-field-/.test(question.id))return formulas.larmor.slice(0,3);
    const asset=question.image&&globalThis.RegistryImages?.[question.image];
    if(asset?.marked)return [
      {brain:'Orient the slice using the midline, ventricular spaces and outer cortex.',spine:'Orient the spine using the vertebral bodies and the spinal canal.',knee:'Identify the distal femur, tibia and joint space first.',heart:'Orient the chamber in relation to the other chambers and adjacent vessels.'}[asset.region],
      'Use the neutral pointer tip to compare the target with surrounding boundaries on this slice.',
      'The pointer on this MRI now shows the source-verified location.'
    ].filter(Boolean);
    const tips=itemHints[question.id]??concepts.find(([pattern])=>pattern.test(question.topic))?.[1];
    if(!tips)return [];
    const normalize=value=>value.toLowerCase().replace(/[^a-z0-9]/g,'');
    const keys=question.key.map(i=>normalize(question.options[i][0])).filter(value=>value.length>=4);
    return tips.filter(hint=>!keys.some(answer=>normalize(hint).includes(answer)));
  }
  function renderHints(host,show,hide,question,level,hidden,locked) {
    const tips=hints(question);
    show.hidden=locked||level>=tips.length;
    show.textContent=level?'Give Me a Stronger Hint':'Show Hint';
    hide.hidden=locked||!level;
    hide.textContent=hidden?'Show Revealed Hints':'Hide Hints';
    host.hidden=locked||!level||hidden;
    host.replaceChildren(...tips.slice(0,level).map((tip,index)=>{
      const row=document.createElement('p');row.textContent='Hint '+(index+1)+' · '+tip;return row;
    }));
  }
  function correction(host,question,answer,options={}) {
    const node=(tag,text)=>{const item=document.createElement(tag);if(text)item.textContent=text;return item;};
    const link=(label,url)=>{const item=node('a',label);item.href=url;return item;};
    const block=(title,text)=>{if(text)host.append(node('h3',title),node('p',text));};
    const selected=answer.map(i=>question.options[i]).filter(Boolean);
    const correct=question.key.map(i=>question.options[i]).filter(Boolean);
    const pick=selected.filter(pair=>!correct.includes(pair));
    const lessonId=globalThis.StudyContentMap?.lessonFor(question);
    const lesson=globalThis.PhysicsLessons?.lessons.find(item=>item.id===lessonId);
    host.replaceChildren(node('h2','Teach Me Why I Was Wrong'),node('p',question.stem));
    block('Your response',selected.map(pair=>pair[0]).join(question.type==='order'?' → ':' · '));
    block('Correct response',correct.map(pair=>pair[0]).join(question.type==='order'?' → ':' · '));
    block('Where the reasoning went wrong',pick.map(pair=>pair[0]+' — '+pair[1]).join(' ')||
      (question.type==='order'?'The sequence differs from the required order shown above.':'Compare the missing choices with the complete correct set.'));
    block('Underlying concept',correct.map(pair=>pair[1]).join(' '));
    if(lesson){
      block('Explain it simply',lesson.simple);
      block('Example',lesson.example);
      block('Common registry misconception',lesson.trap);
      const model=globalThis.PhysicsDiagrams;
      const settings=model?.solutions[lesson.visual];
      if(settings){
        const plot=node('canvas');
        plot.width=650;plot.height=310;plot.className='lesson-plot correction-plot';
        plot.setAttribute('role','img');
        const description=model.draw(plot,lesson.visual,settings[4]);
        plot.setAttribute('aria-label',description);
        host.append(plot,node('p',description));
      }
    } else if(question.category==='safety'){
      block('Apply the principle','Use the cited MRI safety guidance to identify the hazard. The facility’s written procedure defines the local workflow and escalation route.');
    }
    const f=formulas[question.formula?.name];
    if(f)block('Worked calculation',f[3]+'. '+f[2]+' Given values in question order are '+question.formula.args.join(', ')+'. The answer is '+correct[0][0]+'.');
    const asset=question.image&&globalThis.RegistryImages?.[question.image];
    if(asset){
      const image=node('img');image.src=asset.path;image.alt='MRI review image with source-verified marker when available';host.append(image);
    }
    const source=node('p');for(const [label,url] of question.references??[])source.append(link(label,url),document.createTextNode(' '));
    host.append(source);
    const controls=node('div');controls.className='controls';
    function button(label,handler){const b=node('button',label);b.type='button';b.onclick=handler;return b;}
    if(options.back)controls.append(button('Return to Original Question',options.back));
    const related=globalThis.StudyContentMap?.related(question)??question.related;
    if(related)controls.append(link('Open Full Lesson',related));
    if(options.follow)controls.append(link(options.follow.exact?'Try Another Question':'Try Another Question in This Subject','./practice.html?retry='+encodeURIComponent(options.follow.id)));
    if(options.save&&globalThis.StudyStore){
      const saved=node('span');saved.setAttribute('role','status');
      controls.append(button('Save to Trouble Questions',async()=>{
        try{
          await StudyStore.write({id:'bookmark:'+question.id,at:Date.now(),value:{bookmarked:true}});
          saved.textContent='Saved to your bookmarked Trouble Questions.';
        }catch{saved.textContent='The bookmark could not be saved.';}
      }),saved);
    }
    controls.append(link('View in Trouble Questions','./practice.html?view=trouble'));
    host.append(controls);
    if(globalThis.StudyStore){
      const label=node('label','Personal note');
      const text=node('textarea');label.append(text);
      const status=node('p');status.setAttribute('role','status');
      host.append(label,button('Add Personal Note',()=>{
        if(!text.value.trim())return;
        try{StudyStore.note('practice:'+question.id,question.topic+'\n'+text.value.trim());text.value='';status.textContent='Saved in My Study Space.';}
        catch{status.textContent='The note could not be saved.';}
      }),status);
    }
  }
  function follow(question,bank){
    const id=globalThis.StudyContentMap?.lessonFor(question);
    const candidates=bank.filter(item=>item.id!==question.id&&!item.pilot);
    const exact=candidates.find(item=>item.topic===question.topic||id&&globalThis.StudyContentMap.lessonFor(item)===id);
    const other=exact??candidates.find(item=>item.category===question.category);
    return other?{id:other.id,exact:Boolean(exact)}:null;
  }
  globalThis.StudyGuidance={hints,renderHints,correction,follow};
})();

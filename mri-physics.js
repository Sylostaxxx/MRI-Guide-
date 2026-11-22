(() => {
  function longitudinalRecovery(time, t1) {
    return -Math.expm1(-time / t1);
  }

  function transverseDecay(time, relaxation) {
    return Math.exp(-time / relaxation);
  }

  function spinEchoSignal(tr, te, t1, t2, density = 1) {
    return density * longitudinalRecovery(tr, t1) * transverseDecay(te, t2);
  }

  function larmorMHz(fieldTesla) {
    return 42.57748 * fieldTesla;
  }

  globalThis.MRIPhysics = { longitudinalRecovery, transverseDecay, spinEchoSignal, larmorMHz };
})();

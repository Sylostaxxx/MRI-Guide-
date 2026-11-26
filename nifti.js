(() => {
  const pixelTypes = {
    2: ['getUint8', 1], 4: ['getInt16', 2], 8: ['getInt32', 4],
    16: ['getFloat32', 4], 64: ['getFloat64', 8], 256: ['getInt8', 1],
    512: ['getUint16', 2], 768: ['getUint32', 4]
  };

  async function parse(buffer) {
    let bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (bytes[0] === 31 && bytes[1] === 139) {
      if (!globalThis.DecompressionStream) throw Error('Gzip requires a current browser.');
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    }
    if (bytes.byteLength < 352) throw Error('Incomplete NIfTI');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const little = view.getInt32(0, true) === 348;
    if (!little && view.getInt32(0, false) !== 348) throw Error('Only NIfTI-1 supported');
    if (view.getUint32(344) !== 0x6e2b3100) throw Error('Only single-file NIfTI supported');
    const dim = [42, 44, 46].map(offset => view.getInt16(offset, little));
    const size = dim.reduce((count, length) => count * length, 1);
    const rank = view.getInt16(40, little);
    if (rank < 3 || rank > 7 || dim.some(n => n < 1) || size > 35000000) {
      throw Error('Unsupported volume geometry');
    }
    for (let axis = 4; axis <= rank; axis++) {
      if (view.getInt16(40 + 2 * axis, little) > 1) throw Error('Only scalar 3D volumes supported');
    }
    const pixel = pixelTypes[view.getInt16(70, little)];
    const offset = view.getFloat32(108, little);
    if (!pixel || !Number.isInteger(offset) || offset < 352 || offset + size * pixel[1] > view.byteLength) {
      throw Error('Unsupported or incomplete pixel data');
    }
    const [read, step] = pixel;
    const slope = view.getFloat32(112, little);
    const intercept = view.getFloat32(116, little);
    const scaled = Number.isFinite(slope) && slope !== 0;
    const factor = scaled ? slope : 1;
    const baseline = scaled && Number.isFinite(intercept) ? intercept : 0;
    const nativeLittle = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;
    const native16 = little === nativeLittle && (bytes.byteOffset + offset) % 2 === 0;
    let p;
    if (factor === 1 && baseline === 0 && read === 'getUint8') p = bytes.subarray(offset, offset + size);
    else if (factor === 1 && baseline === 0 && native16 && ['getInt16','getUint16'].includes(read)) {
      const TypedArray = read === 'getInt16' ? Int16Array : Uint16Array;
      p = new TypedArray(bytes.buffer,bytes.byteOffset+offset,size);
    } else p = new Float32Array(size);
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < size; i++) {
      if (p instanceof Float32Array) {
        const value = Math.fround(view[read](offset + i * step, little) * factor + baseline);
        p[i] = Number.isFinite(value) ? value : 0;
      }
      lo = Math.min(lo, p[i]);
      hi = Math.max(hi, p[i]);
    }
    const affine = view.getInt16(254, little) > 0
      ? Array.from({ length: 12 }, (_, i) => view.getFloat32(280 + i * 4, little))
      : null;
    return { dim, p, lo, hi, affine };
  }

  function verifyAtlasGrid(image, labels, {oblique=false}={}) {
    if (!image.affine || image.affine.some(value=>!Number.isFinite(value))) throw Error('Missing or invalid MRI orientation.');
    if (labels && (!labels.affine ||
        image.dim.some((size, axis) => size !== labels.dim[axis]) ||
        image.affine.some((value, i) => !Number.isFinite(value) ||
          !Number.isFinite(labels.affine[i]) || Math.abs(value - labels.affine[i]) > 1e-4))) {
      throw Error('The MRI and segmentation grids do not match.');
    }
    if (oblique) {
      for(let axis=0;axis<3;axis++){
        const component=image.affine[axis*5];
        const others=[0,1,2].filter(row=>row!==axis).map(row=>image.affine[row*4+axis]);
        if(!(component>0&&component>Math.hypot(...others)))throw Error('Expected native axes oriented near RAS.');
      }
      return;
    }
    if (image.affine.some((value, i) =>
        (i % 5 === 0 && value <= 0) ||
        (i % 5 !== 0 && i % 4 !== 3 && Math.abs(value) > 1e-4))) {
      throw Error('This atlas requires an axis-aligned RAS grid.');
    }
  }

  function voxelIndex(dim, [x, y, z]) {
    return x + dim[0] * (y + dim[1] * z);
  }
  globalThis.Nifti = { parse, verifyAtlasGrid, voxelIndex };
})();

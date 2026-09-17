/* Compact MIT-style QR encoder (byte mode, versions 1–16).
   Algorithm follows Project Nayuki's QR Code generator (MIT). */
(function (root) {
  'use strict';

  const ECC_PER_BLOCK = {
    L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24],
    M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28],
    Q: [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24],
    H: [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30]
  };
  const ECC_BLOCKS = {
    L: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6],
    M: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10],
    Q: [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17],
    H: [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16]
  };
  const ECL_FORMAT = { L: 1, M: 0, Q: 3, H: 2 };

  const EXP = new Uint8Array(256);
  const LOG = new Uint8Array(256);
  for (let x = 1, i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }

  function gfMul(a, b) {
    if (!a || !b) return 0;
    return EXP[(LOG[a] + LOG[b]) % 255];
  }

  function rawModules(ver) {
    let n = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      const numAlign = Math.floor(ver / 7) + 2;
      n -= (25 * numAlign - 10) * numAlign - 55;
      if (ver >= 7) n -= 36;
    }
    return n;
  }

  function dataCodewords(ver, ecl) {
    return Math.floor(rawModules(ver) / 8) - ECC_PER_BLOCK[ecl][ver] * ECC_BLOCKS[ecl][ver];
  }

  function alignPositions(ver) {
    if (ver === 1) return [];
    const numAlign = Math.floor(ver / 7) + 2;
    const step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (numAlign * 2 - 2)) * 2;
    const result = [];
    for (let i = 0, pos = ver * 4 + 10; i < numAlign - 1; i++, pos -= step) result.unshift(pos);
    result.unshift(6);
    return result;
  }

  function rsDivisor(degree) {
    const result = new Array(degree).fill(0);
    result[degree - 1] = 1;
    let root = 1;
    for (let i = 0; i < degree; i++) {
      for (let j = 0; j < result.length; j++) {
        result[j] = gfMul(result[j], root);
        if (j + 1 < result.length) result[j] ^= result[j + 1];
      }
      root = gfMul(root, 2);
    }
    return result;
  }

  function rsRemainder(data, divisor) {
    const result = divisor.map(() => 0);
    data.forEach(b => {
      const factor = b ^ result.shift();
      result.push(0);
      for (let i = 0; i < result.length; i++) result[i] ^= gfMul(divisor[i], factor);
    });
    return result;
  }

  function addEcc(ver, ecl, data) {
    const numBlocks = ECC_BLOCKS[ecl][ver];
    const blockEcc = ECC_PER_BLOCK[ecl][ver];
    const raw = Math.floor(rawModules(ver) / 8);
    const numShort = numBlocks - (raw % numBlocks);
    const shortLen = Math.floor(raw / numBlocks);
    const divisor = rsDivisor(blockEcc);
    const blocks = [];
    for (let i = 0, k = 0; i < numBlocks; i++) {
      const n = shortLen - blockEcc + (i < numShort ? 0 : 1);
      const dat = data.slice(k, k + n);
      k += n;
      const ecc = rsRemainder(dat, divisor);
      if (i < numShort) dat.push(0);
      blocks.push(dat.concat(ecc));
    }
    const out = [];
    for (let i = 0; i < blocks[0].length; i++) {
      for (let j = 0; j < blocks.length; j++) {
        if (i !== shortLen - blockEcc || j >= numShort) out.push(blocks[j][i]);
      }
    }
    return out;
  }

  function appendBits(val, len, bb) {
    for (let i = len - 1; i >= 0; i--) bb.push((val >>> i) & 1);
  }

  function encodeBytes(text, ecl) {
    const bytes = [];
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      if (c > 255) {
        const u = unescape(encodeURIComponent(text));
        const out = [];
        for (let j = 0; j < u.length; j++) out.push(u.charCodeAt(j) & 255);
        return encodeBytesFrom(out, ecl);
      }
      bytes.push(c);
    }
    return encodeBytesFrom(bytes, ecl);
  }

  function encodeBytesFrom(bytes, ecl) {
    let ver = 1;
    for (; ver <= 16; ver++) {
      const ccbits = ver <= 9 ? 8 : 16;
      if (4 + ccbits + bytes.length * 8 <= dataCodewords(ver, ecl) * 8) break;
    }
    if (ver > 16) throw new Error('QR data too long');
    const ccbits = ver <= 9 ? 8 : 16;
    const bb = [];
    appendBits(4, 4, bb);
    appendBits(bytes.length, ccbits, bb);
    bytes.forEach(b => appendBits(b, 8, bb));
    const dataCap = dataCodewords(ver, ecl) * 8;
    const term = Math.min(4, dataCap - bb.length);
    appendBits(0, term, bb);
    while (bb.length % 8) bb.push(0);
    const padBytes = [0xec, 0x11];
    let pi = 0;
    while (bb.length < dataCap) appendBits(padBytes[pi++ % 2], 8, bb);
    const data = [];
    for (let i = 0; i < bb.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | bb[i + j];
      data.push(b);
    }
    return { ver, ecl, codewords: addEcc(ver, ecl, data) };
  }

  function formatBits(ecl, mask) {
    const data = (ECL_FORMAT[ecl] << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    return ((data << 10) | rem) ^ 0x5412;
  }

  function versionBits(ver) {
    let rem = ver;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    return (ver << 12) | rem;
  }

  function setMod(mod, fn, x, y, on) {
    const size = mod.length;
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    mod[y][x] = !!on;
    fn[y][x] = true;
  }

  function finder(mod, fn, ox, oy) {
    for (let dy = -1; dy <= 7; dy++) {
      for (let dx = -1; dx <= 7; dx++) {
        const xx = ox + dx, yy = oy + dy;
        const inPat = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6;
        const ring = dx === 0 || dx === 6 || dy === 0 || dy === 6;
        const center = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
        setMod(mod, fn, xx, yy, inPat && (ring || center));
      }
    }
  }

  function alignment(mod, fn, cx, cy) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        setMod(mod, fn, cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }

  function drawFunction(mod, fn, ver) {
    const size = mod.length;
    finder(mod, fn, 0, 0);
    finder(mod, fn, size - 7, 0);
    finder(mod, fn, 0, size - 7);
    const pos = alignPositions(ver);
    for (let i = 0; i < pos.length; i++) {
      for (let j = 0; j < pos.length; j++) {
        if ((i === 0 && j === 0) || (i === 0 && j === pos.length - 1) || (i === pos.length - 1 && j === 0)) continue;
        alignment(mod, fn, pos[i], pos[j]);
      }
    }
    for (let i = 8; i < size - 8; i++) {
      const on = i % 2 === 0;
      if (!fn[6][i]) setMod(mod, fn, i, 6, on);
      if (!fn[i][6]) setMod(mod, fn, 6, i, on);
    }
    setMod(mod, fn, 8, size - 8, true);
    if (ver >= 7) {
      const bits = versionBits(ver);
      for (let i = 0; i < 18; i++) {
        const bit = ((bits >>> i) & 1) !== 0;
        const a = size - 11 + (i % 3), b = Math.floor(i / 3);
        setMod(mod, fn, a, b, bit);
        setMod(mod, fn, b, a, bit);
      }
    }
  }

  function drawFormat(mod, fn, ecl, mask) {
    const bits = formatBits(ecl, mask);
    const size = mod.length;
    for (let i = 0; i <= 5; i++) setMod(mod, fn, 8, i, ((bits >>> i) & 1) !== 0);
    setMod(mod, fn, 8, 7, ((bits >>> 6) & 1) !== 0);
    setMod(mod, fn, 8, 8, ((bits >>> 7) & 1) !== 0);
    setMod(mod, fn, 7, 8, ((bits >>> 8) & 1) !== 0);
    for (let i = 9; i < 15; i++) setMod(mod, fn, 14 - i, 8, ((bits >>> i) & 1) !== 0);
    for (let i = 0; i < 8; i++) setMod(mod, fn, size - 1 - i, 8, ((bits >>> i) & 1) !== 0);
    for (let i = 8; i < 15; i++) setMod(mod, fn, 8, size - 15 + i, ((bits >>> i) & 1) !== 0);
  }

  function maskBit(mask, x, y) {
    switch (mask) {
      case 0: return (x + y) % 2 === 0;
      case 1: return y % 2 === 0;
      case 2: return x % 3 === 0;
      case 3: return (x + y) % 3 === 0;
      case 4: return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
      case 5: return (x * y) % 2 + (x * y) % 3 === 0;
      case 6: return ((x * y) % 2 + (x * y) % 3) % 2 === 0;
      default: return ((x + y) % 2 + (x * y) % 3) % 2 === 0;
    }
  }

  function drawCodewords(mod, fn, codewords) {
    const size = mod.length;
    let i = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? size - 1 - vert : vert;
          if (!fn[y][x] && i < codewords.length * 8) {
            const bit = ((codewords[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
            mod[y][x] = bit;
            i++;
          }
        }
      }
    }
  }

  function applyMask(mod, fn, mask) {
    const size = mod.length;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (!fn[y][x] && maskBit(mask, x, y)) mod[y][x] = !mod[y][x];
      }
    }
  }

  function penalty(mod) {
    const size = mod.length;
    let score = 0;
    for (let y = 0; y < size; y++) {
      let run = 0, color = false;
      for (let x = 0; x < size; x++) {
        if (x === 0 || mod[y][x] !== color) { color = mod[y][x]; run = 1; }
        else { run++; if (run === 5) score += 3; else if (run > 5) score++; }
      }
    }
    for (let x = 0; x < size; x++) {
      let run = 0, color = false;
      for (let y = 0; y < size; y++) {
        if (y === 0 || mod[y][x] !== color) { color = mod[y][x]; run = 1; }
        else { run++; if (run === 5) score += 3; else if (run > 5) score++; }
      }
    }
    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size - 1; x++) {
        const c = mod[y][x];
        if (c === mod[y][x + 1] && c === mod[y + 1][x] && c === mod[y + 1][x + 1]) score += 3;
      }
    }
    const finder = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    const finder2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    function match(row, pat, i) {
      for (let k = 0; k < pat.length; k++) if ((row[i + k] ? 1 : 0) !== pat[k]) return false;
      return true;
    }
    for (let y = 0; y < size; y++) {
      for (let x = 0; x <= size - 11; x++) {
        if (match(mod[y], finder, x) || match(mod[y], finder2, x)) score += 40;
      }
    }
    for (let x = 0; x < size; x++) {
      const col = [];
      for (let y = 0; y < size; y++) col.push(mod[y][x]);
      for (let y = 0; y <= size - 11; y++) {
        if (match(col, finder, y) || match(col, finder2, y)) score += 40;
      }
    }
    let dark = 0;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (mod[y][x]) dark++;
    const pct = Math.floor(dark * 100 / (size * size));
    score += Math.trunc(Math.abs(pct - 50) / 5) * 10;
    return score;
  }

  function clone(m) { return m.map(row => row.slice()); }

  function encodeMatrix(text, ecl) {
    ecl = ecl || 'M';
    const packed = encodeBytes(text, ecl);
    const size = packed.ver * 4 + 17;
    const bestFn = Array.from({ length: size }, () => Array(size).fill(false));
    const base = Array.from({ length: size }, () => Array(size).fill(false));
    drawFunction(base, bestFn, packed.ver);
    drawFormat(base, bestFn, packed.ecl, 0);
    drawCodewords(base, bestFn, packed.codewords);
    let bestMask = 0, bestScore = Infinity, best = null;
    for (let mask = 0; mask < 8; mask++) {
      const trial = clone(base);
      const fn = clone(bestFn);
      applyMask(trial, fn, mask);
      drawFormat(trial, fn, packed.ecl, mask);
      const sc = penalty(trial);
      if (sc < bestScore) { bestScore = sc; bestMask = mask; best = trial; }
    }
    return { modules: best, size, version: packed.ver, mask: bestMask };
  }

  function toSvg(text, opts) {
    const ecl = (opts && opts.ecl) || 'M';
    const cell = (opts && opts.cell) || 4;
    const margin = opts && opts.margin != null ? opts.margin : 4;
    const dark = (opts && opts.dark) || '#0D3D38';
    const light = (opts && opts.light) || '#FFFFFF';
    const m = encodeMatrix(text, ecl);
    const dim = m.size + margin * 2;
    let path = '';
    for (let y = 0; y < m.size; y++) {
      for (let x = 0; x < m.size; x++) {
        if (m.modules[y][x]) path += 'M' + (x + margin) + ' ' + (y + margin) + 'h1v1h-1z';
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + dim + ' ' + dim +
      '" width="' + (dim * cell) + '" height="' + (dim * cell) +
      '" shape-rendering="crispEdges" role="img" aria-label="QR code">' +
      '<rect width="100%" height="100%" fill="' + light + '"/>' +
      '<path fill="' + dark + '" d="' + path + '"/></svg>';
  }

  function render(el, text, opts) {
    if (!el) return;
    el.innerHTML = toSvg(text, opts);
  }

  const api = { encodeMatrix, toSvg, render };
  root.kioskQr = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

// Genera icon-192.png e icon-512.png: fondo azul degradado + "B$" minimalista
const fs = require("fs"), zlib = require("zlib");

function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; }
  let c = 0xffffffff;
  for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function makeIcon(size) {
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4); row[0] = 0;
    for (let x = 0; x < size; x++) {
      const t = (x + y) / (2 * size); // diagonal
      let r = Math.round(14 + t * 10), g = Math.round(42 + t * 10), b = Math.round(92 + t * 12);
      // borde redondeado
      const rad = size * 0.22, cx = size / 2, cy = size / 2;
      const dx = Math.max(Math.abs(x - cx) - (cx - rad), 0), dy = Math.max(Math.abs(y - cy) - (cy - rad), 0);
      let alpha = Math.sqrt(dx * dx + dy * dy) > rad ? 0 : 255;
      // círculo central dorado con "Bs"
      const dcx = x - cx, dcy = (y - cy) * 1.05;
      const d = Math.sqrt(dcx * dcx + dcy * dcy);
      let rr = r, gg = g, bb = b, a = alpha;
      if (d < size * 0.30) { rr = 250; gg = 204; bb = 21; }
      else if (d < size * 0.33) { rr = 244; gg = 196; bb = 48; }
      row[1 + x * 4] = rr; row[2 + x * 4] = gg; row[3 + x * 4] = bb; row[4 + x * 4] = a;
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0))
  ]);
}
fs.writeFileSync("icon-192.png", makeIcon(192));
fs.writeFileSync("icon-512.png", makeIcon(512));
console.log("OK", fs.statSync("icon-192.png").size, fs.statSync("icon-512.png").size);

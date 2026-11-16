/*
 * zip.js – pembuat file ZIP sederhana (tanpa kompresi / metode "store").
 * Dipakai untuk mengunduh semua hasil sekaligus, seperti hasil_morfologi.zip di Colab.
 * Penggunaan: const blob = BuatZip([{ nama: "a.png", data: Uint8Array }, ...]);
 */
(function (root) {
  "use strict";

  var tabelCrc = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(data) {
    var c = 0xffffffff;
    for (var i = 0; i < data.length; i++) c = tabelCrc[(c ^ data[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function BuatZip(berkas) {
    var enc = new TextEncoder();
    var bagian = [], pusat = [], offset = 0;
    var now = new Date();
    var waktu = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    var tanggal = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

    berkas.forEach(function (f) {
      var nama = enc.encode(f.nama);
      var data = f.data;
      var crc = crc32(data);

      var lokal = new DataView(new ArrayBuffer(30));
      lokal.setUint32(0, 0x04034b50, true);
      lokal.setUint16(4, 20, true);
      lokal.setUint16(6, 0x0800, true); // nama file UTF-8
      lokal.setUint16(8, 0, true);      // tanpa kompresi
      lokal.setUint16(10, waktu, true);
      lokal.setUint16(12, tanggal, true);
      lokal.setUint32(14, crc, true);
      lokal.setUint32(18, data.length, true);
      lokal.setUint32(22, data.length, true);
      lokal.setUint16(26, nama.length, true);
      lokal.setUint16(28, 0, true);
      bagian.push(new Uint8Array(lokal.buffer), nama, data);

      var c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true);
      c.setUint16(4, 20, true);
      c.setUint16(6, 20, true);
      c.setUint16(8, 0x0800, true);
      c.setUint16(10, 0, true);
      c.setUint16(12, waktu, true);
      c.setUint16(14, tanggal, true);
      c.setUint32(16, crc, true);
      c.setUint32(20, data.length, true);
      c.setUint32(24, data.length, true);
      c.setUint16(28, nama.length, true);
      c.setUint32(42, offset, true);
      pusat.push(new Uint8Array(c.buffer), nama);

      offset += 30 + nama.length + data.length;
    });

    var ukuranPusat = pusat.reduce(function (s, b) { return s + b.length; }, 0);
    var akhir = new DataView(new ArrayBuffer(22));
    akhir.setUint32(0, 0x06054b50, true);
    akhir.setUint16(8, berkas.length, true);
    akhir.setUint16(10, berkas.length, true);
    akhir.setUint32(12, ukuranPusat, true);
    akhir.setUint32(16, offset, true);

    return new Blob(bagian.concat(pusat, [new Uint8Array(akhir.buffer)]), { type: "application/zip" });
  }

  root.BuatZip = BuatZip;
})(typeof self !== "undefined" ? self : this);

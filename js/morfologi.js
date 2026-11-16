/*
 * morfologi.js
 * Inti pengolahan citra untuk proyek
 * "Implementasi Morphological Filtering untuk Mengurangi Noise pada Citra Tulisan".
 *
 * Semua fungsi di sini adalah terjemahan JavaScript dari notebook Google Colab
 * (Cell 3 - Cell 7). Tidak memakai library apa pun, jadi bisa berjalan di browser
 * maupun di Node.js (untuk pengujian).
 *
 * Format citra biner: { w, h, data } dengan data = Uint8Array berisi 0 atau 255.
 * Tulisan (foreground) = 255 (putih), latar = 0 (hitam).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.Morfologi = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ------------------------------------------------------------------ */
  /* Utilitas dasar                                                      */
  /* ------------------------------------------------------------------ */

  function buatCitra(w, h, isi) {
    var data = new Uint8Array(w * h);
    if (isi) data.fill(isi);
    return { w: w, h: h, data: data };
  }

  function salin(c) {
    return { w: c.w, h: c.h, data: new Uint8Array(c.data) };
  }

  /** Generator angka acak dengan seed (mulberry32) agar noise bisa direproduksi. */
  function buatRng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Bilangan bulat acak di rentang [a, b] (inklusif). */
  function acakInt(rng, a, b) {
    return a + Math.floor(rng() * (b - a + 1));
  }

  /** Memilih k indeks unik dari 0..n-1 (tanpa pengembalian). */
  function pilihAcak(rng, n, k) {
    k = Math.min(k, n);
    var idx = new Int32Array(n);
    for (var i = 0; i < n; i++) idx[i] = i;
    for (var j = 0; j < k; j++) {
      var r = j + Math.floor(rng() * (n - j));
      var tmp = idx[j];
      idx[j] = idx[r];
      idx[r] = tmp;
    }
    return idx.subarray(0, k);
  }

  /* ------------------------------------------------------------------ */
  /* Cell 3 - Preprocessing                                              */
  /* ------------------------------------------------------------------ */

  /** RGBA (dari canvas) -> grayscale. Transparansi ditempel di atas latar putih. */
  function keGrayscale(rgba, w, h) {
    var gray = new Uint8Array(w * h);
    for (var i = 0, p = 0; i < w * h; i++, p += 4) {
      var a = rgba[p + 3] / 255;
      var r = rgba[p] * a + 255 * (1 - a);
      var g = rgba[p + 1] * a + 255 * (1 - a);
      var b = rgba[p + 2] * a + 255 * (1 - a);
      gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b); // rumus sama dengan OpenCV
    }
    return gray;
  }

  /** Gaussian blur 3x3 (kernel 1-2-1), sama seperti cv2.GaussianBlur(gray, (3,3), 0). */
  function gaussianBlur3(gray, w, h) {
    function refleksi(i, n) {
      if (n === 1) return 0;
      if (i < 0) return -i;
      if (i >= n) return 2 * n - 2 - i;
      return i;
    }
    var tmp = new Float32Array(w * h);
    var out = new Uint8Array(w * h);
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        tmp[y * w + x] =
          (gray[y * w + refleksi(x - 1, w)] + 2 * gray[y * w + x] + gray[y * w + refleksi(x + 1, w)]) / 4;
      }
    }
    for (var y2 = 0; y2 < h; y2++) {
      for (var x2 = 0; x2 < w; x2++) {
        var v =
          (tmp[refleksi(y2 - 1, h) * w + x2] + 2 * tmp[y2 * w + x2] + tmp[refleksi(y2 + 1, h) * w + x2]) / 4;
        out[y2 * w + x2] = Math.round(v);
      }
    }
    return out;
  }

  /** Mencari ambang optimal dengan metode Otsu. */
  function ambangOtsu(gray) {
    var hist = new Float64Array(256);
    for (var i = 0; i < gray.length; i++) hist[gray[i]]++;
    var total = gray.length;
    var jumlahSemua = 0;
    for (var t = 0; t < 256; t++) jumlahSemua += t * hist[t];
    var bobotB = 0, jumlahB = 0, terbaik = 0, ambang = 0;
    for (var k = 0; k < 256; k++) {
      bobotB += hist[k];
      if (bobotB === 0) continue;
      var bobotF = total - bobotB;
      if (bobotF === 0) break;
      jumlahB += k * hist[k];
      var mB = jumlahB / bobotB;
      var mF = (jumlahSemua - jumlahB) / bobotF;
      var antarKelas = bobotB * bobotF * (mB - mF) * (mB - mF);
      if (antarKelas > terbaik) {
        terbaik = antarKelas;
        ambang = k;
      }
    }
    return ambang;
  }

  /**
   * Grayscale -> blur -> Otsu -> pastikan tulisan putih.
   * paksaInversi: null (otomatis), true, atau false.
   */
  function binerisasi(gray, w, h, paksaInversi) {
    var blur = gaussianBlur3(gray, w, h);
    var ambang = ambangOtsu(blur);
    var biner = buatCitra(w, h);
    var putih = 0;
    for (var i = 0; i < w * h; i++) {
      if (blur[i] > ambang) {
        biner.data[i] = 255;
        putih++;
      }
    }
    var rasioPutih = putih / (w * h);
    var inversi = paksaInversi === null || paksaInversi === undefined ? rasioPutih > 0.5 : paksaInversi;
    if (inversi) {
      for (var j = 0; j < w * h; j++) biner.data[j] = 255 - biner.data[j];
    }
    return { biner: biner, ambang: ambang, rasioPutih: rasioPutih, inversi: inversi };
  }

  /* ------------------------------------------------------------------ */
  /* Cell 5 - Structuring element dan operasi morfologi                  */
  /* ------------------------------------------------------------------ */

  /** Structuring element persegi atau elips (algoritma sama dengan cv2.getStructuringElement). */
  function strukturElemen(ukuran, bentuk) {
    if (bentuk !== "persegi" && bentuk !== "elips") {
      throw new Error("Bentuk kernel harus 'persegi' atau 'elips'.");
    }
    var k = new Uint8Array(ukuran * ukuran);
    var r = Math.floor(ukuran / 2);
    var c = Math.floor(ukuran / 2);
    for (var i = 0; i < ukuran; i++) {
      var j1 = 0, j2 = 0;
      if (bentuk === "persegi") {
        j1 = 0;
        j2 = ukuran;
      } else {
        var dy = i - r;
        if (Math.abs(dy) <= r) {
          var dx = r ? Math.round(c * Math.sqrt((r * r - dy * dy) / (r * r))) : 0;
          j1 = Math.max(c - dx, 0);
          j2 = Math.min(c + dx + 1, ukuran);
        }
      }
      for (var j = j1; j < j2; j++) k[i * ukuran + j] = 1;
    }
    var offset = [];
    for (var yy = 0; yy < ukuran; yy++) {
      for (var xx = 0; xx < ukuran; xx++) {
        if (k[yy * ukuran + xx]) offset.push([xx - c, yy - r]);
      }
    }
    return { ukuran: ukuran, bentuk: bentuk, matriks: k, offset: offset };
  }

  /** Erosion: piksel tetap putih hanya jika SEMUA tetangga di dalam kernel putih. */
  function erosi(c, se) {
    var w = c.w, h = c.h, src = c.data, out = buatCitra(w, h), od = out.data;
    var off = se.offset, n = off.length;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var v = 255;
        for (var k = 0; k < n; k++) {
          var xx = x + off[k][0], yy = y + off[k][1];
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; // tepi citra diabaikan (seperti OpenCV)
          if (src[yy * w + xx] === 0) { v = 0; break; }
        }
        od[y * w + x] = v;
      }
    }
    return out;
  }

  /** Dilation: piksel menjadi putih jika ADA tetangga di dalam kernel yang putih. */
  function dilasi(c, se) {
    var w = c.w, h = c.h, src = c.data, out = buatCitra(w, h), od = out.data;
    var off = se.offset, n = off.length;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var v = 0;
        for (var k = 0; k < n; k++) {
          var xx = x - off[k][0], yy = y - off[k][1]; // kernel dicerminkan (simetris untuk persegi/elips)
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          if (src[yy * w + xx] === 255) { v = 255; break; }
        }
        od[y * w + x] = v;
      }
    }
    return out;
  }

  var OPERASI = ["erosion", "dilation", "opening", "closing"];
  var UKURAN = [3, 5];
  var BENTUK = ["persegi", "elips"];

  /** Menerapkan satu operasi morfologi (fungsi yang sama dipakai untuk semua noise). */
  function terapkanMorfologi(citra, operasi, ukuran, bentuk) {
    var se = strukturElemen(ukuran || 3, bentuk || "persegi");
    switch (operasi) {
      case "erosion": return erosi(citra, se);              // menipiskan foreground
      case "dilation": return dilasi(citra, se);            // menebalkan foreground
      case "opening": return dilasi(erosi(citra, se), se);  // erosion -> dilation
      case "closing": return erosi(dilasi(citra, se), se);  // dilation -> erosion
      default: throw new Error("Operasi tidak dikenal: " + operasi);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Cell 4 - Noise sintetis                                             */
  /* ------------------------------------------------------------------ */

  /** Menggambar lingkaran penuh berjari-jari r (r = 0 berarti satu piksel). */
  function gambarLingkaran(c, cx, cy, r, nilai) {
    for (var dy = -r; dy <= r; dy++) {
      for (var dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        var x = cx + dx, y = cy + dy;
        if (x >= 0 && y >= 0 && x < c.w && y < c.h) c.data[y * c.w + x] = nilai;
      }
    }
  }

  /** Menggambar garis tebal dari p1 ke p2. */
  function gambarGaris(c, p1, p2, tebal, nilai) {
    var setengah = tebal / 2;
    var minX = Math.max(0, Math.floor(Math.min(p1[0], p2[0]) - setengah - 1));
    var maxX = Math.min(c.w - 1, Math.ceil(Math.max(p1[0], p2[0]) + setengah + 1));
    var minY = Math.max(0, Math.floor(Math.min(p1[1], p2[1]) - setengah - 1));
    var maxY = Math.min(c.h - 1, Math.ceil(Math.max(p1[1], p2[1]) + setengah + 1));
    var vx = p2[0] - p1[0], vy = p2[1] - p1[1];
    var panjang2 = vx * vx + vy * vy || 1;
    for (var y = minY; y <= maxY; y++) {
      for (var x = minX; x <= maxX; x++) {
        var t = ((x - p1[0]) * vx + (y - p1[1]) * vy) / panjang2;
        t = Math.max(0, Math.min(1, t));
        var px = p1[0] + t * vx - x, py = p1[1] + t * vy - y;
        if (px * px + py * py <= setengah * setengah) c.data[y * c.w + x] = nilai;
      }
    }
  }

  /** Eksperimen 1: salt (putih) dan pepper (hitam) acak dengan probabilitas total p. */
  function noiseSaltPepper(gt, p, seed) {
    var rng = buatRng(seed);
    var hasil = salin(gt);
    for (var i = 0; i < hasil.data.length; i++) {
      var a = rng();
      if (a < p / 2) hasil.data[i] = 255;
      else if (a > 1 - p / 2) hasil.data[i] = 0;
    }
    return hasil;
  }

  /** Eksperimen 2: bintik putih kecil HANYA di latar yang jauh dari huruf. */
  function noiseBintikPutih(gt, jumlah, radiusMaks, seed) {
    var rng = buatRng(seed);
    var hasil = salin(gt);
    var jarak = radiusMaks + 2;
    var area = dilasi(gt, strukturElemen(2 * jarak + 1, "elips"));
    var kandidat = [];
    for (var i = 0; i < area.data.length; i++) if (area.data[i] === 0) kandidat.push(i);
    if (kandidat.length === 0) throw new Error("Tidak ada area latar yang cukup luas untuk bintik.");
    var dipilih = pilihAcak(rng, kandidat.length, jumlah);
    for (var j = 0; j < dipilih.length; j++) {
      var idx = kandidat[dipilih[j]];
      gambarLingkaran(hasil, idx % gt.w, Math.floor(idx / gt.w), acakInt(rng, 0, radiusMaks), 255);
    }
    return hasil;
  }

  /** Eksperimen 3: lubang hitam kecil di bagian dalam goresan. */
  function noiseLubangHitam(gt, jumlah, radiusMaks, seed) {
    var rng = buatRng(seed);
    var hasil = salin(gt);
    var dalam = erosi(gt, strukturElemen(3, "persegi"));
    var kandidat = [];
    for (var i = 0; i < dalam.data.length; i++) if (dalam.data[i] === 255) kandidat.push(i);
    if (kandidat.length === 0) {
      for (var k = 0; k < gt.data.length; k++) if (gt.data[k] === 255) kandidat.push(k);
    }
    if (kandidat.length === 0) throw new Error("Goresan tidak ditemukan pada citra biner.");
    var dipilih = pilihAcak(rng, kandidat.length, jumlah);
    for (var j = 0; j < dipilih.length; j++) {
      var idx = kandidat[dipilih[j]];
      gambarLingkaran(hasil, idx % gt.w, Math.floor(idx / gt.w), acakInt(rng, 0, radiusMaks), 0);
    }
    return hasil;
  }

  /** Distance transform Euclidean (jarak tiap piksel putih ke piksel hitam terdekat). */
  function distanceTransform(c) {
    var w = c.w, h = c.h, INF = 1e20;
    var f = new Float64Array(Math.max(w, h));
    var d = new Float64Array(Math.max(w, h));
    var v = new Int32Array(Math.max(w, h));
    var z = new Float64Array(Math.max(w, h) + 1);
    var grid = new Float64Array(w * h);
    for (var i = 0; i < w * h; i++) grid[i] = c.data[i] === 0 ? 0 : INF;

    function edt1d(n) {
      var k = 0;
      v[0] = 0; z[0] = -INF; z[1] = INF;
      for (var q = 1; q < n; q++) {
        var s;
        do {
          var r = v[k];
          s = (f[q] + q * q - (f[r] + r * r)) / (2 * q - 2 * r);
          if (s <= z[k]) k--;
          else break;
        } while (k >= 0);
        k++;
        v[k] = q; z[k] = s; z[k + 1] = INF;
      }
      k = 0;
      for (var q2 = 0; q2 < n; q2++) {
        while (z[k + 1] < q2) k++;
        var dd = q2 - v[k];
        d[q2] = dd * dd + f[v[k]];
      }
    }
    for (var x = 0; x < w; x++) {
      for (var y = 0; y < h; y++) f[y] = grid[y * w + x];
      edt1d(h);
      for (var y1 = 0; y1 < h; y1++) grid[y1 * w + x] = d[y1];
    }
    for (var y2 = 0; y2 < h; y2++) {
      for (var x2 = 0; x2 < w; x2++) f[x2] = grid[y2 * w + x2];
      edt1d(w);
      for (var x3 = 0; x3 < w; x3++) grid[y2 * w + x3] = Math.sqrt(Math.min(d[x3], 1e12));
    }
    return grid;
  }

  /** Memperkirakan arah goresan di sekitar (x, y) dengan PCA sederhana. */
  function arahGoresan(gt, x, y, r) {
    r = r || 7;
    var xs = [], ys = [];
    for (var yy = Math.max(0, y - r); yy < Math.min(gt.h, y + r + 1); yy++) {
      for (var xx = Math.max(0, x - r); xx < Math.min(gt.w, x + r + 1); xx++) {
        if (gt.data[yy * gt.w + xx] === 255) { xs.push(xx); ys.push(yy); }
      }
    }
    var n = xs.length;
    if (n < 3) return null;
    var mx = 0, my = 0;
    for (var i = 0; i < n; i++) { mx += xs[i]; my += ys[i]; }
    mx /= n; my /= n;
    var a = 0, b = 0, c = 0;
    for (var j = 0; j < n; j++) {
      var dx = xs[j] - mx, dy = ys[j] - my;
      a += dx * dx; b += dx * dy; c += dy * dy;
    }
    var lambda = (a + c) / 2 + Math.sqrt(((a - c) / 2) * ((a - c) / 2) + b * b);
    var vx, vy;
    if (Math.abs(b) < 1e-9) { vx = a >= c ? 1 : 0; vy = a >= c ? 0 : 1; }
    else { vx = b; vy = lambda - a; }
    var panjang = Math.sqrt(vx * vx + vy * vy);
    return [vx / panjang, vy / panjang];
  }

  /** Eksperimen 4: celah kecil yang memotong goresan TEGAK LURUS arah goresan. */
  function noiseGoresanTerputus(gt, jumlah, lebarMaks, seed) {
    var rng = buatRng(seed);
    var hasil = salin(gt);
    var w = gt.w, h = gt.h;
    var dist = distanceTransform(gt);
    var kandidat = [];
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var dv = dist[y * w + x];
        if (dv < 1) continue;
        var maks = 0;
        for (var dy = -2; dy <= 2; dy++) {
          for (var dx = -2; dx <= 2; dx++) {
            var xx = x + dx, yy = y + dy;
            if (xx >= 0 && yy >= 0 && xx < w && yy < h && dist[yy * w + xx] > maks) maks = dist[yy * w + xx];
          }
        }
        if (dv >= maks) kandidat.push(y * w + x); // titik di tengah goresan
      }
    }
    if (kandidat.length === 0) throw new Error("Goresan tidak ditemukan pada citra biner.");
    var dipilih = pilihAcak(rng, kandidat.length, jumlah);
    for (var j = 0; j < dipilih.length; j++) {
      var idx = kandidat[dipilih[j]];
      var px = idx % w, py = Math.floor(idx / w);
      var arah = arahGoresan(gt, px, py, 7);
      var lebar = acakInt(rng, 2, Math.max(2, lebarMaks));
      if (!arah) continue;
      var tegak = [-arah[1], arah[0]];
      var setengah = dist[idx] + 3;
      var p1 = [Math.round(px - tegak[0] * setengah), Math.round(py - tegak[1] * setengah)];
      var p2 = [Math.round(px + tegak[0] * setengah), Math.round(py + tegak[1] * setengah)];
      gambarGaris(hasil, p1, p2, lebar, 0);
    }
    return hasil;
  }

  /* ------------------------------------------------------------------ */
  /* Cell 7 - Evaluasi                                                   */
  /* ------------------------------------------------------------------ */

  /** IoU dan F1-score terhadap ground truth BERSIH (foreground = 255). */
  function hitungMetrik(gt, hasil) {
    if (gt.w !== hasil.w || gt.h !== hasil.h) throw new Error("Ukuran citra harus sama");
    var tp = 0, fp = 0, fn = 0;
    for (var i = 0; i < gt.data.length; i++) {
      var g = gt.data[i] === 255, p = hasil.data[i] === 255;
      if (g && p) tp++;
      else if (!g && p) fp++;
      else if (g && !p) fn++;
    }
    var iou = tp + fp + fn > 0 ? tp / (tp + fp + fn) : 0;
    var f1 = 2 * tp + fp + fn > 0 ? (2 * tp) / (2 * tp + fp + fn) : 0;
    return { iou: iou, f1: f1, tp: tp, fp: fp, fn: fn };
  }

  function hitungForeground(c) {
    var n = 0;
    for (var i = 0; i < c.data.length; i++) if (c.data[i] === 255) n++;
    return n;
  }

  /** Jumlah connected components foreground (konektivitas 8, latar tidak dihitung). */
  function hitungKomponen(c) {
    var w = c.w, h = c.h, label = new Uint8Array(w * h), stack = new Int32Array(w * h), n = 0;
    for (var i = 0; i < w * h; i++) {
      if (c.data[i] !== 255 || label[i]) continue;
      n++;
      var top = 0;
      stack[top++] = i;
      label[i] = 1;
      while (top > 0) {
        var p = stack[--top], x = p % w, y = (p - x) / w;
        for (var dy = -1; dy <= 1; dy++) {
          var yy = y + dy;
          if (yy < 0 || yy >= h) continue;
          for (var dx = -1; dx <= 1; dx++) {
            var xx = x + dx;
            if (xx < 0 || xx >= w) continue;
            var q = yy * w + xx;
            if (c.data[q] === 255 && !label[q]) { label[q] = 1; stack[top++] = q; }
          }
        }
      }
    }
    return n;
  }

  return {
    buatCitra: buatCitra,
    salin: salin,
    buatRng: buatRng,
    keGrayscale: keGrayscale,
    gaussianBlur3: gaussianBlur3,
    ambangOtsu: ambangOtsu,
    binerisasi: binerisasi,
    strukturElemen: strukturElemen,
    erosi: erosi,
    dilasi: dilasi,
    terapkanMorfologi: terapkanMorfologi,
    noiseSaltPepper: noiseSaltPepper,
    noiseBintikPutih: noiseBintikPutih,
    noiseLubangHitam: noiseLubangHitam,
    noiseGoresanTerputus: noiseGoresanTerputus,
    distanceTransform: distanceTransform,
    hitungMetrik: hitungMetrik,
    hitungForeground: hitungForeground,
    hitungKomponen: hitungKomponen,
    OPERASI: OPERASI,
    UKURAN: UKURAN,
    BENTUK: BENTUK
  };
});

/*
 * app.js – antarmuka website MorfoCitra.
 * Menghubungkan tombol/form di index.html dengan fungsi pengolahan citra di morfologi.js.
 */
(function () {
  "use strict";

  var M = window.Morfologi;
  var $ = function (id) { return document.getElementById(id); };

  var NAMA_NOISE = {
    salt_pepper: "Salt-and-pepper",
    bintik_putih: "Bintik putih",
    lubang_hitam: "Lubang hitam",
    goresan_terputus: "Goresan terputus"
  };
  var DAFTAR_NOISE = Object.keys(NAMA_NOISE);
  var TANPA_FILTER = "tanpa filter (noisy)";

  // Seluruh data eksperimen disimpan di sini
  var S = {
    namaFile: null,
    gambar: null,       // elemen gambar/canvas sumber (sebelum diperkecil)
    asli: null,         // canvas citra asli (sudah diperkecil)
    gray: null,         // Uint8Array grayscale
    gt: null,           // ground truth biner (tidak pernah diubah; semua noise memakai salinan)
    noisy: null,        // { nama_noise: citra }
    hasil: null,        // { "noise|op|ukuran|bentuk": citra }
    baris: [],          // baris tabel evaluasi
    teksAnalisis: "",
    tampil: { noise: "salt_pepper", ukuran: 3, bentuk: "persegi" },
    urut: { kolom: "iou", arah: -1 },
    filterTabel: "semua"
  };

  /* ================================================================ */
  /* Utilitas tampilan                                                 */
  /* ================================================================ */

  var jeda = function () { return new Promise(function (r) { setTimeout(r, 0); }); };
  var f4 = function (x) { return Number(x).toFixed(4); };

  /** Citra biner/grayscale -> canvas. */
  function keCanvas(data, w, h) {
    var c = document.createElement("canvas");
    c.width = w; c.height = h;
    var ctx = c.getContext("2d");
    var img = ctx.createImageData(w, h);
    for (var i = 0, p = 0; i < w * h; i++, p += 4) {
      img.data[p] = img.data[p + 1] = img.data[p + 2] = data[i];
      img.data[p + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }
  function citraKeCanvas(c) { return keCanvas(c.data, c.w, c.h); }

  function unduhBlob(blob, nama) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = nama;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function canvasKeBytes(canvas) {
    return new Promise(function (resolve) {
      canvas.toBlob(function (b) {
        b.arrayBuffer().then(function (buf) { resolve(new Uint8Array(buf)); });
      }, "image/png");
    });
  }

  /** Kartu gambar yang bisa diklik untuk diunduh. */
  function kartuGambar(canvas, judul, meta, namaFile, acuan) {
    var d = document.createElement("div");
    d.className = "gambar-kartu" + (acuan ? " acuan" : "");
    d.title = "Klik untuk mengunduh " + namaFile;
    d.appendChild(canvas);
    var j = document.createElement("div"); j.className = "judul"; j.textContent = judul; d.appendChild(j);
    if (meta) { var m = document.createElement("div"); m.className = "meta"; m.innerHTML = meta; d.appendChild(m); }
    d.addEventListener("click", function () {
      canvas.toBlob(function (b) { unduhBlob(b, namaFile); }, "image/png");
    });
    return d;
  }

  function kunci(id, terkunci) { $(id).classList.toggle("terkunci", terkunci); }

  function info(el, html, peringatan) {
    el.hidden = false;
    el.className = "info" + (peringatan ? " peringatan" : "");
    el.innerHTML = html;
  }

  async function muatFont() {
    try {
      if (document.fonts) {
        await document.fonts.load("800 40px Montserrat");
        await document.fonts.ready;
      }
    } catch (e) { /* tanpa internet: pakai font cadangan */ }
  }

  /** Menggambar teks hitam di latar putih lalu mengubahnya menjadi citra biner (tulisan putih). */
  function teksKeBiner(teks, w, h, ukuranFont) {
    var c = document.createElement("canvas");
    c.width = w; c.height = h;
    var ctx = c.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#000";
    ctx.font = "800 " + ukuranFont + "px Montserrat, Arial, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(teks, w / 2, h / 2 + ukuranFont * 0.04);
    var rgba = ctx.getImageData(0, 0, w, h).data;
    var b = M.buatCitra(w, h);
    for (var i = 0; i < w * h; i++) b.data[i] = rgba[i * 4] < 128 ? 255 : 0;
    return b;
  }

  /* ================================================================ */
  /* Ilustrasi kecil (hero, tentang, kartu operasi)                    */
  /* ================================================================ */

  function gambarKe(canvasTujuan, citra) {
    canvasTujuan.width = citra.w; canvasTujuan.height = citra.h;
    canvasTujuan.getContext("2d").drawImage(citraKeCanvas(citra), 0, 0);
  }

  function buatNoiseKecil(gt, jenis, seed) {
    switch (jenis) {
      case "salt_pepper": return M.noiseSaltPepper(gt, 0.06, seed);
      case "bintik_putih": return M.noiseBintikPutih(gt, 40, 1, seed);
      case "lubang_hitam": return M.noiseLubangHitam(gt, 25, 1, seed);
      default: return M.noiseGoresanTerputus(gt, 8, 2, seed);
    }
  }

  async function ilustrasi() {
    await muatFont();
    // Hero: bintik putih -> opening
    var gtHero = teksKeBiner("Aa", 90, 45, 38);
    var nHero = M.noiseBintikPutih(gtHero, 45, 1, 7);
    gambarKe($("heroNoisy"), nHero);
    gambarKe($("heroBersih"), M.terapkanMorfologi(nHero, "opening", 3, "persegi"));

    // Bagian tentang: citra biner bersih
    gambarKe($("ilustrasiTentang"), teksKeBiner("PCD", 96, 60, 40));

    // Kartu operasi: separuh kiri noisy, separuh kanan hasil operasi
    document.querySelectorAll("canvas.mini").forEach(function (cv, i) {
      var gt = teksKeBiner("Ab", 76, 48, 40);
      var noisy = buatNoiseKecil(gt, cv.dataset.noise, 11 + i);
      var hasil = M.terapkanMorfologi(noisy, cv.dataset.op, 3, "persegi");
      cv.width = 76 * 2 + 4; cv.height = 48;
      var ctx = cv.getContext("2d");
      ctx.fillStyle = "#9dbb83"; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.drawImage(citraKeCanvas(noisy), 0, 0);
      ctx.drawImage(citraKeCanvas(hasil), 80, 0);
    });
  }

  /* ================================================================ */
  /* Langkah 1 – Upload & preprocessing                                */
  /* ================================================================ */

  function bacaFile(file) {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      info($("infoPre"), "File <strong>" + file.name + "</strong> bukan gambar. Gunakan format jpg/png.", true);
      return;
    }
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      S.namaFile = file.name;
      S.gambar = img;
      $("labelCepat").textContent = file.name;
      proses();
    };
    img.onerror = function () {
      info($("infoPre"), "File <strong>" + file.name + "</strong> tidak bisa dibaca sebagai gambar.", true);
    };
    img.src = url;
  }

  async function pakaiContoh() {
    await muatFont();
    var c = document.createElement("canvas");
    c.width = 800; c.height = 300;
    var ctx = c.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 800, 300);
    ctx.fillStyle = "#111";
    ctx.font = "800 140px Montserrat, Arial, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("HALO ABC", 400, 155);
    S.namaFile = "contoh_sintetis.png";
    S.gambar = c;
    $("labelCepat").textContent = "contoh_sintetis.png";
    proses();
  }

  function proses() {
    if (!S.gambar) return;
    var sw = S.gambar.naturalWidth || S.gambar.width;
    var sh = S.gambar.naturalHeight || S.gambar.height;
    var maks = Math.max(100, parseInt($("maksLebar").value, 10) || 800);
    var skala = sw > maks ? maks / sw : 1;
    var w = Math.max(1, Math.round(sw * skala)), h = Math.max(1, Math.round(sh * skala));

    var asli = document.createElement("canvas");
    asli.width = w; asli.height = h;
    var ctx = asli.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(S.gambar, 0, 0, w, h);
    var rgba;
    try {
      rgba = ctx.getImageData(0, 0, w, h).data;
    } catch (e) {
      info($("infoPre"), "Gambar tidak bisa diproses: " + e.message, true);
      return;
    }

    var pilih = $("pilihInversi").value;
    var paksa = pilih === "auto" ? null : pilih === "true";
    S.asli = asli;
    S.gray = M.keGrayscale(rgba, w, h);
    var pre = M.binerisasi(S.gray, w, h, paksa);
    S.gt = pre.biner;

    var rasioSekarang = M.hitungForeground(S.gt) / (w * h);
    var pesan =
      "<strong>File:</strong> " + S.namaFile + " &nbsp;·&nbsp; <strong>Dimensi:</strong> " + w + " × " + h +
      " &nbsp;·&nbsp; <strong>Ambang Otsu:</strong> " + pre.ambang +
      " &nbsp;·&nbsp; <strong>Rasio putih sebelum inversi:</strong> " + pre.rasioPutih.toFixed(3) +
      " &nbsp;·&nbsp; <strong>Inversi:</strong> " + (pre.inversi ? "ya" : "tidak") +
      " &nbsp;·&nbsp; <strong>Rasio tulisan:</strong> " + rasioSekarang.toFixed(3);
    var curiga = rasioSekarang > 0.45;
    if (curiga) pesan += "<br/>⚠️ Tulisan terlihat terlalu banyak. Mungkin hasilnya terbalik; coba ubah pilihan <em>Inversi</em>.";
    info($("infoPre"), pesan, curiga);

    var g = $("galeriPre");
    g.innerHTML = "";
    var dasar = S.namaFile.replace(/\.[^.]+$/, "");
    var salinAsli = document.createElement("canvas");
    salinAsli.width = w; salinAsli.height = h;
    salinAsli.getContext("2d").drawImage(asli, 0, 0);
    g.appendChild(kartuGambar(salinAsli, "Citra asli", w + " × " + h + " px", dasar + "_asli.png"));
    g.appendChild(kartuGambar(keCanvas(S.gray, w, h), "Grayscale", "uint8, 0–255", dasar + "_grayscale.png"));
    g.appendChild(kartuGambar(citraKeCanvas(S.gt), "Citra biner (ground truth)",
      "Huruf harus putih di latar hitam", "ground_truth.png", true));

    // Reset langkah berikutnya
    S.noisy = null; S.hasil = null; S.baris = [];
    $("galeriNoise").innerHTML = "";
    $("penampil").hidden = true;
    kunci("langkah2", false);
    kunci("langkah3", true); kunci("hasil", true); kunci("langkah5", true);
  }

  /* ================================================================ */
  /* Langkah 2 – Noise sintetis                                        */
  /* ================================================================ */

  function angka(id, cadangan) {
    var v = parseFloat($(id).value);
    return isNaN(v) ? cadangan : v;
  }

  function buatNoise() {
    if (!S.gt) return;
    var seed = Math.round(angka("paramSeed", 42));
    try {
      S.noisy = {
        salt_pepper: M.noiseSaltPepper(S.gt, angka("paramP", 0.03), seed),
        bintik_putih: M.noiseBintikPutih(S.gt, Math.round(angka("paramBintik", 150)), Math.round(angka("paramRBintik", 2)), seed + 1),
        lubang_hitam: M.noiseLubangHitam(S.gt, Math.round(angka("paramLubang", 200)), Math.round(angka("paramRLubang", 2)), seed + 2),
        goresan_terputus: M.noiseGoresanTerputus(S.gt, Math.round(angka("paramCelah", 30)), Math.round(angka("paramLebarCelah", 3)), seed + 3)
      };
    } catch (e) {
      $("galeriNoise").innerHTML = '<div class="info peringatan">Gagal membuat noise: ' + e.message + "</div>";
      return;
    }
    var g = $("galeriNoise");
    g.innerHTML = "";
    g.appendChild(kartuGambar(citraKeCanvas(S.gt), "Ground truth", "acuan bersih", "ground_truth.png", true));
    DAFTAR_NOISE.forEach(function (n) {
      var c = S.noisy[n];
      var berubah = 0;
      for (var i = 0; i < c.data.length; i++) if (c.data[i] !== S.gt.data[i]) berubah++;
      var m = M.hitungMetrik(S.gt, c);
      g.appendChild(kartuGambar(citraKeCanvas(c), "Noisy: " + NAMA_NOISE[n],
        "IoU " + f4(m.iou) + " · " + berubah.toLocaleString("id-ID") + " piksel berubah", "noisy_" + n + ".png"));
    });

    S.hasil = null; S.baris = [];
    $("penampil").hidden = true;
    kunci("langkah3", false); kunci("hasil", true); kunci("langkah5", true);
  }

  /* ================================================================ */
  /* Langkah 3 – Morphological filtering (64 konfigurasi)              */
  /* ================================================================ */

  function kunciHasil(n, op, u, b) { return n + "|" + op + "|" + u + "|" + b; }

  function barisDari(n, op, u, b, citra) {
    var m = M.hitungMetrik(S.gt, citra);
    return {
      noise: n, op: op,
      ukuran: u ? u + "x" + u : "-", bentuk: b || "-",
      foreground: M.hitungForeground(citra),
      komponen: M.hitungKomponen(citra),
      iou: m.iou, f1: m.f1
    };
  }

  async function jalankanFilter() {
    if (!S.noisy) return;
    var tombol = $("tombolFilter");
    tombol.disabled = true;
    $("progres").hidden = false;
    S.hasil = {};
    S.baris = [];

    // Baris pembanding: noisy tanpa filtering
    DAFTAR_NOISE.forEach(function (n) { S.baris.push(barisDari(n, TANPA_FILTER, null, null, S.noisy[n])); });

    var total = DAFTAR_NOISE.length * M.OPERASI.length * M.UKURAN.length * M.BENTUK.length;
    var selesai = 0;
    for (var a = 0; a < DAFTAR_NOISE.length; a++) {
      for (var o = 0; o < M.OPERASI.length; o++) {
        for (var u = 0; u < M.UKURAN.length; u++) {
          for (var b = 0; b < M.BENTUK.length; b++) {
            var n = DAFTAR_NOISE[a], op = M.OPERASI[o], uk = M.UKURAN[u], bt = M.BENTUK[b];
            var h = M.terapkanMorfologi(S.noisy[n], op, uk, bt);
            S.hasil[kunciHasil(n, op, uk, bt)] = h;
            S.baris.push(barisDari(n, op, uk, bt, h));
            selesai++;
            var persen = Math.round((selesai / total) * 100);
            $("progresIsi").style.width = persen + "%";
            $("progresTeks").textContent = selesai + " / " + total;
            await jeda();
          }
        }
      }
    }
    tombol.disabled = false;
    tombol.textContent = "Jalankan Ulang";

    $("penampil").hidden = false;
    buatTab();
    tampilkanPerbandingan();
    kunci("hasil", false); kunci("langkah5", false);
    isiPilihanFilter();
    tampilkanTerbaik();
    tampilkanTabel();
    tampilkanAnalisis();
  }

  function buatTab() {
    var t = $("tabNoise");
    t.innerHTML = "";
    DAFTAR_NOISE.forEach(function (n) {
      var btn = document.createElement("button");
      btn.textContent = NAMA_NOISE[n];
      btn.dataset.v = n;
      if (n === S.tampil.noise) btn.classList.add("aktif");
      btn.addEventListener("click", function () {
        S.tampil.noise = n;
        t.querySelectorAll("button").forEach(function (x) { x.classList.toggle("aktif", x === btn); });
        tampilkanPerbandingan();
      });
      t.appendChild(btn);
    });
  }

  function segmen(id, kunciTampil, ubah) {
    $(id).querySelectorAll("button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        S.tampil[kunciTampil] = ubah(btn.dataset.v);
        $(id).querySelectorAll("button").forEach(function (x) { x.classList.toggle("aktif", x === btn); });
        tampilkanPerbandingan();
      });
    });
  }

  function tampilkanKernel() {
    var se = M.strukturElemen(S.tampil.ukuran, S.tampil.bentuk);
    var html = '<div class="grid-k" style="grid-template-columns:repeat(' + se.ukuran + ',10px)">';
    for (var i = 0; i < se.matriks.length; i++) html += "<i" + (se.matriks[i] ? ' class="on"' : "") + "></i>";
    html += "</div><span>Structuring element " + se.ukuran + "×" + se.ukuran + " " + se.bentuk + "</span>";
    $("kernelVis").innerHTML = html;
  }

  function cariBaris(n, op, u, b) {
    var uk = u ? u + "x" + u : "-";
    for (var i = 0; i < S.baris.length; i++) {
      var r = S.baris[i];
      if (r.noise === n && r.op === op && r.ukuran === uk && r.bentuk === (b || "-")) return r;
    }
    return null;
  }

  function tampilkanPerbandingan() {
    if (!S.hasil) return;
    tampilkanKernel();
    var n = S.tampil.noise, u = S.tampil.ukuran, b = S.tampil.bentuk;
    var g = $("galeriFilter");
    g.innerHTML = "";
    var dasar = cariBaris(n, TANPA_FILTER);
    g.appendChild(kartuGambar(citraKeCanvas(S.gt), "Ground truth (biner asli)",
      "komponen " + M.hitungKomponen(S.gt), "ground_truth.png", true));
    g.appendChild(kartuGambar(citraKeCanvas(S.noisy[n]), "Noisy: " + NAMA_NOISE[n],
      "IoU " + f4(dasar.iou) + " · F1 " + f4(dasar.f1) + " · komponen " + dasar.komponen, "noisy_" + n + ".png"));
    M.OPERASI.forEach(function (op) {
      var r = cariBaris(n, op, u, b);
      var selisih = r.iou - dasar.iou;
      var kelas = selisih > 0 ? "naik" : "turun-teks";
      var meta = "IoU " + f4(r.iou) + ' <span class="' + kelas + '">(' + (selisih >= 0 ? "+" : "") + f4(selisih) + ")</span> · F1 " +
        f4(r.f1) + " · komponen " + r.komponen;
      g.appendChild(kartuGambar(citraKeCanvas(S.hasil[kunciHasil(n, op, u, b)]),
        op.charAt(0).toUpperCase() + op.slice(1), meta, "filter_" + n + "_" + op + "_" + u + "x" + u + "_" + b + ".png"));
    });
  }

  /* ================================================================ */
  /* Langkah 4 – Evaluasi                                              */
  /* ================================================================ */

  function barisFilter() { return S.baris.filter(function (r) { return r.op !== TANPA_FILTER; }); }

  function terbaikPerNoise() {
    var hasil = {};
    barisFilter().forEach(function (r) {
      var t = hasil[r.noise];
      if (!t || r.iou > t.iou || (r.iou === t.iou && r.f1 > t.f1)) hasil[r.noise] = r;
    });
    return hasil;
  }

  function tampilkanTerbaik() {
    var terbaik = terbaikPerNoise();
    var wadah = $("kartuTerbaik");
    wadah.innerHTML = "";
    DAFTAR_NOISE.forEach(function (n) {
      var r = terbaik[n], dasar = cariBaris(n, TANPA_FILTER);
      var selisih = r.iou - dasar.iou;
      var d = document.createElement("div");
      d.className = "kt" + (selisih > 0 ? "" : " turun");
      d.innerHTML =
        "<h4>" + NAMA_NOISE[n] + "</h4>" +
        '<div class="angka">' + f4(r.iou) + "</div>" +
        '<div class="konf">' + r.op + " · " + r.ukuran + " " + r.bentuk + "</div>" +
        '<div class="delta ' + (selisih > 0 ? "naik" : "turun-teks") + '">' +
        (selisih > 0 ? "▲ +" : "▼ ") + f4(selisih) + " dari noisy (" + f4(dasar.iou) + ")</div>";
      wadah.appendChild(d);
    });
  }

  var KOLOM = [
    { k: "noise", judul: "Jenis noise" },
    { k: "op", judul: "Operasi morfologi" },
    { k: "ukuran", judul: "Ukuran kernel" },
    { k: "bentuk", judul: "Bentuk kernel" },
    { k: "foreground", judul: "Piksel foreground", angka: true },
    { k: "komponen", judul: "Connected components", angka: true },
    { k: "iou", judul: "IoU", angka: true, f: f4 },
    { k: "f1", judul: "F1-score", angka: true, f: f4 }
  ];

  function isiPilihanFilter() {
    var sel = $("filterTabel");
    sel.innerHTML = '<option value="semua">Semua jenis noise</option>';
    DAFTAR_NOISE.forEach(function (n) {
      var o = document.createElement("option");
      o.value = n; o.textContent = NAMA_NOISE[n];
      sel.appendChild(o);
    });
    sel.value = S.filterTabel;
  }

  function barisTerurut() {
    var k = S.urut.kolom, a = S.urut.arah;
    return S.baris.slice().sort(function (x, y) {
      var vx = x[k], vy = y[k];
      if (vx === vy) return (y.f1 - x.f1);
      return (vx > vy ? 1 : -1) * a;
    });
  }

  function tampilkanTabel() {
    var thead = $("tabel").querySelector("thead");
    var tbody = $("tabel").querySelector("tbody");
    thead.innerHTML = "<tr>" + KOLOM.map(function (c) {
      var panah = S.urut.kolom === c.k ? (S.urut.arah > 0 ? " ▲" : " ▼") : "";
      return '<th data-k="' + c.k + '">' + c.judul + panah + "</th>";
    }).join("") + "</tr>";
    thead.querySelectorAll("th").forEach(function (th) {
      th.addEventListener("click", function () {
        var k = th.dataset.k;
        if (S.urut.kolom === k) S.urut.arah *= -1;
        else { S.urut.kolom = k; S.urut.arah = (k === "iou" || k === "f1") ? -1 : 1; }
        tampilkanTabel();
      });
    });
    var data = barisTerurut().filter(function (r) { return S.filterTabel === "semua" || r.noise === S.filterTabel; });
    tbody.innerHTML = data.map(function (r) {
      return '<tr class="' + (r.op === TANPA_FILTER ? "dasar" : "") + '">' + KOLOM.map(function (c) {
        var v = c.k === "noise" ? NAMA_NOISE[r.noise] : r[c.k];
        if (c.f) v = c.f(v);
        else if (c.angka) v = Number(v).toLocaleString("id-ID");
        return "<td" + (c.angka ? ' class="angka"' : "") + ">" + v + "</td>";
      }).join("") + "</tr>";
    }).join("");
  }

  function buatCsv() {
    var kepala = ["Jenis noise", "Operasi morfologi", "Ukuran kernel", "Bentuk kernel",
      "Jumlah piksel foreground", "Jumlah connected components", "IoU", "F1-score"];
    var data = S.baris.slice().sort(function (x, y) { return y.iou - x.iou || y.f1 - x.f1; });
    var baris = data.map(function (r) {
      return [r.noise, r.op, r.ukuran, r.bentuk, r.foreground, r.komponen, f4(r.iou), f4(r.f1)].join(",");
    });
    return kepala.join(",") + "\n" + baris.join("\n") + "\n";
  }

  /* ================================================================ */
  /* Langkah 5 – Analisis otomatis (setara Cell 9)                     */
  /* ================================================================ */

  function tabelHtml(kepala, isi) {
    return '<div class="tabel-wadah" style="max-height:none;margin:.6rem 0"><table class="mini-tabel"><thead><tr>' +
      kepala.map(function (k) { return "<th>" + k + "</th>"; }).join("") + "</tr></thead><tbody>" +
      isi.map(function (b) { return "<tr>" + b.map(function (v) { return "<td>" + v + "</td>"; }).join("") + "</tr>"; }).join("") +
      "</tbody></table></div>";
  }

  function tampilkanAnalisis() {
    var terbaik = terbaikPerNoise();
    var filter = barisFilter();
    var kompGt = M.hitungKomponen(S.gt);
    var html = "", teks = [];
    var garis = "======================================================================";

    // 1. Konfigurasi terbaik
    teks.push(garis, "1. KONFIGURASI DENGAN IoU / F1-SCORE TERTINGGI PER JENIS NOISE", garis);
    var isi1 = DAFTAR_NOISE.map(function (n) {
      var r = terbaik[n], d = cariBaris(n, TANPA_FILTER), s = r.iou - d.iou;
      teks.push("- " + n + ": " + r.op + " " + r.ukuran + " " + r.bentuk + " | IoU " + f4(r.iou) + " | F1 " + f4(r.f1) +
        " | IoU noisy " + f4(d.iou) + " | selisih " + (s >= 0 ? "+" : "") + f4(s));
      return [NAMA_NOISE[n], r.op, r.ukuran, r.bentuk, f4(r.iou), f4(r.f1), f4(d.iou),
        '<span class="' + (s > 0 ? "naik" : "turun-teks") + '">' + (s >= 0 ? "+" : "") + f4(s) + "</span>"];
    });
    html += "<h4>1. Konfigurasi terbaik per jenis noise</h4>" +
      tabelHtml(["Jenis noise", "Operasi", "Ukuran", "Bentuk", "IoU", "F1", "IoU noisy", "Selisih IoU"], isi1);

    // 2. 3x3 vs 5x5
    teks.push("", garis, "2. PERBANDINGAN KERNEL 3x3 vs 5x5 (IoU tertinggi di antara bentuk kernel)", garis);
    var isi2 = [];
    DAFTAR_NOISE.forEach(function (n) {
      M.OPERASI.forEach(function (op) {
        var maks = { "3x3": -1, "5x5": -1 };
        filter.forEach(function (r) { if (r.noise === n && r.op === op && r.iou > maks[r.ukuran]) maks[r.ukuran] = r.iou; });
        var s = maks["5x5"] - maks["3x3"];
        var lebih = s > 0 ? "5x5" : s < 0 ? "3x3" : "sama";
        isi2.push([NAMA_NOISE[n], op, f4(maks["3x3"]), f4(maks["5x5"]), (s >= 0 ? "+" : "") + f4(s), lebih]);
        teks.push("- " + n + " / " + op + ": 3x3=" + f4(maks["3x3"]) + ", 5x5=" + f4(maks["5x5"]) + " -> lebih baik: " + lebih);
      });
    });
    html += "<h4>2. Perbandingan kernel 3×3 vs 5×5</h4>" +
      tabelHtml(["Jenis noise", "Operasi", "IoU 3×3", "IoU 5×5", "Selisih (5×5 − 3×3)", "Lebih baik"], isi2);

    // 3. Lebih bersih tetapi IoU turun
    var iouTurun = 0, rusak = [];
    filter.forEach(function (r) {
      var d = cariBaris(r.noise, TANPA_FILTER);
      var turun = r.iou < d.iou;
      if (turun) iouTurun++;
      var lebihBersih = Math.abs(r.komponen - kompGt) < Math.abs(d.komponen - kompGt);
      if (turun && lebihBersih) rusak.push({ r: r, d: d });
    });
    rusak.sort(function (a, b) { return a.r.iou - b.r.iou; });
    teks.push("", garis, "3. KASUS 'LEBIH BERSIH' TETAPI KESESUAIAN DENGAN GROUND TRUTH TURUN", garis,
      "Jumlah konfigurasi: " + rusak.length + " dari " + filter.length,
      "Total konfigurasi yang menurunkan IoU dibanding noisy: " + iouTurun);
    html += "<h4>3. Kasus “lebih bersih” tetapi IoU turun</h4>" +
      "<p>Jumlah komponen lebih dekat ke ground truth (" + kompGt + " komponen), namun IoU lebih rendah dari citra noisy: <strong>" +
      rusak.length + " dari " + filter.length + "</strong> konfigurasi. Total konfigurasi yang menurunkan IoU: <strong>" + iouTurun + "</strong>.</p>";
    if (rusak.length) {
      html += tabelHtml(["Jenis noise", "Operasi", "Ukuran", "Bentuk", "Komponen", "IoU", "IoU noisy"],
        rusak.slice(0, 10).map(function (x) {
          return [NAMA_NOISE[x.r.noise], x.r.op, x.r.ukuran, x.r.bentuk, x.r.komponen, f4(x.r.iou), f4(x.d.iou)];
        }));
    }
    html += "<p class='catatan'>Buka gambar perbandingan untuk memeriksa apakah huruf menipis, hilang, atau menyatu.</p>";

    // 4. Keterbatasan
    teks.push("", garis, "4. KETERBATASAN: sisa selisih dari ground truth pada konfigurasi terbaik", garis);
    html += "<h4>4. Keterbatasan</h4><ul>";
    DAFTAR_NOISE.forEach(function (n) {
      var r = terbaik[n];
      teks.push("- " + n + ": IoU terbaik = " + f4(r.iou) + " -> masih ada selisih " + f4(1 - r.iou) + " dari citra asli.");
      html += "<li><strong>" + NAMA_NOISE[n] + "</strong>: IoU terbaik " + f4(r.iou) + ", masih ada selisih " + f4(1 - r.iou) + " dari citra asli.</li>";
    });
    html += "</ul><p>Periksa secara visual dan diskusikan:</p><ol type='a'>" +
      "<li>Pada noise mana IoU terbaik masih rendah? Apakah noise menyerupai goresan huruf?</li>" +
      "<li>Apakah kernel 5×5 menghapus bagian huruf yang tipis atau menyatukan huruf berdekatan?</li>" +
      "<li>Apakah celah yang lebih lebar dari kernel tetap tidak tersambung oleh closing?</li></ol>";
    teks.push("a. Pada noise mana IoU terbaik masih rendah? Apakah noise menyerupai goresan huruf?",
      "b. Apakah kernel 5x5 menghapus bagian huruf yang tipis atau menyatukan huruf berdekatan?",
      "c. Apakah celah yang lebih lebar dari kernel tetap tidak tersambung oleh closing?");

    // 5. Draft kesimpulan
    var kalimat = DAFTAR_NOISE.map(function (n) {
      var r = terbaik[n], d = cariBaris(n, TANPA_FILTER), s = r.iou - d.iou;
      if (s > 0) {
        return "Pada noise '" + n + "', konfigurasi terbaik adalah " + r.op + " kernel " + r.ukuran + " bentuk " + r.bentuk +
          " dengan IoU " + f4(r.iou) + " dan F1-score " + f4(r.f1) + ", naik dari IoU citra noisy " + f4(d.iou) +
          " (peningkatan " + f4(s) + ").";
      }
      return "Pada noise '" + n + "', tidak ada konfigurasi yang melampaui IoU citra noisy (" + f4(d.iou) +
        "); filtering tidak memperbaiki kesesuaian piksel pada kondisi ini.";
    });
    kalimat.push("Sebanyak " + iouTurun + " dari " + filter.length +
      " konfigurasi justru menurunkan IoU dibanding citra noisy, sehingga pemilihan operasi harus disesuaikan dengan jenis noise.");
    kalimat.push("Kesimpulan akhir harus dikonfirmasi dengan pemeriksaan visual terhadap gambar perbandingan.");
    teks.push("", garis, "5. DRAFT KESIMPULAN (disusun otomatis dari angka; edit setelah memeriksa gambar)", garis);
    kalimat.forEach(function (k, i) { teks.push((i + 1) + ". " + k); });
    html += "<h4>5. Draft kesimpulan</h4><ol>" + kalimat.map(function (k) { return "<li>" + k + "</li>"; }).join("") + "</ol>";

    $("analisis").innerHTML = html;
    S.teksAnalisis =
      "Analisis Morphological Filtering – " + S.namaFile + "\n" +
      "Parameter noise: p=" + $("paramP").value + ", bintik=" + $("paramBintik").value + " (r<=" + $("paramRBintik").value +
      "), lubang=" + $("paramLubang").value + " (r<=" + $("paramRLubang").value + "), celah=" + $("paramCelah").value +
      " (lebar<=" + $("paramLebarCelah").value + "), seed=" + $("paramSeed").value + "\n\n" + teks.join("\n") + "\n";
  }

  /* ================================================================ */
  /* Unduh ZIP                                                         */
  /* ================================================================ */

  /** Gambar perbandingan 2x3 (setara perbandingan_*.png di Colab). */
  function buatPerbandingan(n, u, b) {
    var skala = Math.min(1, 420 / S.gt.w);
    var cw = Math.round(S.gt.w * skala), ch = Math.round(S.gt.h * skala);
    var pad = 14, label = 26, atas = 46;
    var c = document.createElement("canvas");
    c.width = pad + 3 * (cw + pad);
    c.height = atas + 2 * (ch + label + pad);
    var ctx = c.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#22301d";
    ctx.font = "700 18px Montserrat, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(n + " | kernel " + u + "x" + u + " " + b, c.width / 2, 30);
    var daftar = [["Ground truth (biner asli)", S.gt], ["Noisy: " + n, S.noisy[n]]];
    M.OPERASI.forEach(function (op) {
      var r = cariBaris(n, op, u, b);
      daftar.push([op.charAt(0).toUpperCase() + op.slice(1) + "  (IoU " + f4(r.iou) + ")", S.hasil[kunciHasil(n, op, u, b)]]);
    });
    ctx.font = "600 13px Montserrat, Arial, sans-serif";
    daftar.forEach(function (item, i) {
      var x = pad + (i % 3) * (cw + pad);
      var y = atas + Math.floor(i / 3) * (ch + label + pad);
      ctx.fillStyle = "#22301d";
      ctx.fillText(item[0], x + cw / 2, y + 16);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(citraKeCanvas(item[1]), x, y + label, cw, ch);
    });
    return c;
  }

  async function unduhZip() {
    if (!S.hasil) return;
    var tombol = $("unduhZip");
    var teksAwal = tombol.textContent;
    tombol.disabled = true;
    tombol.textContent = "Menyiapkan ZIP…";
    try {
      var enc = new TextEncoder();
      var berkas = [];
      berkas.push({ nama: "ground_truth.png", data: await canvasKeBytes(citraKeCanvas(S.gt)) });
      for (var a = 0; a < DAFTAR_NOISE.length; a++) {
        var n = DAFTAR_NOISE[a];
        berkas.push({ nama: "noisy_" + n + ".png", data: await canvasKeBytes(citraKeCanvas(S.noisy[n])) });
      }
      var kunciSemua = Object.keys(S.hasil);
      for (var i = 0; i < kunciSemua.length; i++) {
        var p = kunciSemua[i].split("|");
        berkas.push({
          nama: "filter_" + p[0] + "_" + p[1] + "_" + p[2] + "x" + p[2] + "_" + p[3] + ".png",
          data: await canvasKeBytes(citraKeCanvas(S.hasil[kunciSemua[i]]))
        });
        tombol.textContent = "Menyiapkan ZIP… " + Math.round((i / kunciSemua.length) * 80) + "%";
      }
      for (var x = 0; x < DAFTAR_NOISE.length; x++) {
        for (var y = 0; y < M.UKURAN.length; y++) {
          for (var z = 0; z < M.BENTUK.length; z++) {
            var nm = DAFTAR_NOISE[x], uk = M.UKURAN[y], bt = M.BENTUK[z];
            berkas.push({
              nama: "perbandingan_" + nm + "_" + uk + "x" + uk + "_" + bt + ".png",
              data: await canvasKeBytes(buatPerbandingan(nm, uk, bt))
            });
          }
        }
      }
      berkas.push({ nama: "evaluasi_morfologi.csv", data: enc.encode(buatCsv()) });
      berkas.push({ nama: "analisis_kesimpulan.txt", data: enc.encode(S.teksAnalisis) });
      unduhBlob(window.BuatZip(berkas), "hasil_morfologi.zip");
    } catch (e) {
      alertRingan("Gagal membuat ZIP: " + e.message);
    }
    tombol.disabled = false;
    tombol.textContent = teksAwal;
  }

  function alertRingan(pesan) {
    var el = document.createElement("div");
    el.className = "info peringatan";
    el.textContent = pesan;
    $("hasil").appendChild(el);
    setTimeout(function () { el.remove(); }, 6000);
  }

  /* ================================================================ */
  /* Event listener                                                    */
  /* ================================================================ */

  function pasang() {
    // Navbar
    $("hamburger").addEventListener("click", function () { $("menu").classList.toggle("buka"); });
    document.querySelectorAll("#menu a").forEach(function (a) {
      a.addEventListener("click", function () { $("menu").classList.remove("buka"); });
    });
    window.addEventListener("scroll", function () {
      $("navbar").classList.toggle("melayang", window.scrollY > 120);
    });

    // Upload
    var zona = $("zonaUpload");
    zona.addEventListener("click", function () { $("inputGambar").click(); });
    $("inputGambar").addEventListener("change", function (e) { bacaFile(e.target.files[0]); e.target.value = ""; });
    $("inputCepat").addEventListener("change", function (e) {
      bacaFile(e.target.files[0]); e.target.value = "";
      location.hash = "#eksperimen";
    });
    ["dragenter", "dragover"].forEach(function (ev) {
      zona.addEventListener(ev, function (e) { e.preventDefault(); zona.classList.add("seret"); });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      zona.addEventListener(ev, function (e) { e.preventDefault(); zona.classList.remove("seret"); });
    });
    zona.addEventListener("drop", function (e) { bacaFile(e.dataTransfer.files[0]); });

    $("tombolContoh").addEventListener("click", pakaiContoh);
    $("tombolContohCepat").addEventListener("click", function () {
      pakaiContoh();
      location.hash = "#eksperimen";
    });
    $("pilihInversi").addEventListener("change", proses);
    $("maksLebar").addEventListener("change", proses);

    // Noise
    $("paramP").addEventListener("input", function () { $("outP").textContent = Number(this.value).toFixed(3); });
    $("tombolNoise").addEventListener("click", buatNoise);

    // Filtering
    $("tombolFilter").addEventListener("click", jalankanFilter);
    segmen("segUkuran", "ukuran", function (v) { return parseInt(v, 10); });
    segmen("segBentuk", "bentuk", function (v) { return v; });

    // Evaluasi & unduhan
    $("filterTabel").addEventListener("change", function () { S.filterTabel = this.value; tampilkanTabel(); });
    $("unduhCsv").addEventListener("click", function () {
      unduhBlob(new Blob([buatCsv()], { type: "text/csv" }), "evaluasi_morfologi.csv");
    });
    $("unduhZip").addEventListener("click", unduhZip);
    $("unduhTxt").addEventListener("click", function () {
      unduhBlob(new Blob([S.teksAnalisis], { type: "text/plain" }), "analisis_kesimpulan.txt");
    });
  }

  pasang();
  ilustrasi();
})();

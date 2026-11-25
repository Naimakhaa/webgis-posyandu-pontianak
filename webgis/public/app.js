// =====================================================
// SK-4 Frontend Interaktif - SIG Posyandu Kota Pontianak
// =====================================================

// ---------- STATE ----------
const state = {
  filters: { imunisasi: true, gizi: true, kb: true, lainnya: true },
  cluster: false
};

// ---------- KONFIGURASI ----------
// Data posyandu: mencoba ambil dari API (SK-3).
// Jika API belum siap/belum dijalankan, otomatis memakai file GeoJSON asli di public/data/.
const API_URL = '/api/data/posyandu';
const FALLBACK_URL = 'data/posyandu_pontianak.geojson';

const COLORS = {
  imunisasi: '#d64545',
  gizi: '#2f9e5b',
  kb: '#2f6fb5',
  lainnya: '#e0951f'
};

let allFeatures = [];

// Label nama di peta (dinyalakan lewat checkbox "Tampilkan label fasilitas")
let tampilLabel = false;
// Label hanya untuk posyandu dengan tenaga_kesehatan >= nilai ini.
// Isi 3 jika ingin sama dengan QGIS (tenaga_kesehatan > 2).
const LABEL_MIN_NAKES = 0;
// Marker yang sedang punya label (dipakai untuk mengatur label yang saling bertumpuk)
let daftarLabel = [];

// ---------- PETA ----------
const map = L.map('map').setView([-0.0263, 109.3425], 12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Urutan tumpukan layer (angka kecil = di bawah). Titik posyandu selalu paling atas.
[['pPermukiman', 410], ['pZona', 415], ['pBatas', 420], ['pJalan', 430], ['pTitik', 450]]
  .forEach(function (p) { map.createPane(p[0]).style.zIndex = p[1]; });

const plainLayer = L.layerGroup();

const clusterLayer = L.markerClusterGroup({
  showCoverageOnHover: false,
  iconCreateFunction: function (cluster) {
    const n = cluster.getChildCount();
    const size = n < 10 ? 34 : n < 25 ? 42 : 50;
    return L.divIcon({
      html: '<span>' + n + '</span>',
      className: 'cluster-icon',
      iconSize: [size, size]
    });
  }
});

// ---------- FUNGSI BANTU ----------
function kategori(layanan) {
  const s = String(layanan || '').toLowerCase();
  if (s.includes('imunisasi')) return 'imunisasi';
  if (s.includes('gizi')) return 'gizi';
  if (s === 'kb' || s.includes('keluarga berencana')) return 'kb';
  return 'lainnya';
}

function isGratis(v) {
  const s = String(v).toLowerCase();
  return s === 'true' || s === 'ya' || s === 'yes' || s === '1';
}

function escapeHtml(v) {
  return String(v ?? '-').replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

// Baris tambahan hanya muncul jika kolomnya ada di data
function barisOpsional(p, kolom, label) {
  return p[kolom] ? '<dt>' + label + '</dt><dd>' + escapeHtml(p[kolom]) + '</dd>' : '';
}

function popupHtml(p) {
  return '<div class="popup">' +
    '<h3>' + escapeHtml(p.nama) + '</h3>' +
    '<dl>' +
    '<dt>Layanan</dt><dd>' + escapeHtml(p.layanan) + '</dd>' +
    '<dt>Jadwal</dt><dd>' + escapeHtml(p.jadwal) + '</dd>' +
    '<dt>Tenaga kesehatan</dt><dd>' + escapeHtml(p.tenaga_kesehatan) + ' orang</dd>' +
    '<dt>Biaya</dt><dd>' + (isGratis(p.gratis) ? 'Gratis' : 'Berbayar') + '</dd>' +
    barisOpsional(p, 'kecamatan', 'Kecamatan') +
    barisOpsional(p, 'kelurahan', 'Kelurahan') +
    barisOpsional(p, 'puskesmas', 'Puskesmas') +
    barisOpsional(p, 'alamat', 'Alamat') +
    '</dl></div>';
}

// ---------- RENDER POSYANDU ----------
function renderPosyandu() {
  daftarLabel = [];
  plainLayer.clearLayers();
  clusterLayer.clearLayers();

  if (state.cluster) {
    if (map.hasLayer(plainLayer)) map.removeLayer(plainLayer);
    if (!map.hasLayer(clusterLayer)) map.addLayer(clusterLayer);
  } else {
    if (map.hasLayer(clusterLayer)) map.removeLayer(clusterLayer);
    if (!map.hasLayer(plainLayer)) map.addLayer(plainLayer);
  }
  const target = state.cluster ? clusterLayer : plainLayer;

  let tampil = 0;
  allFeatures.forEach(function (f) {
    const kat = kategori(f.properties.layanan);
    if (!state.filters[kat]) return;

    // GeoJSON: [lng, lat]  ->  Leaflet: [lat, lng]
    const lng = f.geometry.coordinates[0];
    const lat = f.geometry.coordinates[1];

    const marker = L.circleMarker([lat, lng], {
      pane: 'pTitik',
      radius: 8,
      color: '#ffffff',
      weight: 2,
      fillColor: COLORS[kat],
      fillOpacity: 0.95
    }).bindPopup(popupHtml(f.properties));

    if (tampilLabel && Number(f.properties.tenaga_kesehatan) >= LABEL_MIN_NAKES) {
      marker.bindTooltip(escapeHtml(namaLabel(f.properties.nama)), {
        permanent: true,
        direction: 'right',
        offset: [8, 0],
        className: 'label-posyandu'
      });
      marker.on('mouseover', function () {
        const el = marker.getTooltip() && marker.getTooltip().getElement();
        if (el) { el.classList.remove('label-sembunyi'); el.classList.add('label-hover'); }
      });
      marker.on('mouseout', function () {
        const el = marker.getTooltip() && marker.getTooltip().getElement();
        if (el) el.classList.remove('label-hover');
        aturLabel();
      });
      daftarLabel.push({ marker: marker, prioritas: Number(f.properties.tenaga_kesehatan) || 0 });
    }

    target.addLayer(marker);
    tampil++;
  });

  document.getElementById('info').textContent =
    'Menampilkan ' + tampil + ' dari ' + allFeatures.length + ' posyandu';

  // Beri waktu agar label (dan cluster) selesai digambar, lalu rapikan
  setTimeout(aturLabel, 80);
}

// ---------- LABEL RAPI ----------
// Label tanpa kata "Posyandu" di depan supaya lebih pendek
function namaLabel(nama) {
  return String(nama || '').replace(/^posyandu\s+/i, '');
}

function tabrakan(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Menyembunyikan label yang menimpa label lain atau menutupi titik lain.
// Label dengan tenaga kesehatan lebih banyak diutamakan. Zoom lebih dekat = lebih banyak label tampil.
function aturLabel() {
  const info = document.getElementById('label-info');
  info.textContent = '';

  // Pastikan semua label tetap tampil tanpa disembunyikan
  daftarLabel.forEach(function (d) {
    const tt = d.marker.getTooltip();
    const el = tt && tt.getElement();
    if (el) el.classList.remove('label-sembunyi');
  });
}

function hitungPerKategori() {
  const jumlah = { imunisasi: 0, gizi: 0, kb: 0, lainnya: 0 };
  allFeatures.forEach(function (f) { jumlah[kategori(f.properties.layanan)]++; });
  Object.keys(jumlah).forEach(function (k) {
    document.getElementById('count-' + k).textContent = jumlah[k];
  });
}

// ---------- LAYER PENDUKUNG (batas, jalan, permukiman, zona) ----------
function lebarJalan(hw) {
  if (['motorway', 'trunk', 'primary'].includes(hw)) return 4;
  if (hw === 'secondary') return 3;
  if (hw === 'tertiary') return 2.5;
  return 1.5;
}

// Setiap layer: judul di kontrol, file data, cara menggambar, dan tampil awal atau tidak
const LAYER_DEFS = [
  {
    nama: 'Batas Kecamatan',
    swatch: '<span class="sw sw-putus" style="border-color:#3b4a54"></span>',
    url: 'data/batas_kec_pontianak.geojson',
    aktif: true,
    opsi: {
      pane: 'pBatas',
      interactive: false,
      style: { color: '#3b4a54', weight: 2, dashArray: '6 4', fill: false }
    }
  },
  {
    nama: 'Jalan Utama',
    swatch: '<span class="sw sw-garis" style="border-color:#c9822b"></span>',
    url: 'data/jalan_utama.geojson',
    aktif: true,
    opsi: {
      pane: 'pJalan',
      style: function (f) {
        return { color: '#c9822b', weight: lebarJalan(f.properties.highway), opacity: 0.85 };
      },
      onEachFeature: function (f, layer) {
        if (f.properties.name) layer.bindTooltip(escapeHtml(f.properties.name), { sticky: true });
      }
    }
  },
  {
    nama: 'Permukiman',
    swatch: '<span class="sw sw-area" style="border-color:#7e5fa8;background:rgba(126,95,168,.25)"></span>',
    url: 'data/permukiman.geojson',
    aktif: true,
    opsi: {
      pane: 'pPermukiman',
      style: { color: '#7e5fa8', weight: 1, fillColor: '#9b7fbf', fillOpacity: 0.3 },
      onEachFeature: function (f, layer) {
        layer.bindTooltip(escapeHtml(f.properties.name || 'Permukiman'), { sticky: true });
      }
    }
  },
  {
    nama: 'Zona Layanan',
    swatch: '<span class="sw sw-area" style="border-color:#1c8c8c;background:rgba(28,140,140,.2)"></span>',
    url: 'api/data/zona',
    aktif: true,
    opsi: {
      pane: 'pZona',
      style: { color: '#1c8c8c', weight: 2, fillColor: '#1c8c8c', fillOpacity: 0.18 },
      onEachFeature: function (f, layer) {
        layer.bindPopup('<b>Zona Layanan ' + escapeHtml(f.properties.fid ?? '') + '</b>');
      }
    }
  }
];

// Kotak kontrol layer di kanan atas. Selalu dibuat, supaya terlihat walau ada file yang hilang.
const kontrolLayer = L.control.layers(null, null, { collapsed: false, position: 'topright' }).addTo(map);
kontrolLayer.getContainer().querySelector('.leaflet-control-layers-list')
  .insertAdjacentHTML('afterbegin', '<div class="layer-judul">Layer Peta</div>');

async function muatLayerPendukung() {
  const hasil = await Promise.all(LAYER_DEFS.map(function (d) {
    return fetchGeoJSON(d.url)
      .then(function (g) { return { def: d, data: g }; })
      .catch(function (err) {
        console.warn('Layer dilewati. Alamat yang dicari: ' + new URL(d.url, location.href).href + ' (' + err.message + ')');
        return { def: d, data: null };
      });
  }));

  const gagal = [];
  hasil.forEach(function (h) {
    const d = h.def;
    if (h.data) {
      const layer = L.geoJSON(h.data, d.opsi);
      if (d.aktif) layer.addTo(map);
      kontrolLayer.addOverlay(layer, '<span class="ly">' + d.swatch + d.nama + '</span>');
    } else {
      gagal.push(d.url);
      kontrolLayer.addOverlay(L.layerGroup(),
        '<span class="ly gagal">' + d.swatch + d.nama + ' <em>(belum ada)</em></span>');
    }
  });
}

// ---------- EVENT ----------
map.on('zoomend moveend', aturLabel);
clusterLayer.on('animationend', aturLabel);

document.querySelectorAll('input[data-key]').forEach(function (chk) {
  chk.addEventListener('change', function (e) {
    state.filters[e.target.dataset.key] = e.target.checked;
    renderPosyandu();
  });
});

document.getElementById('chkCluster').addEventListener('change', function (e) {
  state.cluster = e.target.checked;
  renderPosyandu();
});

document.getElementById('chkLabel').addEventListener('change', function (e) {
  tampilLabel = e.target.checked;
  renderPosyandu();
});

document.getElementById('btnReset').addEventListener('click', function () {
  Object.keys(state.filters).forEach(function (k) { state.filters[k] = true; });
  document.querySelectorAll('input[data-key]').forEach(function (c) { c.checked = true; });
  renderPosyandu();
});

// ---------- MUAT DATA ----------
async function fetchGeoJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

async function loadData() {
  let geojson;
  let sumber = '';

  try {
    geojson = await fetchGeoJSON(API_URL);
    sumber = 'Sumber data: API server';
  } catch (errApi) {
    try {
      geojson = await fetchGeoJSON(FALLBACK_URL);
      sumber = 'Sumber data: GeoJSON lokal';
    } catch (errFallback) {
      console.error('Gagal memuat data:', errFallback);
      document.getElementById('info').textContent =
        'Data gagal dimuat. Jalankan lewat server, bukan file://';
      return;
    }
  }

  allFeatures = geojson.features || [];
  hitungPerKategori();
  renderPosyandu();

  const bounds = L.geoJSON(geojson).getBounds();
  if (bounds.isValid()) map.fitBounds(bounds.pad(0.1));
}

muatLayerPendukung();
loadData();
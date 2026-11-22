// =====================================================
// SK-4 Frontend Interaktif - SIG Posyandu Pontianak Timur
// =====================================================

// ---------- STATE ----------
const state = {
  filters: { imunisasi: true, gizi: true, kb: true, lainnya: true },
  cluster: false
};

// ---------- KONFIGURASI ----------
// Setelah backend (SK-3) siap, data diambil dari API.
// Jika API belum ada, otomatis memakai data dummy.
const API_URL = '/api/data/posyandu';
const DUMMY_URL = 'data/posyandu_dummy.geojson';

const COLORS = {
  imunisasi: '#d64545',
  gizi: '#2f9e5b',
  kb: '#2f6fb5',
  lainnya: '#e0951f'
};

let allFeatures = [];

// ---------- PETA ----------
const map = L.map('map').setView([-0.0263, 109.3708], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Layer biasa (tanpa cluster)
const plainLayer = L.layerGroup();

// Layer cluster, ikon cluster memakai L.divIcon
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
// Mengelompokkan nilai kolom "layanan" ke 4 kategori
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

function popupHtml(p) {
  return '<div class="popup">' +
    '<h3>' + escapeHtml(p.nama) + '</h3>' +
    '<dl>' +
    '<dt>Layanan</dt><dd>' + escapeHtml(p.layanan) + '</dd>' +
    '<dt>Jadwal</dt><dd>' + escapeHtml(p.jadwal) + '</dd>' +
    '<dt>Tenaga kesehatan</dt><dd>' + escapeHtml(p.tenaga_kesehatan) + ' orang</dd>' +
    '<dt>Biaya</dt><dd>' + (isGratis(p.gratis) ? 'Gratis' : 'Berbayar') + '</dd>' +
    '</dl></div>';
}

// ---------- RENDER ----------
function renderPosyandu() {
  plainLayer.clearLayers();
  clusterLayer.clearLayers();

  // Pilih layer aktif sesuai state.cluster
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
      radius: 8,
      color: '#ffffff',
      weight: 2,
      fillColor: COLORS[kat],
      fillOpacity: 0.95
    }).bindPopup(popupHtml(f.properties));

    target.addLayer(marker);
    tampil++;
  });

  document.getElementById('info').textContent =
    'Menampilkan ' + tampil + ' dari ' + allFeatures.length + ' posyandu';
}

// Jumlah titik per kategori (ditampilkan di samping checkbox)
function hitungPerKategori() {
  const jumlah = { imunisasi: 0, gizi: 0, kb: 0, lainnya: 0 };
  allFeatures.forEach(function (f) {
    jumlah[kategori(f.properties.layanan)]++;
  });
  Object.keys(jumlah).forEach(function (k) {
    document.getElementById('count-' + k).textContent = jumlah[k];
  });
}

// ---------- EVENT ----------
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
      geojson = await fetchGeoJSON(DUMMY_URL);
      sumber = 'Sumber data: file dummy (API belum tersedia)';
    } catch (errDummy) {
      console.error('Gagal memuat data:', errDummy);
      document.getElementById('info').textContent =
        'Data gagal dimuat. Jalankan lewat server, bukan file://';
      return;
    }
  }

  allFeatures = geojson.features || [];
  document.getElementById('source').textContent = sumber;
  hitungPerKategori();
  renderPosyandu();

  // Zoom otomatis ke seluruh titik
  const bounds = L.geoJSON(geojson).getBounds();
  if (bounds.isValid()) map.fitBounds(bounds.pad(0.1));
}

loadData();
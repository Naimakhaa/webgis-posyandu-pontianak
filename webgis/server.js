const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

const FILE_POSYANDU = path.join(__dirname, 'data', 'posyandu_pontianak.geojson');
const FILE_ZONA = path.join(__dirname, 'data', 'zona_layanan.geojson');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Fungsi bantu: baca file GeoJSON
function bacaGeojson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// Cek saat server mulai: file Posyandu harus berisi titik (Point)
const cek = bacaGeojson(FILE_POSYANDU).features.filter((f) => f.geometry.type !== 'Point');
if (cek.length > 0) {
  console.warn('PERINGATAN: posyandu_pontianak.geojson berisi ' + cek.length + ' fitur bukan Point. Minta SK-2 ekspor ulang layer titik.');
}

// 1. GET /api/data/posyandu -> semua titik Posyandu
app.get('/api/data/posyandu', (req, res) => {
  res.json(bacaGeojson(FILE_POSYANDU));
});

// 2. GET /api/stats/layanan -> jumlah Posyandu per layanan
app.get('/api/stats/layanan', (req, res) => {
  const data = bacaGeojson(FILE_POSYANDU);
  const stats = { imunisasi: 0, gizi: 0, kb: 0, lainnya: 0 };
  data.features.forEach((f) => {
    const layanan = String((f.properties && f.properties.layanan) || '').toLowerCase();
    if (layanan in stats) stats[layanan]++;
    else stats.lainnya++;
  });
  res.json({ total: data.features.length, stats });
});

// 3a. GET /api/data/zona -> poligon zona layanan (untuk layer peta SK-4)
app.get('/api/data/zona', (req, res) => {
  res.json(bacaGeojson(FILE_ZONA));
});

// 3b. POST /api/feature/zona -> tambah poligon zona layanan baru
app.post('/api/feature/zona', (req, res) => {
  const feature = req.body;
  if (!feature || !feature.geometry || feature.geometry.type !== 'Polygon') {
    return res.status(400).json({ error: 'Kirim Feature GeoJSON bertipe Polygon' });
  }
  const zona = bacaGeojson(FILE_ZONA);
  const fid = zona.features.length + 1;
  zona.features.push({
    type: 'Feature',
    properties: Object.assign({ fid: fid }, feature.properties),
    geometry: feature.geometry
  });
  fs.writeFileSync(FILE_ZONA, JSON.stringify(zona, null, 2));
  res.status(201).json({ pesan: 'Zona berhasil disimpan', total: zona.features.length });
});

app.listen(PORT, () => {
  console.log('Server berjalan di http://localhost:' + PORT);
});

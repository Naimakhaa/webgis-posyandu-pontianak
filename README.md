# WebGIS Posyandu Kota Pontianak — SK-3 Backend API

Server Node.js + Express untuk melayani data GeoJSON Posyandu.

## Menjalankan
```bash
cd webgis
npm install
npm start
```
Buka http://localhost:3000

## Endpoint
| Method | URL | Fungsi |
|---|---|---|
| GET | /api/data/posyandu | Semua titik Posyandu (GeoJSON) |
| GET | /api/stats/layanan | Jumlah Posyandu per layanan |
| GET | /api/data/zona | Poligon zona layanan (GeoJSON) |
| POST | /api/feature/zona | Tambah poligon zona layanan |

Catatan: `zona_layanan.geojson` sudah asli dari SK-2. `posyandu_pontianak.geojson` masih CONTOH (3 titik), ganti dengan ekspor titik 40 Posyandu dari SK-2.
Penjelasan kode: lihat `CATATAN_PENJELASAN_KODE.md`.

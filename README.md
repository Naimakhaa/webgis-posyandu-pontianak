# WebGIS Posyandu Kota Pontianak

Proyek UAS Sistem Informasi Geografis Dasar (Kelompok 3): QGIS + Node.js (Express) + Leaflet.js.

## Struktur proyek
```
├── qgis/                    SK-1 & SK-2 (data dan proyek QGIS)
│   └── data/                data sumber (CSV, SHP, GeoJSON, GPKG)
├── webgis/
│   ├── server.js            SK-3  server + REST API
│   ├── package.json         SK-3  dependensi
│   ├── data/                SK-3  GeoJSON yang dibaca API (salinan hasil SK-2)
│   └── public/              SK-4  frontend (index.html, app.js, style.css, data/)
└── laporan/                 SK-5
```

## Menjalankan
```bash
cd webgis
npm install
npm start
```
Buka http://localhost:3000

## Endpoint API (SK-3)
| Method | URL | Fungsi |
|---|---|---|
| GET | /api/data/posyandu | Semua titik Posyandu (GeoJSON) |
| GET | /api/stats/layanan | Jumlah Posyandu per layanan |
| GET | /api/data/zona | Poligon zona layanan (GeoJSON) |
| POST | /api/feature/zona | Tambah poligon zona layanan |

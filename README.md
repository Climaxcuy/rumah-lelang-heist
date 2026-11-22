# 🔨 Rumah Lelang: Palu Emas

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/Climaxcuy/rumah-lelang-heist/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/Climaxcuy/rumah-lelang-heist/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

Game heist 3D (Three.js) di sebuah rumah lelang malam hari. Masuk sebagai tamu,
curi tiga lot termahal, dan kabur lewat pintu selatan sebelum palu terakhir diketuk.

## Cerita

Malam ini, tiga lot termahal dilelang: **Lukisan "Senja Venesia"**, **Vas Dinasti
Ming**, dan **Jam Saku Emas 1889**. Empat petugas lelang berpatroli dengan kerucut
pandang, tiga kamera CCTV menyapu aula, dan anjing K-9 Rex mengendus di dekat
panggung. Kerumunan penonton adalah perlindunganmu — di tengah mereka, kau nyaris
tak terlihat. Tapi hati-hati: sorotan lot yang berputar bisa menyorotmu, dan lari
itu berisik.

## Cara main

| Tombol | Aksi |
|---|---|
| WASD / Panah | Bergerak |
| Shift | Lari (cepat, tapi berisik) |
| E | Ambil lot (atau sentuh saja) |
| Q | Lempar koin emas pengalih (3x) — petugas menyelidiki bunyinya |
| P | Jeda |
| M | Bisu |
| R | Mulai ulang |

**Menang:** curi 3/3 lot, lalu capai pintu hijau selatan.
**Kalah:** ketahuan 3 kali (strike).

Meter alarm naik saat kau terlihat penjaga atau kamera, turun saat kau bersembunyi
di balik cover atau di tengah kerumunan. Penjaga berubah dari patroli (cone
kuning) ke curiga (oranye, ?) lalu mengejar (merah, !) — dan bila kehilanganmu,
mereka menggeledah sekitar titik terakhir kau terlihat.

## Mekanik khas

- **Kerumunan lelang sebagai cover bergerak** — penonton bergeser di kursinya;
  berdiri di tengah mereka membuat deteksi dua kali lebih lambat.
- **Sorotan lot berputar** — sorotan panggung menyapu ruangan; tersorot membuatmu
  lebih mudah ketahuan.
- **Meter kebisingan** — lari menaikkan kebisingan; penjaga di dekatmu lebih
  cepat curiga saat kau berisik.
- **Palu lelang** — berdentang berkala; lot "terjual" berganti.

## Menjalankan

Buka `game/index.html` lewat server HTTP statis apa pun (mis. `python3 -m
http.server` dari folder ini, lalu buka `http://localhost:8000/game/`).
Tidak ada build step, tidak ada request jaringan — semua file ada di `game/`.

## Struktur kode

- `game/src/config.js` — penyeimbang, layout level, waypoint penjaga
- `game/src/level.js` — tabrakan & garis pandang
- `game/src/guards.js` — AI penjaga & anjing (patroli → curiga → kejar → cari)
- `game/src/cameras.js` — kamera CCTV menyapu
- `game/src/player.js` — gerak, kebisingan, loot, pengalih
- `game/src/crowd.js` — kerumunan & sorotan lot
- `game/src/world.js` — state, alarm, strike, skor
- `game/src/autopilot.js` — pilot otomatis (memainkan aturan asli sampai WIN)
- `game/src/render.js` — scene Three.js, HUD, minimap
- `game/src/shots.js` — scene screenshot deterministik (`?shot=`)
- `game/src/audio.js` — suara synth WebAudio
- `game/src/input.js`, `game/src/random.js`, `game/src/main.js` — input, RNG, loop

## Lisensi

MIT — lihat `LICENSE`.

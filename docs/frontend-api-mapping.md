# SupportDesk Frontend - API Mapping

Dokumen ini menjelaskan halaman frontend yang dibutuhkan, endpoint NestJS yang dipanggil, URL yang dipakai, data yang harus dikirim, dan data response yang dipakai UI.

## Base URL

Frontend memakai environment variable:

```env
API_URL=http://localhost:3020/api
```

Karena NestJS memakai global prefix `/api`, maka semua request frontend harus mengarah ke `API_URL` di atas.

Contoh:

- `GET ${API_URL}/auth/me`
- `POST ${API_URL}/ticket`
- `GET ${API_URL}/ticket/queue`

## Aturan Umum Request

- Semua request yang mengirim body harus menggunakan `Content-Type: application/json`.
- Request yang memakai cookie harus mengirim credential.
- Di browser/fetch/axios, gunakan `credentials: 'include'` atau setara.
- Swagger dan frontend memakai cookie `access_token` sebagai sesi login.

Contoh fetch umum:

```ts
fetch(`${API_URL}/auth/me`, {
  method: 'GET',
  credentials: 'include',
});
```

## Domain Konsep

SupportDesk ini diposisikan sebagai sistem customer service untuk pelacakan paket bermasalah, misalnya:

- paket tidak kunjung sampai
- seller mengirim barang bodong
- resi tidak bergerak
- paket rusak / salah kirim
- komplain pengiriman lain yang butuh penanganan CS

Istilah backend masih memakai `ticket`, tetapi secara UI sebaiknya ditampilkan sebagai:

- laporan
- komplain paket
- laporan paket bermasalah
- antrian komplain

## Halaman Frontend yang Diperlukan

### 1. Halaman Login

Tujuan:
- Login user atau admin
- Menyimpan cookie `access_token` secara HttpOnly dari response backend
- Mengarahkan user ke dashboard sesuai role

Endpoint:

- `POST ${API_URL}/auth/login`

Request body:

```json
{
  "email": "user@gmail.com",
  "password": "password123"
}
```

Data yang dibutuhkan UI:
- `email`
- `password`

Response yang dipakai:
- pesan login berhasil
- cookie `access_token` diset otomatis oleh backend

Catatan frontend:
- setelah login sukses, panggil `GET ${API_URL}/auth/me` untuk ambil sesi user aktif
- gunakan hasil response itu untuk menentukan apakah redirect ke dashboard user atau dashboard admin

### 2. Halaman Cek Sesi / Auth Guard

Tujuan:
- Mengecek apakah user masih login saat halaman dibuka ulang
- Dipakai oleh route guard frontend

Endpoint:

- `GET ${API_URL}/auth/me`

Request body:
- tidak ada

Data yang dibutuhkan UI:
- cookie `access_token`

Response yang dipakai:
- `id`
- `name`
- `email`
- `role`
- `created_at`
- `updated_at`

Pemakaian UI:
- jika sukses, simpan user ke Pinia / auth store
- jika gagal, redirect ke login

### 3. Halaman Logout

Tujuan:
- Menghapus sesi login

Endpoint:

- `POST ${API_URL}/auth/logout`

Request body:
- tidak ada

Data yang dibutuhkan UI:
- cookie `access_token`

Response yang dipakai:
- pesan logout berhasil

Catatan frontend:
- setelah logout, bersihkan state auth lokal dan redirect ke login

### 4. Halaman Dashboard User

Tujuan:
- Menampilkan ringkasan komplain milik user
- Menampilkan daftar laporan paket yang pernah dibuat user
- Menampilkan status laporan terbaru

Endpoint utama:

- `GET ${API_URL}/ticket/me`

Request body:
- tidak ada

Data yang dibutuhkan UI:
- cookie `access_token`

Response yang dipakai:
- daftar komplain milik user
- setiap item ticket biasanya dipakai field:
  - `id`
  - `ticket_number`
  - `subject`
  - `description`
  - `room_id`
  - `status`
  - `created_at`
  - `updated_at`
  - `user`
  - `assigned_admin`

UI yang umum ditampilkan:
- total komplain aktif
- komplain terbaru
- komplain dengan status `OPEN`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`

### 5. Halaman Buat Komplain / Buat Laporan Paket

Tujuan:
- User membuat laporan paket bermasalah baru
- Backend membuat `ticket_number` dan `room_id`

Endpoint:

- `POST ${API_URL}/ticket`

Request body:

```json
{
  "subject": "Paket dari seller tidak kunjung sampai",
  "description": "Saya sudah menunggu lebih dari 7 hari, resi tidak bergerak dan seller tidak merespons."
}
```

Data yang dibutuhkan UI:
- `subject`
- `description`
- cookie `access_token`

Response yang dipakai:
- ticket baru hasil create
- `id`
- `ticket_number`
- `room_id`
- `status`
- `user`

Pemakaian UI:
- setelah create sukses, redirect ke halaman detail komplain
- gunakan `room_id` untuk halaman chat realtime Firebase

### 6. Halaman Detail Komplain / Detail Paket Bermasalah

Tujuan:
- Menampilkan detail laporan
- Menampilkan status penanganan
- Menjadi pintu masuk ke chat realtime via Firebase

Endpoint:

- `GET ${API_URL}/ticket/:id`

Contoh:

- `GET ${API_URL}/ticket/12`

Request body:
- tidak ada

Data yang dibutuhkan UI:
- cookie `access_token`
- `id` ticket dari route frontend

Response yang dipakai:
- `id`
- `ticket_number`
- `subject`
- `description`
- `room_id`
- `status`
- `created_at`
- `updated_at`
- `user`
- `assigned_admin`

Pemakaian UI:
- render detail komplain
- ambil `room_id` lalu subscribe ke Firebase path:

```text
rooms/{room_id}/messages
```

Firebase yang dipakai frontend:
- untuk listen pesan realtime: `onValue(...)`
- untuk kirim pesan: `push(...)`

Catatan penting:
- backend tidak menyimpan isi chat di MySQL
- backend hanya menyediakan `room_id` sebagai penghubung ke Firebase

### 7. Halaman Antrian Admin

Tujuan:
- Menampilkan daftar komplain paket yang masih `OPEN`
- Dipakai admin untuk memilih komplain yang mau diambil

Endpoint:

- `GET ${API_URL}/ticket/queue`

Request body:
- tidak ada

Data yang dibutuhkan UI:
- cookie `access_token`
- role user harus `ADMIN`

Response yang dipakai:
- daftar ticket status `OPEN`
- field penting:
  - `id`
  - `ticket_number`
  - `subject`
  - `description`
  - `room_id`
  - `status`
  - `created_at`
  - `user`

UI yang umum ditampilkan:
- tabel antrian
- filter status
- sort berdasarkan waktu masuk
- tombol ambil komplain

### 8. Halaman Ambil Komplain oleh Admin

Tujuan:
- Admin mengambil komplain dari antrian
- Backend mengubah `assigned_admin_id` dan status menjadi `ASSIGNED`

Endpoint:

- `POST ${API_URL}/ticket/:id/take`

Contoh:

- `POST ${API_URL}/ticket/12/take`

Request body:
- tidak ada

Data yang dibutuhkan UI:
- cookie `access_token`
- ticket id

Response yang dipakai:
- ticket yang sudah di-assign
- `assigned_admin`
- status terbaru `ASSIGNED`

Catatan frontend:
- ini harus dipanggil sekali saat admin menekan tombol ambil
- jika response error conflict, artinya ticket sudah diambil admin lain

### 9. Halaman Detail Komplain Admin / Penanganan

Tujuan:
- Menampilkan komplain yang sudah di-assign ke admin
- Admin mengubah status penanganan
- Admin membaca isi chat realtime dari Firebase

Endpoint baca detail:

- `GET ${API_URL}/ticket/:id`

Endpoint update status:

- `PATCH ${API_URL}/ticket/:id/status`

Contoh:

- `PATCH ${API_URL}/ticket/12/status`

Request body:

```json
{
  "status": "IN_PROGRESS"
}
```

Contoh lain:

```json
{
  "status": "RESOLVED"
}
```

Data yang dibutuhkan UI:
- cookie `access_token`
- ticket id
- status baru

Response yang dipakai:
- ticket dengan status terbaru

Status yang umum dipakai frontend:
- `OPEN`
- `ASSIGNED`
- `IN_PROGRESS`
- `RESOLVED`
- `CLOSED`

Alur UI yang disarankan:
- admin klik ambil komplain
- status berubah ke `ASSIGNED`
- saat mulai dikerjakan, ubah ke `IN_PROGRESS`
- ketika masalah selesai, ubah ke `RESOLVED`
- setelah arsip final, ubah ke `CLOSED`

### 10. Halaman Profil / Akun Saya

Tujuan:
- Menampilkan user yang sedang login
- Menampilkan role user atau admin
- Bisa dipakai untuk switch menu UI

Endpoint:

- `GET ${API_URL}/auth/me`

Data yang dipakai:
- `name`
- `email`
- `role`

Pemakaian UI:
- tampilkan nama di navbar
- tampilkan badge role
- tentukan akses menu user/admin

## Mapping Endpoint Backend

### Auth

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Ticket / Komplain Paket

- `POST /api/ticket`
- `GET /api/ticket/me`
- `GET /api/ticket/queue`
- `GET /api/ticket/:id`
- `POST /api/ticket/:id/take`
- `PATCH /api/ticket/:id/status`

## Struktur Data Yang Paling Penting di Frontend

### Auth Store

Simpan minimal:

```ts
{
  id: number;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
}
```

### Ticket/Komplain Store

Simpan minimal:

```ts
{
  id: number;
  ticket_number: string;
  subject: string;
  description: string;
  room_id: string;
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  created_at: string;
  updated_at: string;
}
```

### Firebase Chat Data

Frontend perlu `room_id` untuk akses ke:

```text
rooms/{room_id}/messages
```

Biasanya data message berisi:

```ts
{
  senderId: number | string;
  senderName: string;
  message: string;
  createdAt: number;
}
```

## Rekomendasi Alur Frontend

### Saat App Pertama Dibuka

1. Panggil `GET ${API_URL}/auth/me`.
2. Jika sukses, simpan user ke state.
3. Jika gagal, arahkan ke login.

### Saat User Login

1. Kirim `POST ${API_URL}/auth/login`.
2. Backend set cookie `access_token`.
3. Panggil lagi `GET ${API_URL}/auth/me`.
4. Redirect ke dashboard sesuai role.

### Saat User Membuat Komplain

1. Kirim `POST ${API_URL}/ticket`.
2. Ambil `room_id` dari response.
3. Redirect ke halaman detail komplain.
4. Inisialisasi Firebase dengan `room_id`.

### Saat Admin Mengambil Komplain

1. Tampilkan antrian dari `GET ${API_URL}/ticket/queue`.
2. Saat tombol ambil ditekan, kirim `POST ${API_URL}/ticket/:id/take`.
3. Jika sukses, buka halaman detail komplain.
4. Ubah status via `PATCH ${API_URL}/ticket/:id/status` sesuai proses kerja.

## Catatan Teknis

- Semua request frontend ke NestJS harus menggunakan `credentials: 'include'` karena auth berbasis cookie.
- Karena backend sekarang memakai prefix `/api`, jangan panggil endpoint tanpa `/api`.
- Gunakan header `Content-Type: application/json` untuk semua request yang mengirim body.
- Frontend sebaiknya memisahkan tampilan label user-facing dari nama entity internal backend. Misalnya `ticket` di backend bisa ditampilkan sebagai `komplain paket` di UI.

## Contoh Konfigurasi Frontend

```ts
const API_URL = import.meta.env.API_URL ?? 'http://localhost:3020/api';

await fetch(`${API_URL}/auth/login`, {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@gmail.com',
    password: 'password123',
  }),
});
```

## Ringkasan URL Penting

- `http://localhost:3020/api/auth/login`
- `http://localhost:3020/api/auth/me`
- `http://localhost:3020/api/auth/logout`
- `http://localhost:3020/api/ticket`
- `http://localhost:3020/api/ticket/me`
- `http://localhost:3020/api/ticket/queue`
- `http://localhost:3020/api/ticket/:id`
- `http://localhost:3020/api/ticket/:id/take`
- `http://localhost:3020/api/ticket/:id/status`

# Panduan Webhook PulsaKilat

Dokumen ini menjelaskan konsep webhook dengan bahasa sederhana, terutama untuk kebutuhan PulsaKilat yang nanti akan terhubung ke provider seperti Pulsa24Jam.

## 1. Apa Itu Webhook?

Webhook adalah URL milik aplikasi kita yang disiapkan untuk menerima kabar otomatis dari sistem lain.

Contoh sederhana:

```text
PulsaKilat kirim transaksi ke Pulsa24Jam
Pulsa24Jam proses transaksi
Pulsa24Jam mengirim kabar balik ke PulsaKilat lewat webhook
PulsaKilat update status transaksi
```

Jadi webhook itu bukan halaman yang dibuka user. Webhook adalah endpoint backend untuk menerima callback/status dari provider.

## 2. Bedanya API Biasa dan Webhook

API biasa:

```text
PulsaKilat -> Pulsa24Jam
```

Webhook:

```text
Pulsa24Jam -> PulsaKilat
```

Contoh API biasa:

```text
PulsaKilat: "Saya mau beli pulsa 10.000 ke 08123456789."
Pulsa24Jam: "Transaksi diterima, status pending."
```

Contoh webhook:

```text
Pulsa24Jam: "Transaksi ABC123 sudah sukses, SN 987654."
PulsaKilat: "Oke, status saya ubah jadi sukses."
```

## 3. Alur Webhook Transaksi

Alur transaksi yang ideal:

```text
1. User membeli pulsa/e-wallet di PulsaKilat
2. Backend PulsaKilat membuat transaksi dengan status pending
3. Backend PulsaKilat mengirim order ke provider
4. Provider memberi response awal
5. Kalau response masih pending, PulsaKilat menunggu webhook
6. Provider mengirim webhook ke PulsaKilat
7. PulsaKilat validasi webhook
8. PulsaKilat update transaksi menjadi success atau failed
9. Kalau failed dan saldo sudah terpotong, PulsaKilat refund saldo
10. Kalau success, PulsaKilat simpan SN/nomor referensi provider
```

## 4. Contoh Endpoint Webhook

Nanti untuk Pulsa24Jam bisa disiapkan endpoint seperti:

```text
POST /v1/webhook/pulsa24jam
```

Atau versi pendek:

```text
POST /webhook/pulsa24jam
```

URL lengkap kalau sudah online:

```text
https://domain-pulsakilat.com/v1/webhook/pulsa24jam
```

URL ini yang diberikan ke pihak Pulsa24Jam agar mereka bisa mengirim callback.

## 5. Data yang Biasanya Dikirim Provider

Setiap provider punya format sendiri, tapi biasanya berisi:

```json
{
  "refid": "ABC123",
  "status": "success",
  "message": "Transaksi berhasil",
  "sn": "987654321",
  "provider_ref": "PJ123456"
}
```

Field penting:

- `refid`: nomor referensi transaksi dari PulsaKilat
- `status`: status akhir transaksi, misalnya success atau failed
- `message`: pesan dari provider
- `sn`: serial number/bukti sukses
- `provider_ref`: nomor referensi dari provider

## 6. Yang Harus Dilakukan Backend Saat Menerima Webhook

Saat webhook masuk, backend harus:

1. Membaca payload dari provider.
2. Memvalidasi pengirim.
3. Mencari transaksi berdasarkan `refid`.
4. Mengecek apakah transaksi sudah final.
5. Jika belum final, update status transaksi.
6. Simpan `raw_callback` untuk audit.
7. Jika transaksi gagal dan saldo sudah kepotong, lakukan refund.
8. Jika transaksi sukses, simpan SN dan referensi provider.
9. Kirim response sukses ke provider.

## 7. Kenapa Harus Validasi Webhook?

Webhook adalah endpoint publik. Kalau tidak divalidasi, orang lain bisa pura-pura mengirim callback.

Contoh bahaya:

```text
Orang luar mengirim callback palsu:
"Transaksi ABC123 sukses"
```

Padahal provider asli belum bilang sukses.

Karena itu webhook harus divalidasi menggunakan salah satu cara:

- whitelist IP provider
- token rahasia
- signature/hash
- kombinasi token dan signature

## 8. Idempotency: Jangan Proses Dua Kali

Provider bisa mengirim webhook lebih dari sekali.

Misalnya:

```text
Webhook pertama: transaksi sukses
Webhook kedua: transaksi sukses lagi
```

Backend harus aman agar saldo/refund/SN tidak diproses dua kali.

Aturan aman:

```text
Kalau transaksi sudah success atau failed, jangan proses ulang.
```

Tetap boleh simpan log callback, tapi jangan mengubah saldo dua kali.

## 9. Webhook yang Sudah Ada di Backend PulsaKilat

Backend PulsaKilat sudah punya beberapa webhook provider:

```text
/v1/webhook/javapay
/v1/webhook/yuscom
/v1/webhook/multikom
/v1/webhook/talenta
/v1/webhook/sagaramobile
/v1/webhook/minions
/v1/webhook/trionik
/v1/webhook/ajs
/v1/webhook/gemilang
/v1/webhook/smb
/v1/webhook/loketbayar
/v1/webhook/chytron
/v1/webhook/rajabiller
/v1/webhook/midtrans
```

File route utama:

```text
pulsa-be/internal/router/provider_callback.go
```

Untuk Pulsa24Jam, saat dokumen API/provider sudah siap, endpoint baru bisa dibuat mengikuti pola provider lain.

## 10. Peran `raw_callback`

`raw_callback` adalah data mentah callback yang disimpan ke database.

Gunanya:

- audit kalau ada komplain
- cek payload asli dari provider
- debugging kalau status tidak sesuai
- bukti bahwa provider pernah mengirim callback

Contoh:

```text
Provider bilang sukses, tapi user merasa belum masuk.
Admin bisa lihat raw_callback untuk cek SN, status, dan waktu callback.
```

## 11. Peran Webhook ke Member

Selain menerima webhook dari provider, PulsaKilat juga bisa mengirim webhook ke member/H2H.

Arahnya:

```text
Provider -> PulsaKilat -> Member
```

Contoh:

```text
Yuscom mengirim callback sukses ke PulsaKilat
PulsaKilat update transaksi
PulsaKilat mengirim callback final ke webhook milik member
```

Ini berguna untuk member H2H yang memakai API PulsaKilat.

## 12. Kesimpulan

Webhook adalah bagian penting supaya status transaksi otomatis berubah tanpa admin harus cek manual.

Untuk PulsaKilat:

```text
API hit = PulsaKilat mengirim order ke provider
Webhook = provider mengirim hasil transaksi ke PulsaKilat
```

Untuk integrasi Pulsa24Jam nanti, yang perlu disiapkan:

1. Endpoint webhook Pulsa24Jam.
2. Format parser payload Pulsa24Jam.
3. Validasi token/IP/signature.
4. Mapping status provider ke status PulsaKilat.
5. Update transaksi/refund/SN.
6. Simpan raw callback.
7. Jaga agar callback dobel tidak memproses saldo dua kali.

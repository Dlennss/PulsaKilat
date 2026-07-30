# Integrasi Pulsa24Jam

Dokumen ini menjelaskan bagian yang perlu disiapkan ketika PulsaKilat mulai nge-hit ke Pulsa24Jam sebagai provider H2H.

## Konsep Singkat

PulsaKilat tetap menjadi aplikasi utama untuk agent/user. Pulsa24Jam dipakai sebagai provider di belakang layar.

Alurnya:

1. User memilih layanan dan membuat transaksi di PulsaKilat.
2. Backend PulsaKilat mencari produk/provider yang sesuai.
3. Jika produk diarahkan ke provider `pulsa24jam`, backend mengirim request ke API Pulsa24Jam.
4. Pulsa24Jam membalas status awal, biasanya sukses, gagal, atau pending.
5. Jika transaksi pending, Pulsa24Jam dapat mengirim callback/webhook ke backend PulsaKilat.
6. Backend PulsaKilat mencatat callback dan nanti bisa dipakai untuk update status transaksi setelah format callback resmi sudah cocok.

## Environment Backend

Isi di file `pulsa-be/.env` pada server. Jangan commit file `.env` ke GitHub.

```env
PULSA24JAM_BASE_URL=https://api-domain-pulsa24jam
PULSA24JAM_MEMBERID=isi_member_id
PULSA24JAM_API_KEY=isi_api_key
PULSA24JAM_PIN=isi_pin_transaksi
PULSA24JAM_PASSWORD=isi_password_jika_diperlukan
PULSA24JAM_SECRET=isi_secret_jika_diperlukan
PULSA24JAM_TIMEOUT=30s

# Opsional, untuk mengamankan callback.
PULSA24JAM_CALLBACK_TOKEN=token_rahasia_callback
PULSA24JAM_CALLBACK_IP=ip_callback_pulsa24jam_jika_disediakan
```

## Callback URL

Daftarkan salah satu URL ini di panel Pulsa24Jam:

```text
https://domain-kamu.com/webhook/pulsa24jam
```

Atau:

```text
https://domain-kamu.com/v1/webhook/pulsa24jam
```

Jika memakai `PULSA24JAM_CALLBACK_TOKEN`, kirim token lewat salah satu cara berikut:

```text
Header: X-Callback-Token: token_rahasia_callback
```

Atau:

```text
https://domain-kamu.com/webhook/pulsa24jam?token=token_rahasia_callback
```

## Mapping Produk

Transaksi baru benar-benar nge-hit Pulsa24Jam jika produk di database diarahkan ke provider:

```text
provider = pulsa24jam
kode_produk_provider = kode_produk_dari_pulsa24jam
```

Jadi produk PulsaKilat boleh tetap tampil dengan nama dan desain PulsaKilat, tetapi kode provider di belakangnya memakai kode produk Pulsa24Jam.

## Catatan Penting

Adapter Pulsa24Jam sudah disiapkan di backend, tetapi endpoint request, bentuk payload, dan signature masih perlu dicocokkan dengan dokumentasi resmi Pulsa24Jam. Saat ini callback Pulsa24Jam sudah diterima dan dicatat di log, tetapi belum otomatis mengubah status transaksi sampai format callback resminya dikunci.

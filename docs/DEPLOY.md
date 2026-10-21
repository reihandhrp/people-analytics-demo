# Panduan deploy (GitHub Pages, gratis)

Waktu yang dibutuhkan sekitar 15 menit. Anda tidak perlu menginstal apa pun di komputer, tidak perlu kartu kredit, dan tidak perlu menyimpan secret atau kata sandi apa pun di repo.

## 1. Siapkan akun dan repo

1. Buka https://github.com, lalu masuk. Bila belum punya akun, klik **Sign up** dan buat akun gratis.
2. Klik tombol **+** di kanan atas, lalu pilih **New repository**.
3. Isi **Repository name** dengan `people-analytics-demo`.
4. Pilih **Public**. GitHub Pages gratis hanya untuk repo publik.
5. Biarkan pilihan "Add a README" **tidak** dicentang, lalu klik **Create repository**.

## 2. Unggah berkas

1. Ekstrak zip `people-analytics-demo.zip` di komputer Anda.
2. Di halaman repo yang masih kosong, klik tautan **uploading an existing file**.
3. Buka folder hasil ekstrak. Pilih **semua isinya** (folder `docs`, `generator`, `models`, `site`, `tests`, `.github`, dan berkas `README.md`), lalu seret ke halaman GitHub.
4. Tunggu sampai semua berkas tampil di daftar, lalu klik **Commit changes**.

**Cek folder `.github`.** Di halaman utama repo, harus ada folder `.github`. Windows dan Mac sering menyembunyikan folder yang namanya diawali titik, sehingga folder ini bisa tidak ikut terunggah. Bila tidak ada:

1. Klik **Add file → Create new file**.
2. Pada kolom nama, ketik `.github/workflows/deploy.yml`. Garis miring akan membuat foldernya otomatis.
3. Buka berkas `deploy.yml` dari zip dengan Notepad atau TextEdit, salin seluruh isinya, lalu tempel ke GitHub.
4. Klik **Commit changes**.

## 3. Nyalakan GitHub Pages

1. Di repo, buka **Settings**, lalu pilih **Pages** di menu kiri.
2. Di bagian **Build and deployment → Source**, pilih **GitHub Actions**.

## 4. Jalankan deploy pertama

1. Buka tab **Actions**. Bila GitHub bertanya soal workflow, klik tombol hijau **I understand my workflows, go ahead and enable them**.
2. Di daftar kiri, pilih **Build and deploy**, lalu klik **Run workflow → Run workflow**.
3. Tunggu sekitar 2 menit sampai muncul centang hijau. Bila muncul tanda silang merah karena Pages baru saja dinyalakan, klik **Re-run all jobs**.
4. Situs tayang di:
   `https://NAMA-AKUN-ANDA.github.io/people-analytics-demo/`

## 5. Rapikan halaman repo

1. Di halaman utama repo, klik ikon roda gigi di sebelah **About**.
2. Tempel link situs di kolom **Website**.
3. Isi **Description**, misalnya: *People analytics dashboard on fully synthetic data: workforce, cost, talent and 3 predictive models.*
4. Isi **Topics**, misalnya: `people-analytics`, `hr-analytics`, `dashboard`, `data-visualization`, `python`.
5. Klik **Save changes**.

**Mencantumkan nama Anda (opsional).** Buka `README.md`, klik ikon pensil, lalu tambahkan satu baris di bagian atas, misalnya `Built by [Nama Anda](link LinkedIn Anda)`. Klik **Commit changes**. Situs akan ter‑update sendiri dalam 2 menit.

## Setelah tayang

- **Pembaruan otomatis.** Data dibuat ulang setiap hari pukul 07.15 WIB, sehingga tanggal di dashboard selalu "hari ini". Pada tanggal 1 setiap bulan, robot GitHub menyimpan salinan data ke repo. Ini juga mencegah GitHub mematikan jadwal otomatis.
- **Bila jadwal otomatis dimatikan GitHub.** Bila Anda menerima email bahwa *scheduled workflow* dimatikan, buka tab **Actions**, pilih **Build and deploy**, lalu klik **Enable workflow**.
- **Pengaman jejak.** Bila pemeriksa menemukan istilah dari perusahaan lain di repo, deploy berhenti dan situs lama tetap tayang. Detailnya ada di tab **Actions**, pada langkah *Validate data*.
- **Cek pratinjau di LinkedIn.** Sebelum memposting, buka https://www.linkedin.com/post-inspector/ dan tempel link situs. Gambar pratinjau 1200×630 harus muncul.

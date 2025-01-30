const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

const validKeys = ['CALL-LINE.02010', 'LINE-OFFICIAL.0208'];

const domain = 'https://ptero.vcloudxofficial.xyz'; // ISI DOMAIN PANEL 
const apikey = 'ptla_Ml5sUJNPVrsfKRRMXJhIneZXbAFpAaEZVkavmq24N8c'; // ISI APIKEY PANEL
const api = "Wira", // ISI APIKEY WEB
const keyorkut = "589816617365410752160280OKCTF020AC99BFAED0B72FD154AC1E36DE00", // Isi Key Orkuf
const qrcode = "00020101021126670016COM.NOBUBANK.WWW01189360050300000879140214509288104204890303UMI51440014ID.CO.QRIS.WWW0215ID20253689552610303UMI5204541153033605802ID5925REREZZ OFFICIAL OK21602806008SUKABUMI61054311162070703A016304595A", // ISI CODE QR

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Endpoint untuk membuat pembayaran menggunakan QRIS dengan gambar QR langsung
app.post('/create-payment', async (req, res) => {
  const { amount, key } = req.body;
  if (!validKeys.includes(key)) {
    return res.status(403).json({ message: '❌ Kunci key tidak valid!' });
  }
  if (!amount || isNaN(amount)) {
    return res.status(400).json({ message: '❌ Jumlah pembayaran (amount) harus diisi dan berupa angka!' });
  }
  try {
    const response = await fetch(`https://linecloud.my.id/api/orkut/createpayment?apikey=${api}&amount=${amount}&codeqr=${qrcode}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!data.status) {
      return res.status(500).json({ message: `❌ Error: ${data.message || 'Terjadi kesalahan saat membuat pembayaran.'}` });
    }

    const qrBuffer = Buffer.from(data.result.qrImageUrl.split(',')[1], 'base64');
    
    res.setHeader('Content-Type', 'image/png');
    res.status(200).send(qrBuffer);
  } catch (error) {
    res.status(500).json({ message: '❌ Terjadi kesalahan saat membuat pembayaran. Harap coba lagi.' });
  }
});

// Endpoint untuk mengecek status pembayaran
app.post('/cek-status-payment', async (req, res) => {
  const { merchant, keyorkut } = req.body;
  if (!merchant || !keyorkut) {
    return res.status(400).json({ message: '❌ Semua input harus diisi!' });
  }
  try {
    const response = await fetch(`https://linecloud.my.id/api/orkut/cekstatus?apikey=${api}&merchant=${merchant}&keyorkut=${keyorkut}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    if (data.error) {
      return res.status(500).json({ message: `Error: ${data.error}` });
    }
    res.status(200).json({ message: '✅ Status pembayaran berhasil dicek!', statusInfo: data });
  } catch (error) {
    res.status(500).json({ message: '❌ Terjadi kesalahan saat mengecek status pembayaran. Harap coba lagi.' });
  }
});

// Endpoint untuk membuat server hanya jika pembayaran sudah berhasil
app.post('/create-server', async (req, res) => {
  const { username, ram, disk, cpu, key, merchant, keyorkut } = req.body;

  // Validasi kunci dan input lainnya
  if (!validKeys.includes(key)) {
    return res.status(403).json({ message: '❌ Kunci key tidak valid!' });
  }
  if (!username || !ram || !disk || !cpu || !merchant || !keyorkut) {
    return res.status(400).json({ message: '❌ Semua input harus diisi!' });
  }

  // Mengecek status pembayaran terlebih dahulu
  try {
    const paymentResponse = await fetch(`https://linecloud.my.id/api/orkut/cekstatus?apikey=${api}&merchant=${merchant}&keyorkut=${keyorkut}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const paymentData = await paymentResponse.json();

    if (paymentData.error || paymentData.status !== 'paid') {
      return res.status(400).json({ message: '❌ Pembayaran belum berhasil! Harap selesaikan pembayaran terlebih dahulu.' });
    }

    // Pembayaran berhasil, lanjutkan pembuatan server
    const response = await fetch(`https://apis.xyrezz.online-server.biz.id/api/cpanel?domain=${domain}&apikey=${apikey}&username=${username}&ram=${ram}&disk=${disk}&cpu=${cpu}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    if (data.error) {
      return res.status(500).json({ message: `Error: ${data.error}` });
    }
    res.status(200).json({ message: '✅ Server berhasil dibuat!', serverInfo: data });
  } catch (error) {
    res.status(500).json({ message: '❌ Terjadi kesalahan saat membuat server. Harap coba lagi.' });
  }
});

// Routing untuk file statis
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/rerezz', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'style.css'));
});
app.get('/rerez', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'script.js'));
});

// Redirect ke domain
app.get('/domain', (req, res) => {
    res.redirect(`${domain}`); 
});

// Menjalankan server
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
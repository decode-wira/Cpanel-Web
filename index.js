const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const app = express();
const port = 3000;

const validKeys = ['CALL-LINE.02010', 'LINE-OFFICIAL.0208'];

const domain = 'https://ptero.vcloudxofficial.xyz'; // ISI DOMAIN PANEL 
const apikey = 'ptla_Ml5sUJNPVrsfKRRMXJhIneZXbAFpAaEZVkavmq24N8c'; // ISI APIKEY PANEL
const api = "Wira"; // ISI APIKEY WEB
const merchant = "OK2102800"; // ISI ID MERCHANT
const key = '385300517383889032102800OKCT28B616708A47CED2885053EA617079A5'; // Isi Key Orkuf
const qrcode = '00020101021126670016COM.NOBUBANK.WWW01189360050300000879140214757501012374600303UMI51440014ID.CO.QRIS.WWW0215ID20243553591990303UMI5204541153033605802ID5921WILDAN ALFA OK21028006008TABALONG61057157162070703A01630411C2'; // ISI CODE QR

let pendingTransactions = {}; // Penyimpanan sementara transaksi pembayaran

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Endpoint untuk membuat pembayaran dan menghasilkan QR
app.post('/create-payment', async (req, res) => {
  const { amount, api } = req.body;

  if (!amount || !api) {
    return res.status(400).json({ message: '❌ Semua input harus diisi!' });
  }

  try {
    const response = await fetch(`https://linecloud.my.id/api/orkut/createpayment?apikey=${api}&amount=${amount}&codeqr=${qrcode}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ message: `Error: ${data.error}` });
    }

    // Simpan transaksi ke pendingTransactions untuk validasi berikutnya
    pendingTransactions[data.transactionId] = {
      amount: data.amount,
      expirationTime: data.expirationTime,
    };

    // Ambil gambar QR dari URL untuk ditampilkan langsung
    const qrResponse = await fetch(data.qrImageUrl);
    const qrImageBuffer = await qrResponse.buffer();

    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(qrImageBuffer); // Kirim gambar langsung
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '❌ Terjadi kesalahan saat membuat QR Code pembayaran.' });
  }
});

// Endpoint untuk membuat server setelah validasi pembayaran
app.post('/create-server', async (req, res) => {
  const { username, ram, disk, cpu, key, transactionId, api } = req.body;

  if (!validKeys.includes(key)) {
    return res.status(403).json({ message: '❌ Kunci key tidak valid!' });
  }

  if (!username || !ram || !disk || !cpu || !transactionId || !api) {
    return res.status(400).json({ message: '❌ Semua input harus diisi!' });
  }

  // Periksa apakah transaksi pembayaran ada di pendingTransactions
  if (!pendingTransactions[transactionId]) {
    return res.status(404).json({ message: '❌ Transaksi tidak ditemukan!' });
  }

  // Cek status pembayaran
  try {
    const paymentStatusResponse = await fetch(`https://linecloud.my.id/api/orkut/cekstatus?apikey=${api}&merchant=${merchant}&keyorkut=${key}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const paymentStatusData = await paymentStatusResponse.json();

    if (paymentStatusData.status !== 'PAID') {
      return res.status(403).json({ message: '❌ Pembayaran belum selesai!' });
    }

    // Hapus transaksi dari pendingTransactions setelah validasi berhasil
    delete pendingTransactions[transactionId];

    // Buat server
    const serverResponse = await fetch(`https://apis.xyrezz.online-server.biz.id/api/cpanel?domain=${domain}&apikey=${apikey}&username=${username}&ram=${ram}&disk=${disk}&cpu=${cpu}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const serverData = await serverResponse.json();

    if (serverData.error) {
      return res.status(500).json({ message: `Error: ${serverData.error}` });
    }

    res.status(200).json({ message: '✅ Server berhasil dibuat!', serverInfo: serverData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '❌ Terjadi kesalahan saat membuat server. Harap coba lagi.' });
  }
});

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});

const form = document.getElementById('server-form');
const responseMessage = document.getElementById('response-message');
const modal = document.getElementById('serverModal');
const qrModal = document.getElementById('qrModal');
const closeModal = document.querySelector('.close');
const closeQRModal = document.querySelector('.close-qr');

const ramSelect = document.getElementById('ram');
const keyInput = document.getElementById('key');
let transactionId = null; // Untuk menyimpan transactionId pembayaran

form.addEventListener('submit', async function (event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const ramSelection = ramSelect.value;
    const key = keyInput.value; 

    let ram = 0, disk = 0, cpu = 0, amount = 0;

    switch (ramSelection) {
        case 'panel1gb':
            ram = 1000;
            disk = 1000;
            cpu = 50;
            amount = 1000;
            break;
        case 'panel2gb':
            ram = 2000;
            disk = 2000;
            cpu = 100;
            amount = 2000;
            break;
        case 'panel3gb':
            ram = 3000;
            disk = 3000;
            cpu = 150;
            amount = 3000;
            break;
        default:
            return showResponse('❌ Pilihan RAM tidak valid!', true);
    }

    if (!username || !key) {
        return showResponse('❌ Semua input harus diisi!', true);
    }

    try {
        // STEP 1: Buat pembayaran
        const paymentResponse = await fetch('/create-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ amount, api: key.trim() })
        });

        if (!paymentResponse.ok) {
            const paymentError = await paymentResponse.json();
            return showResponse(`❌ Error: ${paymentError.message}`, true);
        }

        const qrBlob = await paymentResponse.blob();
        transactionId = paymentResponse.headers.get('Transaction-ID'); // Ambil transactionId dari header
        if (!transactionId) {
            return showResponse('❌ Transaksi gagal, ID tidak ditemukan!', true);
        }

        // Tampilkan QR Code
        const qrImg = document.getElementById('qr-image');
        qrImg.src = URL.createObjectURL(qrBlob);
        openQRModal();

        // STEP 2: Tunggu konfirmasi pembayaran
        await checkPaymentStatus(username, ram, disk, cpu, key);
    } catch (error) {
        console.error(error);
        showResponse('❌ Terjadi kesalahan saat membuat pembayaran.', true);
    }
});

async function checkPaymentStatus(username, ram, disk, cpu, key) {
    try {
        const checkResponse = await fetch(`/cek-status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ transactionId, key })
        });

        const checkData = await checkResponse.json();

        if (!checkResponse.ok || checkData.status !== 'PAID') {
            return showResponse('❌ Pembayaran belum selesai. Harap selesaikan pembayaran.', true);
        }

        // STEP 3: Buat server setelah pembayaran selesai
        const createResponse = await fetch('/create-server', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, ram, disk, cpu, key, transactionId })
        });

        const createData = await createResponse.json();

        if (!createResponse.ok) {
            return showResponse(`❌ Error: ${createData.message}`, true);
        }

        showResponse(`✅ Server berhasil dibuat! ID Server: ${createData.serverInfo.server.id}`, false);
        displayServerInfo(createData.serverInfo);
        openModal();
    } catch (error) {
        console.error(error);
        showResponse('❌ Terjadi kesalahan saat membuat server. Harap coba lagi.', true);
    }
}

function showResponse(message, isError) {
    responseMessage.textContent = message;
    responseMessage.style.color = isError ? 'red' : 'green';
}

function displayServerInfo(serverInfo) {
    document.getElementById('modal-username').textContent = serverInfo.user.username;
    document.getElementById('modal-password').textContent = serverInfo.credentials.password;
    document.getElementById('modal-domain').textContent = serverInfo.credentials.login_url;
    document.getElementById('modal-id').textContent = serverInfo.server.id;
    document.getElementById('modal-ram').textContent = serverInfo.server.memory + ' MB';
    document.getElementById('modal-disk').textContent = serverInfo.server.disk + ' MB';
    document.getElementById('modal-cpu').textContent = serverInfo.server.cpu + ' %';
    document.getElementById('modal-email').textContent = serverInfo.user.email;
}

function openModal() {
    modal.style.display = 'block';
}

function openQRModal() {
    qrModal.style.display = 'block';
}

closeModal.onclick = function () {
    modal.style.display = 'none';
};

closeQRModal.onclick = function () {
    qrModal.style.display = 'none';
};
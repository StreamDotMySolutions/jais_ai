const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

const client = new Client({
  authStrategy: new LocalAuth()
});

const message = '';

client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('WhatsApp bot dah siap dan online');
});

client.on('message', async msg => {

  let message = '';
  axios({
        method: 'post',
        url: 'http://127.0.0.1:8000/api/whatsappweb',
        data: {
            from: msg.from,
            body: msg.body,
            timestamp: msg.timestamp,
            isGroup: msg.from.includes('@g.us')
        } // sesuaikan URL dengan endpoint Laravel anda
        })
        .then((response) => {
            //console.log(response);
            message = response.data.message;
            console.log('Message sent to webhook, response message: ' + message);
            
            // hantar reply jika ada mesej
            if (message && message !== '') {

              // random delay 1 – 3 saat (1000 – 3000 ms)
              const delay = Math.floor(Math.random() * 2000) + 1000;

              // tambah delay sebelum hantar mesej
              setTimeout(() => {
                  msg.reply(message);
              }, delay);
            } // end if message
            
            
        })
        .catch((error) => {
            console.warn(error);
        });
});

client.initialize();
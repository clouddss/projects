const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require("socket.io");
const { fork } = require('child_process');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

let purchaseProcess;

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    if (parsedUrl.pathname === '/api/start-purchase' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        const { amount, currency, cardDetails, name, street, city, zip, blunrParams } = JSON.parse(body);

        if (purchaseProcess && purchaseProcess.connected) {
          console.log('A purchase process is already running.');
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'A purchase process is already in progress.' }));
          return;
        }

        purchaseProcess = fork(path.join(__dirname, 'lib', 'make-transaction.js'), [], {
          env: {
            ...process.env,
            AMOUNT: amount,
            CURRENCY: currency,
            CARD_NUMBER: cardDetails.cardNumber,
            EXPIRY_DATE: cardDetails.expiryDate,
            CVV: cardDetails.cvv,
            NAME: name,
            STREET: street,
            CITY: city,
            ZIP: zip,
            // Blunr parameters
            BLUNR_PARAMS: JSON.stringify(blunrParams || {})
          }
        });

        purchaseProcess.on('message', (message) => {
          if (message.type === 'bankid-detected') {
            console.log('BankID detected by child process, emitting to frontend.');
            io.emit('show-bankid-prompt');
          } else if (message.type === 'purchase-complete') {
            console.log('Purchase complete message from child, emitting to frontend.');
            io.emit('purchase-complete', message.data);
          }
        });

        purchaseProcess.on('error', (err) => {
          console.error('Failed to start purchase process:', err);
          io.emit('purchase-error', { error: 'Failed to start purchase process.' });
          purchaseProcess = null;
        });

        purchaseProcess.on('exit', (code) => {
          console.log(`Purchase process exited with code ${code}`);
          if (code !== 0) {
            console.log('Purchase process exited with a non-zero code. Emitting error to frontend.');
            io.emit('purchase-error', { error: 'The purchase process failed. Please try again.' });
          }
          purchaseProcess = null; // Allow a new process to start
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Purchase process started' }));
      });
    } else {
      handle(req, res, parsedUrl)
    }
  }).listen(3000, (err) => {
    if (err) throw err
    console.log('> Ready on http://localhost:3000')
  })

  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 10000,
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    console.log(`A user connected with socket ID: ${socket.id}`);

    socket.on('disconnect', (reason) => {
      console.log(`User with socket ID: ${socket.id} disconnected. Reason: ${reason}`);
    });

    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  // We need to be able to access the io instance from our API routes.
  // A simple way to do this is to attach it to the server instance.
  // server.io = io; // This is not needed anymore
})
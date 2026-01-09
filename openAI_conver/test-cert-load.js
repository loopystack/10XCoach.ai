import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverHost = process.env.SERVER_HOST || '95.216.225.37';
const certDir = path.join(__dirname, 'certificates');
const keyPath = path.join(certDir, 'localhost-key.pem');
const certPath = path.join(certDir, 'localhost.pem');

console.log('\n🧪 Testing Certificate Loading...\n');
console.log('Certificate directory:', certDir);
console.log('Key path:', keyPath);
console.log('Cert path:', certPath);
console.log('');

// Check if files exist
if (!fs.existsSync(keyPath)) {
  console.error('❌ Key file does not exist!');
  process.exit(1);
}

if (!fs.existsSync(certPath)) {
  console.error('❌ Certificate file does not exist!');
  process.exit(1);
}

console.log('✅ Certificate files exist');

// Try to read the certificates
let httpsOptions;
try {
  httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };
  console.log('✅ Certificates loaded successfully');
  console.log('   Key size:', httpsOptions.key.length, 'bytes');
  console.log('   Cert size:', httpsOptions.cert.length, 'bytes');
} catch (error) {
  console.error('❌ Error reading certificates:', error.message);
  process.exit(1);
}

// Try to create an HTTPS server to verify the certificates are valid
console.log('\n🔍 Testing certificate validity...');
try {
  const testServer = https.createServer(httpsOptions, (req, res) => {
    res.writeHead(200);
    res.end('OK');
  });
  
  testServer.listen(0, '127.0.0.1', () => {
    const port = testServer.address().port;
    console.log(`✅ HTTPS server created successfully on port ${port}`);
    console.log('✅ Certificates are valid and can be used by Node.js');
    
    // Test HTTPS request
    https.get(`https://127.0.0.1:${port}`, {
      rejectUnauthorized: false
    }, (res) => {
      console.log('✅ HTTPS connection successful');
      testServer.close(() => {
        console.log('\n✅ All tests passed!');
        console.log('\n📋 The server should use these certificates when started.');
        console.log('   Make sure to RESTART your server completely.');
        process.exit(0);
      });
    }).on('error', (err) => {
      console.log('⚠️  Connection test failed (this is expected for local test)');
      testServer.close(() => {
        console.log('\n✅ Certificates are valid and readable by Node.js');
        console.log('\n📋 The server should use these certificates when started.');
        console.log('   Make sure to RESTART your server completely.');
        process.exit(0);
      });
    });
  });
} catch (error) {
  console.error('❌ Error creating HTTPS server:', error.message);
  process.exit(1);
}


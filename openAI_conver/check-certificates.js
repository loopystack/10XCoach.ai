import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const certDir = path.join(__dirname, 'certificates');
const keyPath = path.join(certDir, 'localhost-key.pem');
const certPath = path.join(certDir, 'localhost.pem');

console.log('\n🔍 Checking SSL Certificate Setup...\n');

// Check if certificates directory exists
if (!fs.existsSync(certDir)) {
  console.log('❌ Certificates directory does not exist!');
  console.log('   Run: mkdir certificates');
  process.exit(1);
}

console.log('✅ Certificates directory exists');

// Check if certificate files exist
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  console.log('✅ Certificate files found:');
  const keyStats = fs.statSync(keyPath);
  const certStats = fs.statSync(certPath);
  console.log(`   - localhost-key.pem (${keyStats.size} bytes)`);
  console.log(`   - localhost.pem (${certStats.size} bytes)`);
  
  // Try to read the certificates
  try {
    const key = fs.readFileSync(keyPath);
    const cert = fs.readFileSync(certPath);
    console.log('✅ Certificates are readable');
    
    // Check if they're valid PEM format
    if (key.toString().includes('BEGIN PRIVATE KEY') || key.toString().includes('BEGIN RSA PRIVATE KEY')) {
      console.log('✅ Key file appears to be valid');
    } else {
      console.log('⚠️  Key file format may be invalid');
    }
    
    if (cert.toString().includes('BEGIN CERTIFICATE')) {
      console.log('✅ Certificate file appears to be valid');
    } else {
      console.log('⚠️  Certificate file format may be invalid');
    }
    
    console.log('\n✅ Everything looks good!');
    console.log('\n📋 Next steps:');
    console.log('   1. Make sure mkcert -install was run (as Administrator)');
    console.log('   2. Restart your server completely');
    console.log('   3. Clear browser cache or use incognito mode');
    console.log('   4. Access https://95.216.225.37:5000');
    console.log('\n✅ The server should automatically use these certificates when restarted.');
    
  } catch (error) {
    console.error('❌ Error reading certificates:', error.message);
    process.exit(1);
  }
} else {
  console.log('❌ Certificate files not found!');
  console.log('   Expected files:');
  console.log(`   - ${keyPath}`);
  console.log(`   - ${certPath}`);
  console.log('\n💡 Generate certificates by running:');
  console.log('   cd certificates');
  console.log('   mkcert localhost 95.216.225.37 127.0.0.1 0.0.0.0');
  console.log('   Then rename the files to localhost.pem and localhost-key.pem');
  process.exit(1);
}


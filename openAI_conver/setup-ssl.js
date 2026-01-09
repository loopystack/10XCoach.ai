import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverHost = process.env.SERVER_HOST || '95.216.225.37';
const certDir = path.join(__dirname, 'certificates');

console.log('🔒 SSL Certificate Setup for openAI_conver\n');
console.log('This script will help you set up valid SSL certificates to remove browser warnings.\n');

// Create certificates directory
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir, { recursive: true });
  console.log('✅ Created certificates directory');
}

// Check if mkcert is installed
let mkcertInstalled = false;
try {
  execSync('mkcert -version', { stdio: 'ignore' });
  mkcertInstalled = true;
  console.log('✅ mkcert is installed');
} catch (error) {
  console.log('❌ mkcert is not installed');
}

if (!mkcertInstalled) {
  console.log('\n📦 Installing mkcert...\n');
  console.log('Please install mkcert using one of these methods:\n');
  console.log('Windows (PowerShell as Administrator):');
  console.log('  choco install mkcert\n');
  console.log('Or download from: https://github.com/FiloSottile/mkcert/releases/latest');
  console.log('Extract mkcert.exe and add it to your PATH\n');
  console.log('macOS:');
  console.log('  brew install mkcert\n');
  console.log('Linux:');
  console.log('  sudo apt install mkcert\n');
  console.log('\nAfter installing, run this script again.\n');
  process.exit(1);
}

// Install local CA
console.log('\n🔐 Installing local CA (this may require admin privileges)...');
try {
  execSync('mkcert -install', { stdio: 'inherit' });
  console.log('✅ Local CA installed successfully');
} catch (error) {
  console.error('❌ Failed to install local CA. Please run: mkcert -install');
  process.exit(1);
}

// Generate certificates
console.log(`\n📜 Generating SSL certificates for ${serverHost}...`);
try {
  process.chdir(certDir);
  execSync(`mkcert localhost ${serverHost} 127.0.0.1 0.0.0.0`, { stdio: 'inherit' });
  
  // Find the generated files
  const files = fs.readdirSync(certDir);
  const certFile = files.find(f => f.includes('.pem') && !f.includes('-key'));
  const keyFile = files.find(f => f.includes('-key.pem'));
  
  if (certFile && keyFile) {
    // Rename to expected names
    if (certFile !== 'localhost.pem') {
      fs.renameSync(path.join(certDir, certFile), path.join(certDir, 'localhost.pem'));
      console.log(`✅ Renamed ${certFile} to localhost.pem`);
    }
    if (keyFile !== 'localhost-key.pem') {
      fs.renameSync(path.join(certDir, keyFile), path.join(certDir, 'localhost-key.pem'));
      console.log(`✅ Renamed ${keyFile} to localhost-key.pem`);
    }
    
    console.log('\n✅ SSL certificates generated successfully!');
    console.log('\n📍 Certificate files:');
    console.log(`   - ${path.join(certDir, 'localhost.pem')}`);
    console.log(`   - ${path.join(certDir, 'localhost-key.pem')}`);
    console.log('\n🎉 Setup complete! Restart your server and the browser warning will be gone!');
    console.log('\n✅ Your server will automatically use these certificates.');
    console.log('✅ No more "Your connection is not private" warning!');
  } else {
    console.error('❌ Certificate files not found after generation');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Failed to generate certificates:', error.message);
  process.exit(1);
}


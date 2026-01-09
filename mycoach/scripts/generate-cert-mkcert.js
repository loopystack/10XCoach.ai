const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const certDir = path.join(__dirname, '..', 'certificates')
const keyPath = path.join(certDir, 'localhost-key.pem')
const certPath = path.join(certDir, 'localhost.pem')
const ipAddress = '95.216.225.37'

// Create certificates directory if it doesn't exist
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir, { recursive: true })
  console.log('✅ Created certificates directory')
}

console.log('🔑 Generating SSL certificate using mkcert (no browser warnings!)...')

// Check if mkcert is installed
let mkcertAvailable = false
try {
  execSync('mkcert -version', { stdio: 'ignore' })
  mkcertAvailable = true
} catch {
  console.log('⚠️  mkcert is not installed')
  console.log('\n💡 To avoid browser warnings, install mkcert:')
  console.log('   Windows: choco install mkcert')
  console.log('   Or download from: https://github.com/FiloSottile/mkcert/releases')
  console.log('\n   Then run:')
  console.log('   1. mkcert -install')
  console.log('   2. npm run generate-cert-mkcert')
  console.log('\n⚠️  Falling back to self-signed certificates (will show browser warning)')
  console.log('   Run: npm run generate-cert')
  process.exit(1)
}

try {
  // Change to certificates directory
  process.chdir(certDir)
  
  // Install local CA (if not already installed)
  console.log('📦 Installing local CA (if needed)...')
  try {
    execSync('mkcert -install', { stdio: 'inherit' })
  } catch (e) {
    // CA might already be installed, that's okay
    if (!e.message.includes('already installed')) {
      console.log('⚠️  Note: Local CA installation had issues, but continuing...')
    }
  }
  
  // Generate certificates
  console.log(`🔐 Generating certificates for localhost, ${ipAddress}, 127.0.0.1, 0.0.0.0...`)
  execSync(`mkcert localhost ${ipAddress} 127.0.0.1 0.0.0.0`, { stdio: 'inherit' })
  
  // Find the generated files (mkcert creates files like localhost+3.pem)
  const files = fs.readdirSync(certDir)
  const certFile = files.find(f => f.endsWith('.pem') && !f.includes('key') && !f.includes('localhost.pem'))
  const keyFile = files.find(f => f.includes('key') && f.endsWith('.pem') && !f.includes('localhost-key.pem'))
  
  if (certFile && keyFile) {
    // Rename to match server.js expectations
    const oldCertPath = path.join(certDir, certFile)
    const oldKeyPath = path.join(certDir, keyFile)
    
    // Remove old files if they exist
    if (fs.existsSync(certPath)) fs.unlinkSync(certPath)
    if (fs.existsSync(keyPath)) fs.unlinkSync(keyPath)
    
    // Rename new files
    fs.renameSync(oldCertPath, certPath)
    fs.renameSync(oldKeyPath, keyPath)
    
    console.log('\n✅ SSL certificates generated successfully using mkcert!')
    console.log(`   Private Key: ${keyPath}`)
    console.log(`   Certificate: ${certPath}`)
    console.log('\n🎉 No browser warnings! The page will load automatically.')
    console.log('\n💡 Start your server with: npm run dev:https')
  } else {
    throw new Error('Could not find generated certificate files')
  }
  
} catch (error) {
  console.error('\n❌ Error generating certificates with mkcert:', error.message)
  console.error('\n💡 Make sure mkcert is installed and in your PATH:')
  console.error('   Windows: choco install mkcert')
  console.error('   Or download from: https://github.com/FiloSottile/mkcert/releases')
  process.exit(1)
}


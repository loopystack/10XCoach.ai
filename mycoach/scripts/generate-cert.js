const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const certDir = path.join(__dirname, '..', 'certificates')
const keyPath = path.join(certDir, 'localhost-key.pem')
const certPath = path.join(certDir, 'localhost.pem')
const configPath = path.join(certDir, 'cert.conf')

// Create certificates directory if it doesn't exist
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir, { recursive: true })
  console.log('✅ Created certificates directory')
}

// Create OpenSSL config file with Subject Alternative Names (SAN)
// This includes both localhost and the IP address to avoid certificate errors
const opensslConfig = `[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=US
ST=State
L=City
O=Development
CN=95.216.225.37

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = 95.216.225.37
IP.1 = 127.0.0.1
IP.2 = 95.216.225.37
IP.3 = 0.0.0.0
`

try {
  // Write OpenSSL config file
  fs.writeFileSync(configPath, opensslConfig)
  console.log('✅ Created OpenSSL configuration file')

  // Generate private key
  console.log('🔑 Generating private key...')
  execSync(
    `openssl genrsa -out "${keyPath}" 2048`,
    { stdio: 'inherit' }
  )

  // Generate certificate signing request
  console.log('📝 Generating certificate signing request...')
  execSync(
    `openssl req -new -key "${keyPath}" -out "${path.join(certDir, 'localhost.csr')}" -config "${configPath}"`,
    { stdio: 'inherit' }
  )

  // Generate self-signed certificate with SAN
  console.log('🔐 Generating self-signed certificate with Subject Alternative Names...')
  execSync(
    `openssl x509 -req -in "${path.join(certDir, 'localhost.csr')}" -signkey "${keyPath}" -out "${certPath}" -days 365 -extensions v3_req -extfile "${configPath}"`,
    { stdio: 'inherit' }
  )

  // Clean up CSR file
  const csrPath = path.join(certDir, 'localhost.csr')
  if (fs.existsSync(csrPath)) {
    fs.unlinkSync(csrPath)
  }

  console.log('\n✅ SSL certificates generated successfully!')
  console.log(`   Key: ${keyPath}`)
  console.log(`   Cert: ${certPath}`)
  console.log('\n⚠️  Note: These are self-signed certificates.')
  console.log('   Browsers will still show a warning, but you can proceed safely.')
  console.log('\n💡 For production, use a proper SSL certificate from a trusted CA.')
  console.log('💡 For development without warnings, use mkcert: https://github.com/FiloSottile/mkcert')
  
} catch (error) {
  console.error('\n❌ Error generating certificates:', error.message)
  console.error('\n💡 Make sure OpenSSL is installed:')
  console.error('   - Windows: Install OpenSSL from https://slproweb.com/products/Win32OpenSSL.html')
  console.error('   - macOS: brew install openssl')
  console.error('   - Linux: sudo apt-get install openssl')
  process.exit(1)
}




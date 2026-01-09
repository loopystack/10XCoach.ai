const forge = require('node-forge')
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

console.log('🔑 Generating SSL certificate using node-forge (pure JavaScript)...')

try {
  // Generate a key pair
  const keys = forge.pki.rsa.generateKeyPair(2048)
  console.log('✅ Key pair generated')

  // Create a certificate
  const cert = forge.pki.createCertificate()
  cert.publicKey = keys.publicKey
  cert.serialNumber = '01' + Math.floor(Math.random() * 1000000000).toString(16)

  // Set certificate validity (1 year)
  cert.validity.notBefore = new Date()
  cert.validity.notAfter = new Date()
  cert.validity.notAfter.setFullYear(cert.validity.notAfter.getFullYear() + 1)

  // Set certificate subject and issuer
  const attrs = [
    { name: 'countryName', value: 'US' },
    { name: 'organizationName', value: 'Development' },
    { name: 'commonName', value: 'localhost' }
  ]
  cert.setSubject(attrs)
  cert.setIssuer(attrs)

  // Set extensions
  cert.setExtensions([
    {
      name: 'basicConstraints',
      cA: false
    },
    {
      name: 'keyUsage',
      keyCertSign: false,
      digitalSignature: true,
      keyEncipherment: true
    },
    {
      name: 'subjectAltName',
      altNames: [
        { type: 2, value: 'localhost' }, // DNS
        { type: 7, ip: '127.0.0.1' },   // IP
        { type: 7, ip: ipAddress },      // IP
        { type: 7, ip: '0.0.0.0' }       // IP
      ]
    }
  ])

  // Sign the certificate with the private key
  cert.sign(keys.privateKey, forge.md.sha256.create())
  console.log('✅ Certificate signed')

  // Convert to PEM format
  const certPem = forge.pki.certificateToPem(cert)
  const keyPem = forge.pki.privateKeyToPem(keys.privateKey)

  // Write to files
  fs.writeFileSync(certPath, certPem)
  fs.writeFileSync(keyPath, keyPem)

  console.log('\n✅ SSL certificates generated successfully!')
  console.log(`   Private Key: ${keyPath}`)
  console.log(`   Certificate: ${certPath}`)
  console.log('\n⚠️  Note: These are self-signed certificates.')
  console.log('   Browsers will show a warning, but you can proceed safely.')
  console.log('   Click "Advanced" -> "Proceed to 95.216.225.37 (unsafe)" to continue.')
  console.log('\n💡 For development without warnings, consider using "mkcert":')
  console.log('   choco install mkcert')
  console.log('   mkcert -install')
  console.log('   mkcert localhost 95.216.225.37')
  
} catch (error) {
  console.error('\n❌ Error generating certificates:', error.message)
  console.error(error.stack)
  console.error('\n💡 Alternative options:')
  console.error('   1. Install mkcert: choco install mkcert')
  console.error('   2. Install OpenSSL: https://slproweb.com/products/Win32OpenSSL.html')
  process.exit(1)
}

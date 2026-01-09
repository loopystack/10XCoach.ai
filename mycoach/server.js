const { createServer } = require('https')
const { parse } = require('url')
const next = require('next')
const fs = require('fs')
const path = require('path')

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const port = 5000

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

// SSL Certificate paths
const certDir = path.join(__dirname, 'certificates')
const keyPath = path.join(certDir, 'localhost-key.pem')
const certPath = path.join(certDir, 'localhost.pem')

// Check if certificates exist
let httpsOptions = null

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  // Use existing certificates
  try {
    httpsOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    }
    console.log('✅ Using existing SSL certificates from certificates/ directory')
  } catch (error) {
    console.error('❌ Error reading certificates:', error.message)
    process.exit(1)
  }
} else {
  console.error('❌ SSL certificates not found!')
  console.error(`   Expected files:`)
  console.error(`   - ${keyPath}`)
  console.error(`   - ${certPath}`)
  console.error('\n💡 To generate certificates, run: npm run generate-cert')
  console.error('💡 Or place your own certificates in the certificates/ directory')
  console.error('💡 For production, use proper SSL certificates from a trusted CA')
  process.exit(1)
}

app.prepare().then(() => {
  createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  }).listen(port, hostname, (err) => {
    if (err) throw err
    console.log(`> Ready on https://${hostname === '0.0.0.0' ? 'localhost' : hostname}:${port}`)
    console.log(`> Also accessible at https://95.216.225.37:${port}`)
    console.log(`> Environment: ${dev ? 'development' : 'production'}`)
  })
})


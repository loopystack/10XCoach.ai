/**
 * SMTP Connection Test Script
 * 
 * This script tests your SMTP configuration to ensure emails can be sent.
 * 
 * Usage:
 *   node test-smtp.js
 * 
 * Or with environment variables:
 *   SMTP_HOST=smtpout.secureserver.net SMTP_PORT=465 SMTP_USERNAME=support@10xcoach.ai SMTP_PASSWORD=yourpassword node test-smtp.js
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

// Get SMTP settings from environment variables or use defaults
// Defaults to Zoho Mail (recommended), but can be changed via env vars
const smtpHost = process.env.SMTP_HOST || 'smtp.zoho.com';
const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
const smtpUsername = process.env.SMTP_USERNAME || process.env.SMTP_USER;
const smtpPassword = process.env.SMTP_PASSWORD;
const smtpFromEmail = process.env.SMTP_FROM_EMAIL || smtpUsername;
const testEmail = process.argv[2] || process.env.TEST_EMAIL || smtpUsername;

console.log('\n🔍 Testing SMTP Configuration...\n');
console.log('Configuration:');
console.log(`  Host: ${smtpHost}`);
console.log(`  Port: ${smtpPort}`);
console.log(`  Username: ${smtpUsername || 'NOT SET'}`);
console.log(`  From Email: ${smtpFromEmail || 'NOT SET'}`);
console.log(`  Test Email To: ${testEmail}\n`);

if (!smtpUsername || !smtpPassword) {
  console.error('❌ Error: SMTP_USERNAME and SMTP_PASSWORD must be set');
  console.log('\nSet them as environment variables:');
  console.log('  export SMTP_USERNAME=support@10xcoach.ai');
  console.log('  export SMTP_PASSWORD=yourpassword');
  console.log('\nOr create a .env file with:');
  console.log('  SMTP_HOST=smtp.zoho.com (or smtpout.secureserver.net for GoDaddy)');
  console.log('  SMTP_PORT=465');
  console.log('  SMTP_USERNAME=support@10xcoach.ai');
  console.log('  SMTP_PASSWORD=yourpassword');
  process.exit(1);
}

// Create transporter
const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465, // true for 465, false for other ports
  auth: {
    user: smtpUsername,
    pass: smtpPassword
  }
});

async function testSMTP() {
  try {
    console.log('📡 Verifying SMTP connection...');
    
    // Verify connection
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!\n');
    
    // Send test email
    console.log(`📧 Sending test email to ${testEmail}...`);
    
    const info = await transporter.sendMail({
      from: `"10XCoach.ai Test" <${smtpFromEmail}>`,
      to: testEmail,
      subject: 'Test Email from 10XCoach.ai',
      html: `
        <h2>✅ SMTP Configuration Test Successful!</h2>
        <p>This is a test email from your 10XCoach.ai application.</p>
        <p>If you received this email, your SMTP configuration is working correctly.</p>
        <hr>
        <p><small>Sent at: ${new Date().toLocaleString()}</small></p>
      `,
      text: 'This is a test email from your 10XCoach.ai application. If you received this email, your SMTP configuration is working correctly.'
    });
    
    console.log('✅ Test email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response: ${info.response}`);
    console.log('\n📬 Please check your inbox (and spam folder) for the test email.\n');
    
  } catch (error) {
    console.error('\n❌ SMTP Test Failed!\n');
    console.error('Error details:');
    console.error(`  Message: ${error.message}`);
    
    if (error.code) {
      console.error(`  Code: ${error.code}`);
    }
    
    // Provide helpful error messages
    if (error.message.includes('Invalid login')) {
      console.error('\n💡 Tip: Check your username and password.');
      console.error('   - Username should be the full email address (e.g., support@10xcoach.ai)');
      console.error('   - Password should be the email account password');
    } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
      console.error('\n💡 Tip: Connection failed. Check:');
      console.error('   - SMTP host is correct (smtpout.secureserver.net for GoDaddy)');
      console.error('   - Port is correct (465 for SSL, 587 for TLS)');
      console.error('   - Firewall allows outbound connections');
    } else if (error.message.includes('certificate')) {
      console.error('\n💡 Tip: SSL/TLS certificate issue. Try port 587 with TLS instead of 465.');
    }
    
    console.error('\n');
    process.exit(1);
  }
}

testSMTP();


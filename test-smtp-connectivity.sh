#!/bin/bash
# Test SMTP connectivity from VPS server

echo "Testing connectivity to Zoho SMTP servers..."
echo ""

# Test port 465 (SSL)
echo "1. Testing port 465 (SSL)..."
timeout 5 bash -c "</dev/tcp/smtp.zoho.com/465" 2>/dev/null && echo "   ✅ Port 465 is reachable" || echo "   ❌ Port 465 is BLOCKED or unreachable"

# Test port 587 (TLS)
echo "2. Testing port 587 (TLS)..."
timeout 5 bash -c "</dev/tcp/smtp.zoho.com/587" 2>/dev/null && echo "   ✅ Port 587 is reachable" || echo "   ❌ Port 587 is BLOCKED or unreachable"

# Test DNS resolution
echo "3. Testing DNS resolution..."
nslookup smtp.zoho.com > /dev/null 2>&1 && echo "   ✅ DNS resolution works" || echo "   ❌ DNS resolution failed"

# Test with telnet (if available)
echo "4. Testing with telnet (port 587)..."
timeout 5 telnet smtp.zoho.com 587 2>/dev/null | head -1 && echo "   ✅ Telnet connection successful" || echo "   ❌ Telnet connection failed"

# Test with openssl (if available)
echo "5. Testing SSL connection (port 465)..."
timeout 5 openssl s_client -connect smtp.zoho.com:465 -quiet </dev/null 2>&1 | head -1 && echo "   ✅ SSL connection successful" || echo "   ❌ SSL connection failed"

echo ""
echo "If all tests show ❌, your server cannot reach Zoho SMTP servers."
echo "This is likely a firewall or hosting provider restriction."
echo ""
echo "SOLUTIONS:"
echo "1. Contact your hosting provider to unblock SMTP ports"
echo "2. Try a different SMTP service (Gmail, SendGrid, Mailgun)"
echo "3. Use a mail relay service"
echo "4. Check if your VPS has outbound internet access"


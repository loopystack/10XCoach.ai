# How to Request SMTP Unblocking from DigitalOcean

## Step 1: Contact DigitalOcean Support

1. Go to: https://cloud.digitalocean.com/support
2. Create a support ticket
3. Subject: "Request to Unblock Outbound SMTP Ports 465 and 587"

## Step 2: Include This Information in Your Ticket

```
Subject: Request to Unblock Outbound SMTP Ports

Hello DigitalOcean Support,

I need to send emails from my droplet using SMTP (ports 465 and 587) for legitimate business purposes. Currently, outbound connections to SMTP servers are being blocked at the network level.

Droplet Details:
- IP Address: [Your droplet IP]
- Region: NYC3
- Purpose: Sending transactional emails (quiz results, notifications) for 10XCoach.ai

I have confirmed:
- DNS resolution works (can resolve smtp.zoho.com)
- UFW firewall allows outbound on ports 465/587
- No firewall rules blocking these ports
- But connections timeout when trying to connect to SMTP servers

Please unblock outbound SMTP connections on ports 465 and 587 for this droplet.

Thank you!
```

## Step 3: Wait for Response

DigitalOcean typically responds within 24-48 hours. They may ask you to:
- Verify your account
- Explain your use case
- Confirm you'll follow anti-spam policies

## Alternative: Use HTTP-Based Email Service

If unblocking takes too long or is denied, use SendGrid or Mailgun (they use HTTP API, not SMTP ports).


/**
 * Email service for sending coaching notes
 * Supports SMTP, AWS SES and SendGrid
 */

import nodemailer from 'nodemailer'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

/**
 * Get email settings from server API or environment variables
 */
async function getEmailSettings(): Promise<{ emailService: string; fromEmail: string }> {
  // Check for SMTP configuration first (highest priority)
  if (process.env.SMTP_HOST && process.env.SMTP_USERNAME && process.env.SMTP_PASSWORD) {
    return {
      emailService: 'smtp',
      fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USERNAME || 'coach@10xcoach.ai'
    }
  }

  try {
    const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'https://95.216.225.37:3000'
    const response = await fetch(`${dashboardUrl}/api/admin/settings`)
    
    if (response.ok) {
      const settings = await response.json()
      const settingsMap: Record<string, any> = {}
      if (Array.isArray(settings)) {
        settings.forEach((s: any) => {
          if (s.key && s.value) {
            settingsMap[s.key] = s.value
          }
        })
      }
      
      return {
        emailService: settingsMap.emailService || process.env.EMAIL_SERVICE || 'console',
        fromEmail: settingsMap.fromEmail || process.env.FROM_EMAIL || 'coach@10xcoach.ai'
      }
    }
  } catch (error) {
    console.error('Failed to fetch email settings from server:', error)
  }
  
  // Fallback to environment variables
  return {
    emailService: process.env.EMAIL_SERVICE || 'console',
    fromEmail: process.env.FROM_EMAIL || 'coach@10xcoach.ai'
  }
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const { emailService, fromEmail } = await getEmailSettings()

  if (emailService === 'console') {
    // Development: log email to console
    console.log('\n' + '='.repeat(70))
    console.log('📧 EMAIL')
    console.log('='.repeat(70))
    console.log(`To: ${options.to}`)
    console.log(`Subject: ${options.subject}`)
    console.log(`\n${options.text || options.html}`)
    console.log('='.repeat(70) + '\n')
    return
  }

  if (emailService === 'smtp') {
    return sendViaSMTP({ ...options, from: fromEmail })
  }

  if (emailService === 'ses') {
    return sendViaSES({ ...options, from: fromEmail })
  }

  if (emailService === 'sendgrid') {
    return sendViaSendGrid({ ...options, from: fromEmail })
  }

  throw new Error(`Unknown email service: ${emailService}`)
}

async function sendViaSMTP(options: EmailOptions & { from: string }): Promise<void> {
  const smtpHost = process.env.SMTP_HOST
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10)
  const smtpUsername = process.env.SMTP_USERNAME
  const smtpPassword = process.env.SMTP_PASSWORD
  const smtpFromEmail = process.env.SMTP_FROM_EMAIL || options.from
  const smtpFromName = process.env.SMTP_FROM_NAME || 'Coach Alan'

  if (!smtpHost || !smtpUsername || !smtpPassword) {
    throw new Error('SMTP configuration is incomplete. Please set SMTP_HOST, SMTP_USERNAME, and SMTP_PASSWORD environment variables.')
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for other ports
    auth: {
      user: smtpUsername,
      pass: smtpPassword,
    },
  })

  // Verify connection
  await transporter.verify()

  // Send email
  const info = await transporter.sendMail({
    from: `"${smtpFromName}" <${smtpFromEmail}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text || options.html,
  })

  console.log('[Email] Message sent via SMTP:', info.messageId)
}

async function sendViaSES(options: EmailOptions & { from: string }): Promise<void> {
  // TODO: Implement AWS SES
  // const AWS = require('aws-sdk')
  // const ses = new AWS.SES({ region: process.env.AWS_REGION || 'us-east-1' })
  // 
  // await ses.sendEmail({
  //   Source: options.from,
  //   Destination: { ToAddresses: [options.to] },
  //   Message: {
  //     Subject: { Data: options.subject },
  //     Body: {
  //       Html: { Data: options.html },
  //       Text: { Data: options.text || options.html },
  //     },
  //   },
  // }).promise()
  
  throw new Error('AWS SES not implemented yet. Set EMAIL_SERVICE=console for development.')
}

async function sendViaSendGrid(options: EmailOptions & { from: string }): Promise<void> {
  // TODO: Implement SendGrid
  // const sgMail = require('@sendgrid/mail')
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
  // 
  // await sgMail.send({
  //   to: options.to,
  //   from: options.from,
  //   subject: options.subject,
  //   html: options.html,
  //   text: options.text || options.html,
  // })
  
  throw new Error('SendGrid not implemented yet. Set EMAIL_SERVICE=console for development.')
}

/**
 * Generate HTML email template for coaching notes
 */
export function generateNotesEmailHTML(notes: {
  summary: string
  pillars: string[]
  insights: string[]
  actions: string[]
  redFlags?: string | null
  nextFocus?: string | null
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    h1 { margin: 0; font-size: 24px; }
    h2 { color: #4F46E5; margin-top: 24px; margin-bottom: 12px; font-size: 18px; }
    ul { padding-left: 20px; }
    li { margin-bottom: 8px; }
    .pillar { display: inline-block; background: #E0E7FF; color: #4F46E5; padding: 4px 12px; border-radius: 12px; margin: 4px 4px 4px 0; font-size: 14px; }
    .red-flag { background: #FEE2E2; color: #991B1B; padding: 12px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #EF4444; }
    .next-focus { background: #DBEAFE; color: #1E40AF; padding: 12px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #3B82F6; }
    .footer { text-align: center; margin-top: 32px; padding-top: 20px; border-top: 1px solid #E5E7EB; color: #6B7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎯 Your Coaching Session Summary</h1>
  </div>
  <div class="content">
    <h2>Session Summary</h2>
    <p>${notes.summary}</p>

    <h2>Pillars Touched</h2>
    <div>
      ${notes.pillars.map(pillar => `<span class="pillar">${pillar}</span>`).join('')}
    </div>

    <h2>Key Insights</h2>
    <ul>
      ${notes.insights.map(insight => `<li>${insight}</li>`).join('')}
    </ul>

    <h2>Action Steps</h2>
    <ol>
      ${notes.actions.map(action => `<li>${action}</li>`).join('')}
    </ol>

    ${notes.redFlags ? `
    <div class="red-flag">
      <strong>⚠️ Red Flags:</strong> ${notes.redFlags}
    </div>
    ` : ''}

    ${notes.nextFocus ? `
    <div class="next-focus">
      <strong>🎯 Next Focus:</strong> ${notes.nextFocus}
    </div>
    ` : ''}

    <div class="footer">
      <p>Thank you for your session with Coach Alan!</p>
      <p>— 10XCoach.ai</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Generate plain text email for coaching notes
 */
export function generateNotesEmailText(notes: {
  summary: string
  pillars: string[]
  insights: string[]
  actions: string[]
  redFlags?: string | null
  nextFocus?: string | null
}): string {
  return `
🎯 Your Coaching Session Summary

SESSION SUMMARY
${notes.summary}

PILLARS TOUCHED
${notes.pillars.join(', ')}

KEY INSIGHTS
${notes.insights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}

ACTION STEPS
${notes.actions.map((action, i) => `${i + 1}. ${action}`).join('\n')}

${notes.redFlags ? `\n⚠️  RED FLAGS\n${notes.redFlags}\n` : ''}
${notes.nextFocus ? `\n🎯 NEXT FOCUS\n${notes.nextFocus}\n` : ''}

Thank you for your session with Coach Alan!
— 10XCoach.ai
  `.trim()
}


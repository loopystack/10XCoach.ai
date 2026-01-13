const nodemailer = require('nodemailer');
const prisma = require('./prisma');

/**
 * Get email settings from database or environment variables
 * Database settings take priority over environment variables
 */
const getEmailSettings = async () => {
  let settingsMap = {};
  
  try {
    // Try to get settings from database
    const settings = await prisma.adminSettings.findMany();
    settings.forEach(s => {
      if (s.key && s.value) {
        settingsMap[s.key] = s.value;
      }
    });
  } catch (error) {
    console.warn('Could not load email settings from database, using environment variables:', error.message);
  }

  return {
    smtpHost: settingsMap.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: parseInt(settingsMap.smtpPort || process.env.SMTP_PORT || '465', 10),
    smtpUsername: settingsMap.smtpUsername || process.env.SMTP_USERNAME || process.env.SMTP_USER,
    smtpPassword: settingsMap.smtpPassword || process.env.SMTP_PASSWORD,
    smtpFromEmail: settingsMap.smtpFromEmail || process.env.SMTP_FROM_EMAIL || settingsMap.smtpUsername || process.env.SMTP_USERNAME || process.env.SMTP_USER,
    smtpFromName: settingsMap.smtpFromName || process.env.SMTP_FROM_NAME || '10XCoach.ai',
    clientEmail: settingsMap.clientEmail || process.env.CLIENT_EMAIL || 'hitech.proton@gmail.com'
  };
};

// Create reusable transporter using SMTP
const createTransporter = async () => {
  const settings = await getEmailSettings();
  
  const transporterConfig = {
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpPort === 465, // true for 465 (SSL), false for 587 (TLS)
    auth: {
      user: settings.smtpUsername,
      pass: settings.smtpPassword
    }
  };
  
  // For port 587 (TLS), require TLS
  if (settings.smtpPort === 587) {
    transporterConfig.requireTLS = true;
  }
  
  return nodemailer.createTransport(transporterConfig);
};

/**
 * Send quiz results via email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.userName - Name of the user who took the quiz
 * @param {string} options.businessName - Business name (optional)
 * @param {number} options.overallScore - Overall quiz score
 * @param {Object} options.pillarScores - Object with pillar scores
 * @param {string} options.quizDate - Date when quiz was taken
 * @param {number} options.resultId - Quiz result ID
 */
const sendQuizResultsEmail = async (options) => {
  try {
    const { to, userName, businessName, overallScore, pillarScores, quizDate, resultId } = options;

    // Get email settings from database or environment
    const emailSettings = await getEmailSettings();
    
    if (!emailSettings.smtpUsername) {
      throw new Error('SMTP configuration is missing. Please set SMTP_USERNAME and SMTP_PASSWORD in admin settings or .env file');
    }
    
    if (!emailSettings.smtpPassword) {
      throw new Error('SMTP configuration is missing. Please set SMTP_PASSWORD in admin settings or .env file');
    }

    console.log('Creating email transporter with:', {
      host: emailSettings.smtpHost,
      port: emailSettings.smtpPort,
      user: emailSettings.smtpUsername
    });

    const transporter = await createTransporter();
    
    // Verify transporter connection
    try {
      await transporter.verify();
      console.log('SMTP server connection verified successfully');
    } catch (verifyError) {
      console.error('SMTP verification failed:', verifyError);
      throw new Error(`SMTP connection failed: ${verifyError.message}`);
    }

    // Format pillar scores
    const pillarNames = {
      STRATEGY: 'Strategy',
      FINANCE: 'Finance',
      MARKETING: 'Marketing',
      SALES: 'Sales',
      OPERATIONS: 'Operations',
      CULTURE: 'Culture',
      CUSTOMER_CENTRICITY: 'Customer Experience',
      EXIT_STRATEGY: 'Exit Strategy'
    };

    let pillarScoresHtml = '';
    Object.entries(pillarScores || {}).forEach(([pillar, score]) => {
      const pillarName = pillarNames[pillar] || pillar;
      const scoreNum = Math.round(score);
      let color = '#ef4444'; // Red
      if (scoreNum >= 80) color = '#22c55e'; // Green
      else if (scoreNum >= 60) color = '#f59e0b'; // Orange
      
      pillarScoresHtml += `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${pillarName}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">
            <span style="color: ${color}; font-weight: 600;">${scoreNum}%</span>
          </td>
        </tr>
      `;
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .score-box { background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
            .overall-score { font-size: 48px; font-weight: 800; color: #1e40af; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background: #f9fafb; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">10X Business Health Quiz Results</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>${userName}${businessName ? ` from ${businessName}` : ''} has completed the 10X Business Health Quiz and would like to share the results with you.</p>
              <p><strong>Requested by:</strong> ${to}</p>
              
              <div class="score-box">
                <h2 style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Overall Score</h2>
                <div class="overall-score">${Math.round(overallScore)}%</div>
              </div>

              <h3 style="color: #1e40af; margin-top: 30px;">Pillar Scores</h3>
              <table>
                <thead>
                  <tr>
                    <th>Pillar</th>
                    <th style="text-align: right;">Score</th>
                  </tr>
                </thead>
                <tbody>
                  ${pillarScoresHtml}
                </tbody>
              </table>

              <p style="margin-top: 30px;">Quiz completed on: ${new Date(quizDate).toLocaleDateString()}</p>
              
              <p style="margin-top: 20px;">
                <a href="${process.env.FRONTEND_URL || 'http://95.216.225.37:3001'}/quiz/results?resultId=${resultId}" 
                   style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                  View Full Results
                </a>
              </p>
            </div>
            <div class="footer">
              <p>This email was sent from 10XCoach.ai</p>
              <p>© ${new Date().getFullYear()} 10XCoach.ai. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Use settings from database or environment
    const fromEmail = emailSettings.smtpFromEmail;
    const fromName = emailSettings.smtpFromName;
    
    // All quiz result emails are sent to the configured client email (from database or env)
    const recipientEmail = emailSettings.clientEmail;
    
    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: recipientEmail,
      replyTo: to, // Include the entered email as reply-to so client can respond
      subject: `10X Business Health Quiz Results - ${userName}${businessName ? ` (${businessName})` : ''} - Requested by: ${to}`,
      html: htmlContent,
      text: `
10X Business Health Quiz Results

Hello,

${userName}${businessName ? ` from ${businessName}` : ''} has completed the 10X Business Health Quiz.

Overall Score: ${Math.round(overallScore)}%

Pillar Scores:
${Object.entries(pillarScores || {}).map(([pillar, score]) => {
  const pillarName = pillarNames[pillar] || pillar;
  return `${pillarName}: ${Math.round(score)}%`;
}).join('\n')}

Quiz completed on: ${new Date(quizDate).toLocaleDateString()}

View full results: ${process.env.FRONTEND_URL || 'http://95.216.225.37:3001'}/quiz/results?resultId=${resultId}

---
This email was sent from 10XCoach.ai
© ${new Date().getFullYear()} 10XCoach.ai. All rights reserved.
      `.trim()
    };

    console.log('Sending email to:', recipientEmail);
    console.log('Email subject:', mailOptions.subject);
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    console.log('Email response:', info.response);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    console.error('Error code:', error.code);
    console.error('Error command:', error.command);
    console.error('Error response:', error.response);
    console.error('Error stack:', error.stack);
    throw error;
  }
};

/**
 * Send email verification email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.userName - Name of the user
 * @param {string} options.verificationToken - Verification token
 * @param {string} options.verificationUrl - Full verification URL
 */
const sendVerificationEmail = async (options) => {
  try {
    const { to, userName, verificationToken, verificationUrl } = options;

    // Get email settings from database or environment
    const emailSettings = await getEmailSettings();
    
    if (!emailSettings.smtpUsername || !emailSettings.smtpPassword) {
      throw new Error('SMTP configuration is missing. Please set SMTP_USERNAME and SMTP_PASSWORD in admin settings or .env file');
    }

    const transporter = await createTransporter();
    
    // Verify transporter connection
    try {
      await transporter.verify();
      console.log('SMTP server connection verified successfully');
    } catch (verifyError) {
      console.error('SMTP verification failed:', verifyError);
      throw new Error(`SMTP connection failed: ${verifyError.message}`);
    }

    const baseUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000';
    const verifyLink = verificationUrl || `${baseUrl}/verify-email?token=${verificationToken}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #00d4ff 0%, #7c3aed 50%, #ff006e 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .button { display: inline-block; background: linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Verify Your Email Address</h1>
            </div>
            <div class="content">
              <p>Hello ${userName},</p>
              <p>Thank you for signing up for 10XCoach.ai! Please verify your email address to complete your registration.</p>
              <p style="text-align: center;">
                <a href="${verifyLink}" class="button">Verify Email Address</a>
              </p>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #3b82f6;">${verifyLink}</p>
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                This verification link will expire in 24 hours. If you didn't create an account, please ignore this email.
              </p>
            </div>
            <div class="footer">
              <p>This email was sent from 10XCoach.ai</p>
              <p>© ${new Date().getFullYear()} 10XCoach.ai. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const fromEmail = emailSettings.smtpFromEmail;
    const fromName = emailSettings.smtpFromName;
    
    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: to,
      subject: 'Verify Your Email - 10XCoach.ai',
      html: htmlContent,
      text: `
Verify Your Email Address

Hello ${userName},

Thank you for signing up for 10XCoach.ai! Please verify your email address to complete your registration.

Click this link to verify: ${verifyLink}

This verification link will expire in 24 hours. If you didn't create an account, please ignore this email.

---
This email was sent from 10XCoach.ai
© ${new Date().getFullYear()} 10XCoach.ai. All rights reserved.
      `.trim()
    };

    console.log('📧 Sending verification email...');
    console.log('   To:', to);
    console.log('   From:', fromEmail);
    console.log('   Subject:', mailOptions.subject);
    console.log('   SMTP Host:', emailSettings.smtpHost);
    console.log('   SMTP Port:', emailSettings.smtpPort);
    console.log('   SMTP User:', emailSettings.smtpUsername);
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    console.log('   Accepted:', info.accepted);
    console.log('   Rejected:', info.rejected);
    return info;
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
};

/**
 * Send password reset email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.userName - Name of the user
 * @param {string} options.resetToken - Password reset token
 * @param {string} options.resetUrl - Full password reset URL
 */
const sendPasswordResetEmail = async (options) => {
  try {
    const { to, userName, resetToken, resetUrl } = options;

    // Get email settings from database or environment
    const emailSettings = await getEmailSettings();
    
    if (!emailSettings.smtpUsername || !emailSettings.smtpPassword) {
      throw new Error('SMTP configuration is missing. Please set SMTP_USERNAME and SMTP_PASSWORD in admin settings or .env file');
    }

    const transporter = await createTransporter();
    
    // Verify transporter connection
    try {
      await transporter.verify();
      console.log('SMTP server connection verified successfully');
    } catch (verifyError) {
      console.error('SMTP verification failed:', verifyError);
      throw new Error(`SMTP connection failed: ${verifyError.message}`);
    }

    const baseUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000';
    const resetLink = resetUrl || `${baseUrl}/reset-password?token=${resetToken}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #00d4ff 0%, #7c3aed 50%, #ff006e 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .button { display: inline-block; background: linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Reset Your Password</h1>
            </div>
            <div class="content">
              <p>Hello ${userName},</p>
              <p>We received a request to reset your password for your 10XCoach.ai account.</p>
              <p style="text-align: center;">
                <a href="${resetLink}" class="button">Reset Password</a>
              </p>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #3b82f6;">${resetLink}</p>
              <div class="warning">
                <p style="margin: 0; font-weight: 600; color: #92400e;">⚠️ Security Notice</p>
                <p style="margin: 8px 0 0 0; font-size: 14px; color: #78350f;">
                  This password reset link will expire in 1 hour. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
                </p>
              </div>
            </div>
            <div class="footer">
              <p>This email was sent from 10XCoach.ai</p>
              <p>© ${new Date().getFullYear()} 10XCoach.ai. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const fromEmail = emailSettings.smtpFromEmail;
    const fromName = emailSettings.smtpFromName;
    
    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: to,
      subject: 'Reset Your Password - 10XCoach.ai',
      html: htmlContent,
      text: `
Reset Your Password

Hello ${userName},

We received a request to reset your password for your 10XCoach.ai account.

Click this link to reset your password: ${resetLink}

This password reset link will expire in 1 hour. If you didn't request a password reset, please ignore this email and your password will remain unchanged.

---
This email was sent from 10XCoach.ai
© ${new Date().getFullYear()} 10XCoach.ai. All rights reserved.
      `.trim()
    };

    console.log('📧 Sending password reset email...');
    console.log('   To:', to);
    console.log('   From:', fromEmail);
    console.log('   Subject:', mailOptions.subject);
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    return info;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

module.exports = {
  sendQuizResultsEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  createTransporter,
  getEmailSettings
};


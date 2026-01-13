const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  // Check if email is configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error('❌ EMAIL NOT CONFIGURED!');
    console.error('Please set EMAIL_USER and EMAIL_PASSWORD in your .env file');
    return null;
  }

  console.log('📧 Creating email transporter...');
  console.log('Email User:', process.env.EMAIL_USER);
  console.log('Email Service:', process.env.EMAIL_SERVICE || 'gmail');

  // For Gmail, you'll need to use an App Password
  // For other services, adjust accordingly
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD // Use App Password for Gmail
    }
  });

  return transporter;
};

// Send emergency email
const sendEmergencyEmail = async (emergencyData) => {
  try {
    const { type, roomNumber, teamName, description, volunteerName, organizerContacts } = emergencyData;

    // Only send if email is configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log('❌ Email not configured. Skipping email send.');
      console.log('Emergency details:', emergencyData);
      console.log('To configure email, add to .env:');
      console.log('  EMAIL_USER=your-email@gmail.com');
      console.log('  EMAIL_PASSWORD=your-app-password');
      return { success: false, message: 'Email not configured' };
    }

    const transporter = createTransporter();
    
    if (!transporter) {
      return { success: false, message: 'Failed to create email transporter' };
    }

    // Verify connection
    try {
      await transporter.verify();
      console.log('✅ Email server connection verified');
    } catch (verifyError) {
      console.error('\n❌ EMAIL AUTHENTICATION FAILED!');
      console.error('Error:', verifyError.message);
      console.error('\n🔧 SOLUTION:');
      console.error('This error means Gmail rejected your login credentials.');
      console.error('\n📋 Steps to fix:');
      console.error('1. Go to: https://myaccount.google.com/apppasswords');
      console.error('2. Make sure 2-Factor Authentication is ENABLED');
      console.error('3. Generate a NEW App Password:');
      console.error('   - Select "Mail" as the app');
      console.error('   - Select "Other" as the device');
      console.error('   - Name it "Hackathon Management"');
      console.error('   - Click "Generate"');
      console.error('4. Copy the 16-character password (no spaces)');
      console.error('5. Update your .env file:');
      console.error('   EMAIL_PASSWORD=your-16-char-app-password');
      console.error('6. Restart the server\n');
      console.error('⚠️  DO NOT use your regular Gmail password!');
      console.error('⚠️  You MUST use an App Password!\n');
      return { success: false, error: verifyError.message, needsAppPassword: true };
    }

    const emailSubject = `🚨 EMERGENCY ALERT: ${type.toUpperCase().replace('-', ' ')} - Room ${roomNumber}`;
    
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">🚨 EMERGENCY ALERT</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 2px solid #ef4444; border-top: none; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937; margin-top: 0;">Emergency Type: ${type.toUpperCase().replace('-', ' ')}</h2>
          
          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <p style="margin: 8px 0; color: #1f2937;"><strong>Room Number:</strong> ${roomNumber}</p>
            ${teamName ? `<p style="margin: 8px 0; color: #1f2937;"><strong>Team Name:</strong> ${teamName}</p>` : ''}
            <p style="margin: 8px 0; color: #1f2937;"><strong>Reported By:</strong> ${volunteerName}</p>
            <p style="margin: 8px 0; color: #1f2937;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div style="background: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">Description:</h3>
            <p style="color: #374151; line-height: 1.6; white-space: pre-wrap;">${description}</p>
          </div>
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e; font-weight: 600;">⚠️ Immediate action required. Please respond to this emergency as soon as possible.</p>
          </div>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
          <p>This is an automated email from the Hackathon Management System.</p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"Hackathon Management System" <${process.env.EMAIL_USER}>`,
      to: organizerContacts.join(', '),
      subject: emailSubject,
      html: emailBody,
      text: `
EMERGENCY ALERT: ${type.toUpperCase().replace('-', ' ')}

Room Number: ${roomNumber}
${teamName ? `Team Name: ${teamName}\n` : ''}
Reported By: ${volunteerName}
Time: ${new Date().toLocaleString()}

Description:
${description}

⚠️ Immediate action required. Please respond to this emergency as soon as possible.
      `.trim()
    };

    console.log('📤 Sending emergency email...');
    console.log('To:', organizerContacts.join(', '));
    console.log('Subject:', emailSubject);
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Emergency email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    return { success: true, messageId: info.messageId, response: info.response };
  } catch (error) {
    console.error('❌ Error sending emergency email:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    
    // Provide helpful error messages
    if (error.code === 'EAUTH' || error.message.includes('BadCredentials') || error.message.includes('535')) {
      console.error('\n🔐 AUTHENTICATION FAILED!');
      console.error('This means Gmail rejected your password.');
      console.error('\n✅ FIX: Use Gmail App Password (NOT regular password)');
      console.error('1. Enable 2FA: https://myaccount.google.com/security');
      console.error('2. Get App Password: https://myaccount.google.com/apppasswords');
      console.error('3. Generate App Password for "Mail"');
      console.error('4. Copy 16-character password (no spaces)');
      console.error('5. Update .env: EMAIL_PASSWORD=your-app-password');
      console.error('6. Restart server\n');
    } else if (error.code === 'ECONNECTION') {
      console.error('🔌 Connection failed! Check your internet connection and email service settings');
    }
    
    return { success: false, error: error.message, code: error.code };
  }
};

// Test email function
const testEmail = async () => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log('❌ Email not configured');
      return { success: false, message: 'Email not configured' };
    }

    const transporter = createTransporter();
    if (!transporter) {
      return { success: false, message: 'Failed to create transporter' };
    }

    await transporter.verify();
    console.log('✅ Email configuration is valid!');

    const testMailOptions = {
      from: `"Hackathon Management System" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Send test email to yourself
      subject: 'Test Email - Hackathon Management System',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>✅ Email Test Successful!</h2>
          <p>This is a test email from the Hackathon Management System.</p>
          <p>If you received this, your email configuration is working correctly.</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
      `,
      text: 'Email Test Successful! If you received this, your email configuration is working correctly.'
    };

    const info = await transporter.sendMail(testMailOptions);
    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Test email failed:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEmergencyEmail,
  testEmail
};


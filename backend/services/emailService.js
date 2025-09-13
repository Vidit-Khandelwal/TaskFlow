import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config({ override: true });

// Create transporter for email sending
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail', // You can change this to other services like 'outlook', 'yahoo', etc.
    auth: {
      user: process.env.EMAIL_USER, // Your email address
      pass: process.env.EMAIL_PASS  // Your email password or app password
    }
  });
};

// Email template for task reminder
const createTaskReminderEmail = (userName, taskTitle, taskEndTime) => {
  const endTime = new Date(taskEndTime).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  return {
    subject: `TaskFlow Reminder: "${taskTitle}" ends in 5 minutes`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #3B82F6; border-bottom: 2px solid #3B82F6; padding-bottom: 10px;">
          TaskFlow Task Reminder
        </h2>
        
        <p>Hello ${userName},</p>
        
        <p>This is a friendly reminder that your task <strong>"${taskTitle}"</strong> is ending in 5 minutes.</p>
        
        <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Task:</strong> ${taskTitle}</p>
          <p style="margin: 5px 0 0 0;"><strong>End Time:</strong> ${endTime}</p>
        </div>
        
        <p>Please complete your task or mark it as completed in the TaskFlow app.</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
          <p style="color: #6B7280; font-size: 14px;">
            This is an automated reminder from TaskFlow. If you have any questions, please contact support.
          </p>
        </div>
      </div>
    `,
    text: `
      TaskFlow Task Reminder
      
      Hello ${userName},
      
      This is a friendly reminder that your task "${taskTitle}" is ending in 5 minutes.
      
      Task: ${taskTitle}
      End Time: ${endTime}
      
      Please complete your task or mark it as completed in the TaskFlow app.
      
      This is an automated reminder from TaskFlow.
    `
  };
};

// Send email function
export const sendTaskReminderEmail = async (userEmail, userName, taskTitle, taskEndTime) => {
  try {
    const transporter = createTransporter();
    const emailContent = createTaskReminderEmail(userName, taskTitle, taskEndTime);
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

export const sendVerificationEmail = async (userEmail, userName, verifyUrl) => {
  try {
    const transporter = createTransporter();
    const subject = 'Verify your TaskFlow email';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto; padding:20px;">
        <h2 style="color:#3B82F6;">Verify your email</h2>
        <p>Hello ${userName},</p>
        <p>Please verify your email address to enable reminders and secure your account.</p>
        <p style="margin:24px 0;">
          <a href="${verifyUrl}" style="background:#3B82F6;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Verify Email</a>
        </p>
        <p>If the button doesn't work, copy and paste this link:</p>
        <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      </div>
    `;
    const text = `Hello ${userName},\n\nVerify your email by visiting: ${verifyUrl}`;

    const mailOptions = { from: process.env.EMAIL_USER, to: userEmail, subject, html, text };
    const result = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error: error.message };
  }
};

// Test email configuration
export const testEmailConfiguration = async () => {
  try {
    // Check if email credentials are provided
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('Email credentials not configured. Notifications will be logged to console only.');
      return false;
    }
    
    const transporter = createTransporter();
    await transporter.verify();
    console.log('Email configuration is valid');
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    console.log('Notifications will be logged to console only.');
    return false;
  }
};

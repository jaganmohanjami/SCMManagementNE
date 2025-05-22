import * as sgMail from '@sendgrid/mail';

// We'll use a placeholder API key for now
// This will be replaced with the actual key when provided
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || 'SG.placeholder_key';
sgMail.setApiKey(SENDGRID_API_KEY);

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    // Use the fromEmail that's provided as a default sender
    const fromEmail: string = params.from || 'notifications@neptune-energy.example.com';
    
    // Only attempt to send if we have a real API key
    if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY !== 'SG.placeholder_key') {
      await sgMail.send({
        to: params.to,
        from: fromEmail,
        subject: params.subject,
        text: params.text,
        html: params.html,
      });
      return true;
    } else {
      // Log that we would have sent an email in development
      console.log('EMAIL SERVICE (dev mode): Would have sent email');
      console.log(`TO: ${params.to}`);
      console.log(`FROM: ${fromEmail}`);
      console.log(`SUBJECT: ${params.subject}`);
      console.log(`CONTENT: ${params.text || params.html}`);
      return true;
    }
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export function sendRatingRequestEmail(supplierEmail: string, supplierName: string, projectName: string): Promise<boolean> {
  return sendEmail({
    to: supplierEmail,
    from: 'noreply@neptuneenergy.com',
    subject: 'Neptune Energy: Performance Rating Request Received',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #0063B1; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Neptune Energy</h1>
        </div>
        
        <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
          <h2 style="color: #0063B1;">Performance Rating Request Received</h2>
          
          <p>Dear ${supplierName},</p>
          
          <p>We have received your request for a performance rating for the project: <strong>${projectName}</strong>.</p>
          
          <p>Our engineers will review your request and provide a rating within the next 5 business days. You will receive another email notification once the rating is complete.</p>
          
          <p>This rating will help establish your company's performance record in our supplier management system and may be used for future procurement decisions.</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 4px solid #0063B1;">
            <p style="margin: 0;"><strong>Next steps:</strong></p>
            <p style="margin: 10px 0 0 0;">1. Neptune engineers will evaluate your performance</p>
            <p style="margin: 5px 0 0 0;">2. You'll receive notification of your rating</p>
            <p style="margin: 5px 0 0 0;">3. You'll have an opportunity to review and accept the rating</p>
          </div>
          
          <p>If you have any questions, please contact your Neptune Energy representative.</p>
          
          <p>Best regards,<br>
          Neptune Energy Supply Chain Management</p>
        </div>
        
        <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          <p>This is an automated message, please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} Neptune Energy. All rights reserved.</p>
        </div>
      </div>
    `,
  });
}

export function sendRatingCompletedEmail(supplierEmail: string, supplierName: string, projectName: string, rating: number): Promise<boolean> {
  return sendEmail({
    to: supplierEmail,
    from: 'noreply@neptuneenergy.com',
    subject: 'Neptune Energy: Performance Rating Complete',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #0063B1; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Neptune Energy</h1>
        </div>
        
        <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
          <h2 style="color: #0063B1;">Performance Rating Complete</h2>
          
          <p>Dear ${supplierName},</p>
          
          <p>We are pleased to inform you that Neptune Energy has completed your performance rating for the project: <strong>${projectName}</strong>.</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 4px solid #0063B1;">
            <p style="margin: 0;"><strong>Overall Rating: ${rating}/5</strong></p>
          </div>
          
          <p>Please log in to the Neptune Energy SCM Vendor Management system to review the detailed rating and accept it.</p>
          
          <p style="margin: 25px 0; text-align: center;">
            <a href="https://neptuneenergy.com/scm" style="background-color: #0063B1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Your Rating</a>
          </p>
          
          <p>This rating has been added to your supplier profile in our system and may be considered for future procurement decisions.</p>
          
          <p>If you have any questions about this rating, please contact your Neptune Energy representative.</p>
          
          <p>Best regards,<br>
          Neptune Energy Supply Chain Management</p>
        </div>
        
        <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          <p>This is an automated message, please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} Neptune Energy. All rights reserved.</p>
        </div>
      </div>
    `,
  });
}

export function sendRatingAcceptedEmail(engineerEmail: string, supplierName: string, projectName: string, rating: number): Promise<boolean> {
  return sendEmail({
    to: engineerEmail,
    from: 'noreply@neptuneenergy.com',
    subject: 'Neptune Energy: Supplier Rating Accepted',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #0063B1; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Neptune Energy</h1>
        </div>
        
        <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
          <h2 style="color: #0063B1;">Supplier Rating Accepted</h2>
          
          <p>Hello,</p>
          
          <p>This is to inform you that <strong>${supplierName}</strong> has accepted their performance rating for the project: <strong>${projectName}</strong>.</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 4px solid #0063B1;">
            <p style="margin: 0;"><strong>Overall Rating: ${rating}/5</strong></p>
          </div>
          
          <p>The rating has been finalized in the system and is now visible in all supplier reports and dashboards.</p>
          
          <p style="margin: 25px 0; text-align: center;">
            <a href="https://neptuneenergy.com/scm" style="background-color: #0063B1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View in SCM System</a>
          </p>
          
          <p>Best regards,<br>
          Neptune Energy SCM System</p>
        </div>
        
        <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          <p>This is an automated message, please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} Neptune Energy. All rights reserved.</p>
        </div>
      </div>
    `,
  });
}
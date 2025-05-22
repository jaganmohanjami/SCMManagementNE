import { MailService } from '@sendgrid/mail';
import { Claim, Supplier, User } from '@shared/schema';

// Initialize with a dummy API key for now
const DUMMY_SENDGRID_API_KEY = 'SG.dummy_key_for_development_purposes_only';

// Setup SendGrid
const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY || DUMMY_SENDGRID_API_KEY);

// Email Templates
interface EmailTemplateData {
  claim: Claim;
  supplier: Supplier;
  sender?: User;
  comment?: string;
}

/**
 * Creates an email for sending a claim to a supplier
 */
function createClaimNotificationEmail(data: EmailTemplateData) {
  const { claim, supplier, sender, comment } = data;
  
  // Format damage amount
  const formattedAmount = typeof claim.damageAmount === 'number' || typeof claim.damageAmount === 'string'
    ? `€${Number(claim.damageAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : 'Not specified';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #0063B1; padding: 20px; text-align: center; color: white;">
        <h1 style="margin: 0;">Neptune Energy</h1>
        <h2 style="margin: 5px 0 0 0;">Claim Notification</h2>
      </div>
      
      <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
        <p>Dear ${supplier.contactName1},</p>
        
        <p>A new claim has been filed regarding your services or products. Please review the details below:</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; margin: 15px 0; border-left: 4px solid #0063B1;">
          <p><strong>Claim Number:</strong> ${claim.claimNumber}</p>
          <p><strong>Date of Incident:</strong> ${new Date(claim.dateHappened).toLocaleDateString()}</p>
          <p><strong>Claim Area:</strong> ${claim.claimArea}</p>
          <p><strong>Damage Amount:</strong> ${formattedAmount}</p>
        </div>
        
        <h3 style="color: #0063B1;">Claim Details</h3>
        <p>${claim.claimInfo}</p>
        
        <h3 style="color: #0063B1;">Damage Description</h3>
        <p>${claim.damageText}</p>
        
        ${claim.defectsDescription ? `
          <h3 style="color: #0063B1;">Defects Description</h3>
          <p>${claim.defectsDescription}</p>
        ` : ''}
        
        ${comment ? `
          <h3 style="color: #0063B1;">Additional Comments</h3>
          <p>${comment}</p>
        ` : ''}
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
          <p>Please log in to the Neptune Energy Supplier Management System to respond to this claim.</p>
          <p>If you have any questions, please contact us at support@neptune-energy-example.com</p>
        </div>
      </div>
      
      <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
        <p>This is an automated message from the Neptune Energy Supplier Management System.</p>
        <p>© 2025 Neptune Energy. All rights reserved.</p>
      </div>
    </div>
  `;

  return {
    to: supplier.email1,
    from: 'noreply@neptune-energy-example.com', // Change to your verified sender
    subject: `Neptune Energy Claim Notification: ${claim.claimNumber}`,
    text: `Claim Notification: ${claim.claimNumber}. Please review the claim in the Neptune Energy Supplier Management System.`,
    html,
  };
}

/**
 * Sends a claim notification email to a supplier
 */
export async function sendClaimToSupplier(
  claim: Claim,
  supplier: Supplier,
  sender?: User,
  comment?: string
): Promise<boolean> {
  try {
    if (process.env.NODE_ENV === 'development' && !process.env.SENDGRID_API_KEY) {
      // In development without a real API key, log the email instead of sending
      console.log('--------- EMAIL WOULD BE SENT (DEV MODE) ---------');
      console.log(`To: ${supplier.email1}`);
      console.log(`Subject: Neptune Energy Claim Notification: ${claim.claimNumber}`);
      console.log(`Claim details: ${claim.claimInfo}`);
      console.log('--------- END EMAIL PREVIEW ---------');
      return true;
    }

    const emailData = createClaimNotificationEmail({
      claim,
      supplier,
      sender,
      comment,
    });

    await mailService.send(emailData);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Creates a generic notification email
 */
export function createNotificationEmail(to: string, subject: string, message: string) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #0063B1; padding: 20px; text-align: center; color: white;">
        <h1 style="margin: 0;">Neptune Energy</h1>
        <h2 style="margin: 5px 0 0 0;">Notification</h2>
      </div>
      
      <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
        <h3 style="color: #0063B1;">${subject}</h3>
        <p>${message}</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
          <p>If you have any questions, please contact us at support@neptune-energy-example.com</p>
        </div>
      </div>
      
      <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
        <p>This is an automated message from the Neptune Energy Supplier Management System.</p>
        <p>© 2025 Neptune Energy. All rights reserved.</p>
      </div>
    </div>
  `;

  return {
    to,
    from: 'noreply@neptune-energy-example.com', // Change to your verified sender
    subject,
    text: message,
    html,
  };
}

/**
 * Sends a generic notification email
 */
export async function sendNotificationEmail(
  to: string,
  subject: string,
  message: string
): Promise<boolean> {
  try {
    if (process.env.NODE_ENV === 'development' && !process.env.SENDGRID_API_KEY) {
      // In development without a real API key, log the email instead of sending
      console.log('--------- EMAIL WOULD BE SENT (DEV MODE) ---------');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Message: ${message}`);
      console.log('--------- END EMAIL PREVIEW ---------');
      return true;
    }

    const emailData = createNotificationEmail(to, subject, message);
    await mailService.send(emailData);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}
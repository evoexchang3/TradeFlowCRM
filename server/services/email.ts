import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { storage } from '../storage';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  cc?: string | string[];
  bcc?: string | string[];
  smtpSettingId?: string; // Optional SMTP account to use
}

class EmailService {
  private transporter: Transporter | null = null;
  private smtpConfigId: string | null = null;

  /**
   * Initialize email transporter with SMTP settings from database
   */
  async initializeTransporter(): Promise<Transporter | null> {
    try {
      // Fetch active SMTP settings from database
      const smtpSettings = await storage.getSmtpSettings();
      
      if (!smtpSettings || smtpSettings.length === 0) {
        console.warn('[Email Service] No SMTP settings configured');
        return null;
      }

      // Use the first (most recent) SMTP configuration
      const config = smtpSettings[0];
      
      // Check if we need to reinitialize (config changed)
      if (this.transporter && this.smtpConfigId === config.id) {
        return this.transporter;
      }

      console.log(`[Email Service] Initializing transporter with host: ${config.host}`);

      this.transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.useTLS, // true for 465, false for other ports
        auth: {
          user: config.username,
          pass: config.password,
        },
      });

      this.smtpConfigId = config.id;

      // Verify connection
      await this.transporter.verify();
      console.log('[Email Service] SMTP connection verified successfully');

      return this.transporter;
    } catch (error: any) {
      console.error('[Email Service] Failed to initialize transporter:', error.message);
      this.transporter = null;
      this.smtpConfigId = null;
      return null;
    }
  }

  /**
   * Send an email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // Step 1: Get the SMTP config to use
      let smtpConfig: any;
      
      if (options.smtpSettingId) {
        // Use the specific SMTP account requested by the user
        console.log(`[Email Service] Using specific SMTP account ID: ${options.smtpSettingId}`);
        const allSmtpSettings = await storage.getSmtpSettings();
        smtpConfig = allSmtpSettings.find((s: any) => s.id === options.smtpSettingId);
        
        if (!smtpConfig) {
          console.error(`[Email Service] SMTP account not found: ${options.smtpSettingId}`);
          return false;
        }
        console.log(`[Email Service] Selected SMTP: ${smtpConfig.fromName} <${smtpConfig.fromEmail}>`);
      } else {
        // Use the default (first active) SMTP account
        console.log('[Email Service] Using default SMTP account');
        const allSmtpSettings = await storage.getSmtpSettings();
        if (!allSmtpSettings || allSmtpSettings.length === 0) {
          console.error('[Email Service] No SMTP accounts configured');
          return false;
        }
        smtpConfig = allSmtpSettings[0];
        console.log(`[Email Service] Default SMTP: ${smtpConfig.fromName} <${smtpConfig.fromEmail}>`);
      }

      // Step 2: Create transporter for the selected SMTP config
      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.useTLS,
        auth: {
          user: smtpConfig.username,
          pass: smtpConfig.password,
        },
      });

      // Step 3: Prepare email options
      const mailOptions = {
        from: `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: options.text,
        html: options.html || options.text,
        cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : undefined,
        bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : undefined,
      };

      // Step 4: Send the email
      const info = await transporter.sendMail(mailOptions);
      console.log(`[Email Service] ✓ Email sent from ${smtpConfig.fromEmail} - Message ID: ${info.messageId}`);
      
      return true;
    } catch (error: any) {
      console.error('[Email Service] Failed to send email:', error.message);
      return false;
    }
  }

  /**
   * Send calendar event reminder
   */
  async sendEventReminder(
    to: string,
    eventTitle: string,
    eventStart: Date,
    eventLocation?: string,
    eventDescription?: string
  ): Promise<boolean> {
    const formattedDate = eventStart.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const formattedTime = eventStart.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Event Reminder: ${eventTitle}</h2>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 10px 0;"><strong>Date:</strong> ${formattedDate}</p>
          <p style="margin: 10px 0;"><strong>Time:</strong> ${formattedTime}</p>
          ${eventLocation ? `<p style="margin: 10px 0;"><strong>Location:</strong> ${eventLocation}</p>` : ''}
          ${eventDescription ? `<div style="margin-top: 20px;"><p style="margin: 10px 0;"><strong>Description:</strong></p><p style="margin: 10px 0;">${eventDescription}</p></div>` : ''}
        </div>
        <p style="color: #666; font-size: 14px;">This is an automated reminder for your upcoming event.</p>
      </div>
    `;

    return await this.sendEmail({
      to,
      subject: `Reminder: ${eventTitle}`,
      html,
    });
  }

  /**
   * Send client status change notification
   */
  async sendClientStatusChangeNotification(
    to: string,
    clientName: string,
    oldStatus: string,
    newStatus: string,
    assignedAgentName?: string
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Client Status Update</h2>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 10px 0;"><strong>Client:</strong> ${clientName}</p>
          <p style="margin: 10px 0;"><strong>Previous Status:</strong> <span style="color: #666;">${oldStatus}</span></p>
          <p style="margin: 10px 0;"><strong>New Status:</strong> <span style="color: #2196F3; font-weight: bold;">${newStatus}</span></p>
          ${assignedAgentName ? `<p style="margin: 10px 0;"><strong>Assigned Agent:</strong> ${assignedAgentName}</p>` : ''}
        </div>
        <p style="color: #666; font-size: 14px;">This notification was generated automatically by the CRM system.</p>
      </div>
    `;

    return await this.sendEmail({
      to,
      subject: `Client Status Updated: ${clientName}`,
      html,
    });
  }

  /**
   * Send trading alert notification
   */
  async sendTradingAlert(
    to: string,
    alertType: 'position_opened' | 'position_closed' | 'stop_loss_hit' | 'take_profit_hit',
    symbol: string,
    details: {
      side?: string;
      quantity?: string;
      price?: string;
      pnl?: string;
      clientName?: string;
    }
  ): Promise<boolean> {
    const alertTitles = {
      position_opened: 'New Position Opened',
      position_closed: 'Position Closed',
      stop_loss_hit: 'Stop Loss Triggered',
      take_profit_hit: 'Take Profit Triggered',
    };

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${alertTitles[alertType]}</h2>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 10px 0;"><strong>Symbol:</strong> ${symbol}</p>
          ${details.clientName ? `<p style="margin: 10px 0;"><strong>Client:</strong> ${details.clientName}</p>` : ''}
          ${details.side ? `<p style="margin: 10px 0;"><strong>Side:</strong> ${details.side.toUpperCase()}</p>` : ''}
          ${details.quantity ? `<p style="margin: 10px 0;"><strong>Quantity:</strong> ${details.quantity}</p>` : ''}
          ${details.price ? `<p style="margin: 10px 0;"><strong>Price:</strong> $${details.price}</p>` : ''}
          ${details.pnl ? `<p style="margin: 10px 0;"><strong>P/L:</strong> <span style="color: ${parseFloat(details.pnl) >= 0 ? '#4CAF50' : '#F44336'}; font-weight: bold;">${parseFloat(details.pnl) >= 0 ? '+' : ''}$${details.pnl}</span></p>` : ''}
        </div>
        <p style="color: #666; font-size: 14px;">This is an automated trading alert from the CRM system.</p>
      </div>
    `;

    return await this.sendEmail({
      to,
      subject: `Trading Alert: ${alertTitles[alertType]} - ${symbol}`,
      html,
    });
  }

  /**
   * Send email using template
   */
  async sendTemplatedEmail(
    to: string,
    templateId: string,
    variables: Record<string, string>
  ): Promise<boolean> {
    try {
      const templates = await storage.getEmailTemplates();
      const template = templates.find(t => t.id === templateId);

      if (!template) {
        console.error(`[Email Service] Template not found: ${templateId}`);
        return false;
      }

      // Replace variables in subject and body
      let subject = template.subject;
      let html = template.body;

      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{{${key}}}`;
        subject = subject.replace(new RegExp(placeholder, 'g'), value);
        html = html.replace(new RegExp(placeholder, 'g'), value);
      }

      return await this.sendEmail({
        to,
        subject,
        html,
      });
    } catch (error: any) {
      console.error('[Email Service] Failed to send templated email:', error.message);
      return false;
    }
  }
}

export const emailService = new EmailService();

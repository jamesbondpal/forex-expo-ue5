import nodemailer from 'nodemailer';

let transporter = null;

function initTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.log('[EmailService] SMTP not configured — emails will be logged to console');
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });

  console.log(`[EmailService] SMTP configured: ${host}:${port}`);
  return transporter;
}

function generateICS(booking) {
  const start = new Date();
  start.setHours(parseInt(booking.timeSlot.split(':')[0], 10), parseInt(booking.timeSlot.split(':')[1] || '0', 10));
  const end = new Date(start.getTime() + 30 * 60000);

  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Forex Expo Dubai//EN',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:Forex Expo Dubai - Meeting with ${booking.brokerName}`,
    `DESCRIPTION:Topic: ${booking.topic}\\nAgent: ${booking.agentName}\\nZoom: ${booking.zoomLink}`,
    `LOCATION:${booking.zoomLink}`,
    `ORGANIZER;CN=Forex Expo Dubai:mailto:info@forexexpodubai.com`,
    `ATTENDEE;CN=${booking.name}:mailto:${booking.email}`,
    'STATUS:CONFIRMED',
    `UID:${booking.meetingId}@forexexpodubai.com`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

function bookingEmailHTML(booking) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f4f5f7;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
  <tr>
    <td style="background:linear-gradient(135deg,#0a1628,#1a2d50);padding:30px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;">FOREX EXPO DUBAI</h1>
      <p style="color:#e8192c;margin:5px 0 0;font-size:14px;letter-spacing:2px;">MEETING CONFIRMED</p>
    </td>
  </tr>
  <tr>
    <td style="background:#fff;padding:30px;">
      <h2 style="color:#0a1628;margin:0 0 20px;">Hi ${booking.name},</h2>
      <p style="color:#555;line-height:1.6;">Your meeting has been confirmed at the Forex Expo Dubai virtual exhibition. Here are your details:</p>

      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <tr>
          <td style="padding:12px;border-bottom:1px solid #eee;color:#888;width:140px;">Broker</td>
          <td style="padding:12px;border-bottom:1px solid #eee;color:#0a1628;font-weight:600;">${booking.brokerName}</td>
        </tr>
        <tr>
          <td style="padding:12px;border-bottom:1px solid #eee;color:#888;">Agent</td>
          <td style="padding:12px;border-bottom:1px solid #eee;color:#0a1628;">${booking.agentName}</td>
        </tr>
        <tr>
          <td style="padding:12px;border-bottom:1px solid #eee;color:#888;">Topic</td>
          <td style="padding:12px;border-bottom:1px solid #eee;color:#0a1628;">${booking.topic}</td>
        </tr>
        <tr>
          <td style="padding:12px;border-bottom:1px solid #eee;color:#888;">Time Slot</td>
          <td style="padding:12px;border-bottom:1px solid #eee;color:#0a1628;font-weight:600;">${booking.timeSlot}</td>
        </tr>
        <tr>
          <td style="padding:12px;border-bottom:1px solid #eee;color:#888;">Meeting ID</td>
          <td style="padding:12px;border-bottom:1px solid #eee;color:#0a1628;font-family:monospace;">${booking.meetingId}</td>
        </tr>
      </table>

      <div style="text-align:center;margin:30px 0;">
        <a href="${booking.zoomLink}" style="background:#e8192c;color:#fff;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:600;display:inline-block;">Join Zoom Meeting</a>
      </div>

      <p style="color:#888;font-size:13px;text-align:center;">${booking.zoomLink}</p>

      ${booking.message ? `<div style="background:#f8f9fa;padding:16px;border-radius:8px;margin:20px 0;"><p style="color:#888;margin:0 0 5px;font-size:13px;">Your message:</p><p style="color:#333;margin:0;">${booking.message}</p></div>` : ''}
    </td>
  </tr>
  <tr>
    <td style="background:#0a1628;padding:20px;text-align:center;">
      <p style="color:#888;font-size:12px;margin:0;">Forex Expo Dubai &mdash; Virtual Exhibition Hall</p>
      <p style="color:#666;font-size:11px;margin:5px 0 0;">Powered by UE5 Pixel Streaming</p>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function agentNotificationHTML(booking) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f4f5f7;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
  <tr>
    <td style="background:#0a1628;padding:20px;text-align:center;">
      <h2 style="color:#fff;margin:0;">New Meeting Booking</h2>
    </td>
  </tr>
  <tr>
    <td style="background:#fff;padding:30px;">
      <p><strong>Visitor:</strong> ${booking.name} (${booking.email})</p>
      <p><strong>Topic:</strong> ${booking.topic}</p>
      <p><strong>Time:</strong> ${booking.timeSlot}</p>
      <p><strong>Zoom:</strong> <a href="${booking.zoomLink}">${booking.zoomLink}</a></p>
      ${booking.message ? `<p><strong>Message:</strong> ${booking.message}</p>` : ''}
      <p><strong>Meeting ID:</strong> ${booking.meetingId}</p>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export async function sendBookingConfirmation(booking) {
  const html = bookingEmailHTML(booking);
  const icsContent = generateICS(booking);
  const transport = initTransporter();

  if (!transport) {
    console.log('[EmailService] Would send booking confirmation to:', booking.email);
    console.log('[EmailService] Email HTML preview (first 200 chars):', html.substring(0, 200));
    return { sent: false, reason: 'SMTP not configured', html };
  }

  try {
    await transport.sendMail({
      from: `"Forex Expo Dubai" <${process.env.SMTP_USER}>`,
      to: booking.email,
      subject: `Meeting Confirmed — ${booking.brokerName} at Forex Expo Dubai`,
      html,
      icalEvent: {
        filename: 'meeting.ics',
        method: 'REQUEST',
        content: icsContent
      }
    });
    console.log(`[EmailService] Confirmation sent to ${booking.email}`);
    return { sent: true, html };
  } catch (err) {
    console.error(`[EmailService] Failed to send confirmation: ${err.message}`);
    return { sent: false, reason: err.message, html };
  }
}

export async function sendAgentNotification(booking) {
  const html = agentNotificationHTML(booking);
  const transport = initTransporter();

  const agentEmail = booking.agentEmail;
  if (!agentEmail) return { sent: false, reason: 'No agent email configured' };

  if (!transport) {
    console.log('[EmailService] Would send agent notification to:', agentEmail);
    return { sent: false, reason: 'SMTP not configured', html };
  }

  try {
    await transport.sendMail({
      from: `"Forex Expo Dubai" <${process.env.SMTP_USER}>`,
      to: agentEmail,
      subject: `New Booking: ${booking.name} — ${booking.topic}`,
      html
    });
    console.log(`[EmailService] Agent notification sent to ${agentEmail}`);
    return { sent: true, html };
  } catch (err) {
    console.error(`[EmailService] Failed to send agent notification: ${err.message}`);
    return { sent: false, reason: err.message, html };
  }
}

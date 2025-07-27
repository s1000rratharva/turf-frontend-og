import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendBookingConfirmationEmail({ to, name, activity, date, startTime, endTime, paymentId, orderId }) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'SuperKick Turf <no-reply@superkickturf.com>',
      to,
      subject: '✅ Your Turf Booking is Confirmed – SuperKick Turf',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2>🎉 Booking Confirmed, ${name}!</h2>
          <p>Thank you for booking with <strong>SuperKick Turf</strong>. Your slot is confirmed.</p>
          <h3>📋 Booking Details</h3>
          <ul>
            <li><strong>🏟️ Activity:</strong> ${activity}</li>
            <li><strong>📅 Date:</strong> ${date}</li>
            <li><strong>⏰ Time:</strong> ${startTime} – ${endTime}</li>
            <li><strong>💳 Payment ID:</strong> ${paymentId}</li>
            <li><strong>🧾 Order ID:</strong> ${orderId}</li>
          </ul>
          <p>Please arrive 10 minutes early to enjoy a smooth experience.</p>
          <p>— SuperKick Turf Team ⚽🏏</p>
        </div>
      `,
    });

    if (error) {
      console.error('Email send error:', error);
    }

    return data;
  } catch (err) {
    console.error('Resend failed:', err);
  }
}

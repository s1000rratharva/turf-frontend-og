
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendBookingConfirmation(to, name, turf, date, time) {
  try {
    const response = await resend.emails.send({
      from: 'Turf Booking <https://turf-frontend-mauve.vercel.app/>', // or your own domain later
      to,
      subject: 'Your Turf Booking is Confirmed!',
      html: `
        <p>Hi ${name},</p>
        <p>Thank you for booking <strong>${turf}</strong> on <strong>${date}</strong> at <strong>${time}</strong>.</p>
        <p>See you soon!</p>
      `,
    });

    return response;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

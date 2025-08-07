// pages/api/confirm-booking.js
import { sendBookingConfirmation } from '@/lib/sendEmail';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, name, turf, date, time } = req.body;

  try {
    await sendBookingConfirmation(email, name, turf, date, time);
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Email failed to send' });
  }
}

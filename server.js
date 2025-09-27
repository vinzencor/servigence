import express from 'express';
import cors from 'cors';
import { Resend } from 'resend';

const app = express();
const port = 3001;

// Initialize Resend
const resend = new Resend('re_auAuU6Bd_4ojqhGZV3UCofptuZ2pj7phB');

// Middleware
app.use(cors());
app.use(express.json());

// Email sending endpoint
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, html } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ 
        error: 'Missing required fields: to, subject, html' 
      });
    }

    console.log('Sending email to:', to);
    console.log('Subject:', subject);

    const { data, error } = await resend.emails.send({
      from: 'Servigence <onboarding@resend.dev>',
      to: Array.isArray(to) ? to : [to],
      subject: subject,
      html: html,
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(400).json({ error: error });
    }

    console.log('Email sent successfully:', data);
    res.status(200).json({ success: true, data: data });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Email server running at http://localhost:${port}`);
  console.log('Resend API configured and ready');
});

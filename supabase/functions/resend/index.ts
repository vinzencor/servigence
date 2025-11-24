// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const RESEND_API_KEY = 're_aRgdpeML_BrGHFvZX7hP2yR9PUTTjJBhC';

console.log("Resend Email Function loaded!")

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const requestBody = await req.text();
    console.log('📥 Raw request body:', requestBody);

    const { to, subject, html, from } = JSON.parse(requestBody);

    console.log('📧 Sending email via Resend:', { to, subject, from });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: from || 'Servigens CRM <info@servigens.com>',
        to: Array.isArray(to) ? to : [to],
        subject: subject,
        html: html,
      })
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('❌ Resend API error:', data);
      return new Response(JSON.stringify({
        success: false,
        error: data.message || 'Failed to send email'
      }), {
        status: res.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    console.log('✅ Email sent successfully:', data);

    return new Response(JSON.stringify({
      success: true,
      data: data
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('❌ Function error:', error);

    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/resend' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{
      "to": "test@example.com",
      "subject": "Test Email",
      "html": "<h1>Hello World!</h1><p>This is a test email from Servigence CRM.</p>",
      "from": "Servigence CRM <onboarding@resend.dev>"
    }'

  To test from production:
  curl -i --location --request POST 'https://rfbllniljztbbyfanzqk.supabase.co/functions/v1/resend' \
    --header 'Authorization: Bearer YOUR_ANON_KEY' \
    --header 'Content-Type: application/json' \
    --data '{
      "to": "test@example.com",
      "subject": "Test Email",
      "html": "<h1>Hello World!</h1><p>This is a test email from Servigence CRM.</p>"
    }'

*/

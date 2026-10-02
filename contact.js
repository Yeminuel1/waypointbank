// Vercel serverless function: receives the contact form and emails it to support.
// Requires the RESEND_API_KEY environment variable (see README).
const TO = process.env.CONTACT_TO || 'support@waypointcom.online';
const FROM = process.env.CONTACT_FROM || 'Waypoint Website <no-reply@waypointcom.online>';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = (s, max) => String(s || '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

  // Honeypot: bots fill the hidden field. Pretend success and drop it.
  if (b.website) return res.status(200).json({ ok: true });

  const name = clean(b.name, 100);
  const email = clean(b.email, 200);
  const subject = clean(b.subject, 150);
  const message = String(b.message || '').trim().slice(0, 5000);

  if (!name || !email || !subject || !message) return res.status(400).json({ error: 'Please fill in every field.' });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });

  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(500).json({ error: 'Email is not configured yet.' });

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        reply_to: email,           // hitting Reply answers the customer directly
        subject: `[Waypoint contact] ${subject}`,
        text: `From: ${name} <${email}>\nSubject: ${subject}\n\n${message}`,
        html: `<p><strong>From:</strong> ${esc(name)} &lt;${esc(email)}&gt;<br><strong>Subject:</strong> ${esc(subject)}</p>
               <p style="white-space:pre-wrap">${esc(message)}</p>`
      })
    });
    if (!r.ok) {
      console.error('Resend error', r.status, await r.text());
      return res.status(502).json({ error: 'We could not send your message right now.' });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: 'We could not send your message right now.' });
  }
};

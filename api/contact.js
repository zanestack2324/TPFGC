const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, error: 'method_not_allowed' });
  }

  let payload = req.body;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      return json(res, 400, { ok: false, error: 'invalid_json' });
    }
  }

  if (!payload || typeof payload !== 'object') {
    return json(res, 400, { ok: false, error: 'invalid_body' });
  }

  if (payload.website) {
    return json(res, 200, { ok: true });
  }

  const name = String(payload.name || '').trim();
  const email = String(payload.email || '').trim();
  const phone = String(payload.phone || '').trim();
  const subject = String(payload.subject || 'General Enquiry').trim();
  const message = String(payload.message || '').trim();

  if (name.length < 2 || name.length > 200) {
    return json(res, 422, { ok: false, error: 'invalid_name' });
  }
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return json(res, 422, { ok: false, error: 'invalid_email' });
  }
  if (message.length < 5 || message.length > 5000) {
    return json(res, 422, { ok: false, error: 'invalid_message' });
  }
  if (phone.length > 60 || subject.length > 200) {
    return json(res, 422, { ok: false, error: 'invalid_field' });
  }

  const submitted = { name, email, phone, subject, message };

  try {
    if (process.env.RESEND_API_KEY) {
      const to = process.env.CONTACT_TO || 'thepentecostalfaithgospel@gmail.com';
      const from = process.env.CONTACT_FROM || 'Website <onboarding@resend.dev>';
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from,
          to: [to],
          reply_to: email,
          subject: `Website enquiry: ${subject}`,
          text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone || 'Not provided'}\nSubject: ${subject}\n\n${message}`,
          html: `<h2>Website enquiry</h2><p><strong>Name:</strong> ${escapeHtml(name)}<br><strong>Email:</strong> ${escapeHtml(email)}<br><strong>Phone:</strong> ${escapeHtml(phone || 'Not provided')}<br><strong>Subject:</strong> ${escapeHtml(subject)}</p><p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`
        })
      });

      if (!response.ok) {
        return json(res, 502, { ok: false, error: 'delivery_failed' });
      }

      return json(res, 200, { ok: true });
    }

    if (process.env.CONTACT_WEBHOOK_URL) {
      const response = await fetch(process.env.CONTACT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitted)
      });

      if (!response.ok) {
        return json(res, 502, { ok: false, error: 'delivery_failed' });
      }

      return json(res, 200, { ok: true });
    }

    return json(res, 503, { ok: false, error: 'not_configured' });
  } catch {
    return json(res, 502, { ok: false, error: 'delivery_error' });
  }
};

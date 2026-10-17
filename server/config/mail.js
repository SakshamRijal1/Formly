
const getSender = () => {
  const from = process.env.SMTP_FROM;

  if (!from) {
    throw new Error(
      "Email configuration missing: SMTP_FROM"
    );
  }

  // Supports: Formly <verified@example.com>
  const match = from.match(/^(.*?)\s*<([^<>]+)>$/);

  if (match) {
    return {
      name: match[1].trim().replace(/^"|"$/g, ""),
      email: match[2].trim(),
    };
  }

  if (!from.includes("@")) {
    throw new Error(
      "Invalid SMTP_FROM. Use your verified sender email."
    );
  }

  return {
    email: from.trim(),
  };
};

export const sendEmail = async ({ to, subject, html }) => {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Email configuration missing: BREVO_API_KEY"
    );
  }

  if (!to || !subject || !html) {
    throw new Error(
      "Email recipient, subject and HTML content are required."
    );
  }

  const response = await fetch(
    "https://api.brevo.com/v3/smtp/email",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: getSender(),
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    }
  );

  if (!response.ok) {
    const details = await response.text();

    throw new Error(
      `Brevo email API failed (${response.status}): ${details}`
    );
  }

  return response.json();
};

// Preserve compatibility with controllers that use
// transporter.sendMail({ from, to, subject, html }).
const transporter = {
  sendMail: async ({ from, to, subject, html }) => {
    return sendEmail({
      to,
      subject,
      html,
    });
  },
};

export default transporter;

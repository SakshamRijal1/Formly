
const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export const responseEmailTemplate = ({ form, answers, submittedAt }) => {
  const answerRows = answers
    .map((answer, index) => {
      const question = form.questions.find(
        (q) => String(q._id) === String(answer.questionId)
      );

      const questionTitle = question?.title || `Question ${index + 1}`;

      const answerValue = Array.isArray(answer.value)
        ? answer.value.join(", ")
        : answer.value ?? "";

      return `
        <tr>
          <td style="padding:18px 20px;border-bottom:1px solid #e5e7eb;">
            <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#111827;">
              ${escapeHtml(questionTitle)}
            </p>
            <p style="margin:0;font-size:14px;line-height:1.7;color:#4b5563;white-space:pre-wrap;overflow-wrap:anywhere;">
              ${escapeHtml(answerValue || "No answer provided")}
            </p>
          </td>
        </tr>
      `;
    })
    .join("");

  const safeTitle = escapeHtml(form.title || "Form response");
  const safeDescription = escapeHtml(form.description || "");
  const formattedDate = new Date(submittedAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kathmandu",
  });

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Your Formly response</title>
      </head>

      <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
        <div style="display:none;max-height:0;overflow:hidden;">
          Here is a copy of your submitted response to ${safeTitle}.
        </div>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:32px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">

                <tr>
                  <td style="background:#673ab7;padding:26px 28px;color:#ffffff;">
                    <p style="margin:0 0 10px;font-size:13px;font-weight:700;letter-spacing:1px;">
                      FORMLY
                    </p>
                    <h1 style="margin:0;font-size:24px;line-height:1.35;">
                      Response receipt
                    </h1>
                    <p style="margin:10px 0 0;font-size:14px;line-height:1.6;color:#ede9fe;">
                      Your response has been submitted successfully.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:26px 28px 18px;">
                    <h2 style="margin:0;font-size:21px;line-height:1.4;">
                      ${safeTitle}
                    </h2>

                    ${
                      safeDescription
                        ? `<p style="margin:10px 0 0;font-size:14px;line-height:1.7;color:#6b7280;">${safeDescription}</p>`
                        : ""
                    }

                    <p style="margin:14px 0 0;font-size:12px;color:#6b7280;">
                      Submitted on ${escapeHtml(formattedDate)}
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 20px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
                      ${answerRows || `
                        <tr>
                          <td style="padding:20px;color:#6b7280;font-size:14px;">
                            No answers were provided.
                          </td>
                        </tr>
                      `}
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:20px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;">
                    <p style="margin:0;font-size:12px;line-height:1.7;color:#6b7280;">
                      This is a copy of the answers you submitted. If you believe
                      you made a mistake, please contact the form owner.
                    </p>
                    <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">
                      Sent by Formly · This is an automated email.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

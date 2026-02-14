export const generateWelcomeEmail = (name: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #000; padding: 20px; text-align: center; }
    .logo { color: #fff; font-weight: bold; font-size: 24px; text-decoration: none; }
    .content { padding: 30px 20px; background: #fff; }
    .button { display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 4px; margin-top: 20px; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="https://visio-lead-gen.vercel.app" class="logo">Visio AI</a>
    </div>
    <div class="content">
      <h1>Welcome to V-Prai, ${name}!</h1>
      <p>We're thrilled to have you on board. V-Prai is your AI-powered PR strategist for music industry success.</p>
      <p>Here's what you can do right now:</p>
      <ul>
        <li><strong>Find Leads:</strong> Search for managers, labels, and playlists.</li>
        <li><strong>Draft Pitches:</strong> Generate professional emails in seconds.</li>
        <li><strong>Organize:</strong> Save your contacts in the dashboard.</li>
      </ul>
      <a href="https://visio-lead-gen.vercel.app/dashboard" class="button">Go to Dashboard</a>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Visio AI. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

export const generateInvoiceEmail = (name: string, plan: string, amount: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #000; padding: 20px; text-align: center; }
    .logo { color: #fff; font-weight: bold; font-size: 24px; text-decoration: none; }
    .content { padding: 30px 20px; background: #fff; }
    .invoice-box { background: #f9f9f9; padding: 20px; border-radius: 4px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="https://visio-lead-gen.vercel.app" class="logo">Visio AI</a>
    </div>
    <div class="content">
      <h1>Payment Confirmation</h1>
      <p>Hi ${name},</p>
      <p>Thank you for your payment. Your subscription to <strong>${plan}</strong> is now active.</p>
      
      <div class="invoice-box">
        <p><strong>Plan:</strong> ${plan}</p>
        <p><strong>Amount:</strong> ${amount}</p>
        <p><strong>Status:</strong> Paid</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      </div>

      <p>You now have full access to all features included in your plan.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Visio AI. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

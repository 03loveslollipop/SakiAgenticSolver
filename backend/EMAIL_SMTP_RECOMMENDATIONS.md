# Email SMTP Configuration - Recommendations

## Current Situation

We attempted to use **iCloud SMTP** (`smtp.mail.me.com`) for sending transactional emails from the platform. However, we encountered several issues:

### Issues Encountered

1. **SSL/TLS Configuration**: Initial error with SSL vs STARTTLS (fixed)
2. **Authentication Format**: Username needed to be full email address (fixed)
3. **Custom Domain Rejection**: `(550, '5.1.1 Mailbox does not exist')` error when trying to send from `saki@02labs.me`
4. **Rate Limiting**: iCloud has strict rate limits for programmatic sending
5. **Service Reliability**: iCloud SMTP can be unreliable for server-side applications

### Why iCloud SMTP is Problematic

According to Apple's documentation and our testing:

- **Personal Use Only**: iCloud SMTP is designed for personal email clients, not transactional/automated sending
- **Custom Domains**: Sending from custom domains requires iCloud+ configuration and has limitations
- **Rate Limits**: Very strict limits on automated sending
- **Authentication**: Must send FROM the same address you authenticate WITH
- **Reliability**: Not designed for high-volume or critical transactional emails

## Recommended Solutions

### Option 1: Gmail SMTP (Free, Easy Setup)

**Pros:**
- Free for low volume
- Reliable and well-documented
- Supports app-specific passwords
- Better rate limits than iCloud

**Cons:**
- Still has daily sending limits (500 emails/day)
- Requires Google account

**Configuration:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
SMTP_FROM=your-email@gmail.com
SMTP_FROM_NAME=Saki - Agentic CTF Solver Orchestration
```

**Setup:**
1. Enable 2FA on your Google account
2. Generate app-specific password: https://myaccount.google.com/apppasswords
3. Use the generated password in `SMTP_PASSWORD`

---

### Option 2: SendGrid (Recommended for Production)

**Pros:**
- **Free tier**: 100 emails/day forever
- Designed for transactional emails
- Excellent deliverability
- Detailed analytics and logs
- Custom domain support
- API and SMTP options

**Cons:**
- Requires account signup
- Free tier has SendGrid branding in emails

**Configuration:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM=saki@02labs.me
SMTP_FROM_NAME=Saki - Agentic CTF Solver Orchestration
```

**Setup:**
1. Sign up at https://sendgrid.com
2. Verify your domain (optional but recommended)
3. Create an API key in Settings → API Keys
4. Use `apikey` as username and the API key as password

**Free Tier:**
- 100 emails/day
- Email validation
- Deliverability insights
- Email activity tracking

---

### Option 3: Mailgun (Alternative to SendGrid)

**Pros:**
- **Free tier**: 5,000 emails/month for 3 months
- Excellent for developers
- Custom domain support
- Detailed logs and analytics

**Cons:**
- Requires credit card for verification
- After 3 months, need paid plan

**Configuration:**
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASSWORD=your-mailgun-smtp-password
SMTP_FROM=saki@02labs.me
SMTP_FROM_NAME=Saki - Agentic CTF Solver Orchestration
```

---

### Option 4: AWS SES (Best for Scale)

**Pros:**
- Very cheap ($0.10 per 1,000 emails)
- Highly scalable
- Excellent deliverability
- Part of AWS ecosystem

**Cons:**
- Requires AWS account
- More complex setup
- Starts in sandbox mode (limited sending)

**Configuration:**
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASSWORD=your-ses-smtp-password
SMTP_FROM=saki@02labs.me
SMTP_FROM_NAME=Saki - Agentic CTF Solver Orchestration
```

---

## Recommendation for Saki Platform

### For Development/Testing:
**Use Gmail SMTP** - Quick to set up, reliable, free

### For Production:
**Use SendGrid** - Best balance of features, reliability, and cost
- Free tier is sufficient for initial users
- Easy to scale up when needed
- Professional deliverability
- Custom domain support

## Migration Steps

### To Switch to SendGrid:

1. **Sign up for SendGrid**
   - Go to https://sendgrid.com
   - Create free account

2. **Create API Key**
   - Settings → API Keys → Create API Key
   - Give it "Mail Send" permissions
   - Copy the API key

3. **Update Northflank Environment Variables**
   ```
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASSWORD=<your-sendgrid-api-key>
   SMTP_FROM=saki@02labs.me
   SMTP_FROM_NAME=Saki - Agentic CTF Solver Orchestration
   ```

4. **Verify Domain (Optional but Recommended)**
   - Settings → Sender Authentication → Domain Authentication
   - Follow DNS setup instructions
   - This improves deliverability and removes SendGrid branding

5. **Test**
   ```bash
   curl -X POST 'https://api.saki.02labs.me/debug/send-test-email?email=quizgamer234@gmail.com'
   ```

## Current Status

- ✅ Email service code is working correctly
- ✅ STARTTLS configuration is correct
- ✅ Email templates are ready
- ❌ iCloud SMTP is not suitable for this use case
- 🔄 Need to switch to a transactional email provider

## Next Steps

1. Choose an email provider (recommend SendGrid)
2. Update Northflank environment variables
3. Test email sending
4. Remove debug endpoint before production deployment

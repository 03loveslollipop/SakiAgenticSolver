# Email Templates

This directory contains email templates for the Saki authentication system.

Saki is an Agentic CTF Solver Orchestration platform that automates the creation and management of Azure VMs for solving CTF challenges using AI agents.

## Template Structure

Each email type has two template files:
- `.html` - HTML version with styling
- `.txt` - Plain text version (fallback for email clients that don't support HTML)

## Available Templates

### 1. Welcome Email (`welcome.html`, `welcome.txt`)
Sent when a new user account is created by an admin.

**Variables:**
- `{{username}}` - User's email address
- `{{temporary_password}}` - Generated temporary password

### 2. Password Reset (`password_reset.html`, `password_reset.txt`)
Sent when a user requests a password reset.

**Variables:**
- `{{reset_link}}` - Full URL with reset token

### 3. 2FA Disabled Notification (`2fa_disabled.html`, `2fa_disabled.txt`)
Sent when 2FA is disabled for a user account (security notification).

**Variables:**
- `{{username}}` - User's email address

## Template Syntax

Templates use simple `{{variable}}` placeholder syntax. The EmailService will replace these placeholders with actual values.

Example:
```html
<p>Hello {{username}}, your password is {{temporary_password}}</p>
```

## Customization

To customize email templates:

1. Edit the HTML files for styling and content
2. Edit the corresponding TXT files to match the HTML content
3. Keep variable placeholders (`{{variable}}`) intact
4. Test emails after making changes

## Email Sender Configuration

Emails are sent from the address configured in the `.env` file:

```bash
# Email sender configuration
SMTP_FROM=saki@02labs.me
SMTP_FROM_NAME=Saki - Agentic CTF Solver Orchestration

# For iCloud, use your iCloud email address
SMTP_USER=saki@02labs.me
SMTP_PASSWORD=your-app-specific-password
```

### Using iCloud (Current Configuration)

The Saki platform is configured to use iCloud SMTP:

1. **Generate App-Specific Password**:
   - Go to https://appleid.apple.com/account/manage
   - Sign in with your Apple ID
   - Navigate to "Sign-In and Security" section
   - Click "App-Specific Passwords"
   - Click "Generate an app-specific password"
   - Enter a label (e.g., "Saki Platform")
   - Copy the generated 16-character password (format: xxxx-xxxx-xxxx-xxxx)

2. **Configure in `.env`**:
   ```bash
   SMTP_HOST=smtp.mail.me.com
   SMTP_PORT=587
   SMTP_USER=saki@02labs.me
   SMTP_PASSWORD=xxxx-xxxx-xxxx-xxxx
   SMTP_FROM=saki@02labs.me
   SMTP_FROM_NAME=Saki - Agentic CTF Solver Orchestration
   ```

3. **Important Notes**:
   - Use the app-specific password, NOT your regular Apple ID password
   - The password format includes dashes (xxxx-xxxx-xxxx-xxxx)
   - `SMTP_FROM` should match `SMTP_USER` for iCloud
   - Port 587 uses STARTTLS encryption

### Using Gmail

If switching to Gmail as your SMTP server:

1. Enable 2-Step Verification on your Google Account
2. Generate an App Password:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the generated 16-character password
3. Configure in `.env`:
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   SMTP_FROM=your-email@gmail.com
   SMTP_FROM_NAME=Saki - Agentic CTF Solver Orchestration
   ```

**Note:** The `SMTP_FROM` address will appear as the sender. If using Gmail, it's recommended to use your Gmail address to avoid delivery issues.

### Using Custom Domain

If you have a custom domain with email hosting:

1. Get SMTP credentials from your email provider
2. Set `SMTP_HOST` to your provider's SMTP server
3. Set `SMTP_PORT` (usually 587 for TLS or 465 for SSL)
4. Set `SMTP_FROM` to your custom domain email (e.g., `noreply@yourdomain.com`)
5. Set `SMTP_FROM_NAME` to your organization name

## Testing

To test email templates:

```python
from services.email_service import EmailService

email_service = EmailService()

# Test welcome email
await email_service.send_welcome_email(
    to_email="test@example.com",
    username="test@example.com",
    temporary_password="TestPassword123!"
)
```

## Best Practices

1. **Keep it simple**: Email clients have varying HTML/CSS support
2. **Use inline styles**: External stylesheets don't work in most email clients
3. **Test across clients**: Gmail, Outlook, Apple Mail, etc.
4. **Provide plain text**: Always include a `.txt` version
5. **Mobile-friendly**: Use responsive design principles
6. **Clear CTAs**: Make buttons and links obvious
7. **Security warnings**: Clearly mark security-related emails

## Troubleshooting

### Emails not sending
- Check SMTP credentials in `.env`
- Verify SMTP server and port
- Check firewall/network settings
- Review application logs for errors

### Emails going to spam
- Use a verified sender domain
- Include unsubscribe link (for bulk emails)
- Avoid spam trigger words
- Set up SPF, DKIM, and DMARC records for your domain

### Variables not replaced
- Ensure variable names match exactly (case-sensitive)
- Check for typos in template placeholders
- Verify EmailService is using correct template files

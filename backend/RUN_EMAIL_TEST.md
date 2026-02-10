# How to Run the Email Test

## Option 1: Run in Northflank Container (Recommended)

### Step 1: Access the Northflank Container Terminal
1. Go to your Northflank dashboard
2. Navigate to your backend service
3. Click on the **Terminal** tab
4. You should see a shell prompt

### Step 2: Run the Email Test Script
```bash
python send_test_email.py
```

### Step 3: Check the Output
You should see something like:
```
📧 Email Service Test
======================================================================
✓ SMTP Host: smtp.mail.me.com
✓ SMTP Port: 587
✓ SMTP User: saki@02labs.me
✓ From: Saki - Agentic CTF Solver Orchestration <saki@02labs.me>
======================================================================

📨 Sending welcome email to quizgamer234@gmail.com...

✅ SUCCESS! Email sent to quizgamer234@gmail.com
   Username: quizgamer234@gmail.com
   Temporary Password: TempPass123!@#

📬 Check your inbox for the welcome email!
```

### Step 4: Check the Email
Check `quizgamer234@gmail.com` inbox for the welcome email from `saki@02labs.me`

---

## Option 2: Run via SSH (If you have SSH access)

```bash
ssh user@your-northflank-backend-host
cd /app
python send_test_email.py
```

---

## Troubleshooting

### If you see: "SMTP credentials not configured!"
This means the environment variables are not set. Check:
- `SMTP_HOST` - Should be `smtp.mail.me.com`
- `SMTP_PORT` - Should be `587`
- `SMTP_USER` - Should be `saki@02labs.me`
- `SMTP_PASSWORD` - Should be your iCloud app-specific password

### If you see: "Failed to send email"
Check the logs for the actual error. Common issues:
- Wrong SMTP password
- iCloud account not allowing app-specific passwords
- Network/firewall blocking SMTP port 587
- Email address is invalid

---

## What Gets Sent

The script sends a **Welcome Email** containing:
- Welcome message
- Username: `quizgamer234@gmail.com`
- Temporary Password: `TempPass123!@#`
- Instructions to set up 2FA
- Link to the platform

The email is sent from: `Saki - Agentic CTF Solver Orchestration <saki@02labs.me>`

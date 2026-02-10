# Creating the First Admin User

After deploying the Saki platform, you need to create the first admin user to access the system. There are three methods to do this:

## Method 1: Using the Python Script (Recommended)

This method uses the UserManager service to create a user with a randomly generated password and sends a welcome email.

### Prerequisites
- Backend deployed and running
- MongoDB accessible
- Environment variables configured (especially SMTP for email)

### Steps

1. **Connect to your backend server** (or run locally with production MongoDB):
   ```bash
   cd backend
   ```

2. **Ensure you have the correct environment variables**:
   ```bash
   # For local execution with production MongoDB
   export MONGODB_URL="your-production-mongodb-url"
   export JWT_SECRET_KEY="your-jwt-secret"
   export ENCRYPTION_KEY="your-encryption-key"
   export SMTP_HOST="smtp.mail.me.com"
   export SMTP_PORT="587"
   export SMTP_USER="saki@02labs.me"
   export SMTP_PASSWORD="your-app-password"
   ```

3. **Run the script**:
   ```bash
   python create_admin.py admin@02labs.me
   ```

4. **Save the generated password** - it will be displayed in the terminal and sent via email.

### Output Example
```
🔧 Creating admin user: admin@02labs.me
============================================================
📡 Connecting to MongoDB...
✅ Connected to MongoDB
👤 Creating admin user...
✅ Admin user created successfully!

============================================================
📧 USER CREDENTIALS
============================================================
Email:    admin@02labs.me
Password: Xy9#mK2$pL4@qR8z
Role:     admin
User ID:  user_1234567890.123
============================================================

📨 Sending welcome email...
✅ Welcome email sent successfully!

============================================================
🎉 ADMIN USER CREATED SUCCESSFULLY!
============================================================
```

---

## Method 2: Using Direct MongoDB Insert

This method creates a user directly in MongoDB with a password you specify (no email sent).

### Steps

1. **Connect to your backend server**:
   ```bash
   cd backend
   ```

2. **Set environment variables**:
   ```bash
   export MONGODB_URL="your-production-mongodb-url"
   ```

3. **Run the script with your chosen password**:
   ```bash
   python create_admin_direct.py admin@02labs.me "MySecurePassword123!"
   ```

### Output Example
```
🔧 Creating admin user: admin@02labs.me
============================================================
📡 Connecting to MongoDB...
✅ Connected to MongoDB
🔐 Hashing password...
💾 Inserting user into database...

============================================================
✅ ADMIN USER CREATED SUCCESSFULLY!
============================================================
Email:    admin@02labs.me
Password: MySecurePassword123!
Role:     admin
User ID:  user_1234567890.123
============================================================
```

---

## Method 3: Using Northflank CLI (For Northflank Deployments)

If your backend is deployed on Northflank, you can run the script directly on the deployed service.

### Steps

1. **Port forward to MongoDB** (if needed):
   ```bash
   northflank port-forward addon <mongodb-addon-id> --port 27017
   ```

2. **Run the script locally** with production MongoDB:
   ```bash
   cd backend
   export MONGODB_URL="mongodb://localhost:27017"
   python create_admin.py admin@02labs.me
   ```

Alternatively, you can use Northflank's job feature to run the script:

1. Create a one-off job in Northflank
2. Use the same Docker image as your backend
3. Override the command to: `python create_admin.py admin@02labs.me`
4. Check the logs for the generated password

---

## Method 4: Manual MongoDB Insert (Advanced)

If you have direct access to MongoDB, you can insert the user manually.

### Steps

1. **Connect to MongoDB**:
   ```bash
   mongosh "your-mongodb-connection-string"
   ```

2. **Switch to the database**:
   ```javascript
   use ctf_platform
   ```

3. **Generate a password hash** (use Python):
   ```python
   import bcrypt
   password = "YourPassword123!"
   password_bytes = password.encode('utf-8')
   salt = bcrypt.gensalt()
   password_hash = bcrypt.hashpw(password_bytes, salt).decode('utf-8')
   print(password_hash)
   ```

4. **Insert the user document**:
   ```javascript
   db.users.insertOne({
     "_id": "user_" + Date.now(),
     "email": "admin@02labs.me",
     "password_hash": "PASTE_HASH_HERE",
     "role": "admin",
     "is_active": true,
     "is_2fa_enabled": false,
     "totp_secret": null,
     "created_at": new Date(),
     "last_login": null,
     "created_by": "system"
   })
   ```

---

## After Creating the Admin User

1. **Go to your frontend**: https://saki.02labs.me

2. **Login** with the email and password

3. **Set up 2FA**:
   - On first login, you'll see a QR code
   - Scan it with Google Authenticator or Authy
   - Enter the 6-digit code to complete setup

4. **You're ready!** You can now:
   - Create additional users
   - Manage user roles
   - Access all admin features

---

## Troubleshooting

### "MongoDB client not initialized"
- Make sure `MONGODB_URL` environment variable is set
- Check that MongoDB is accessible from where you're running the script

### "Failed to send welcome email"
- User is still created successfully
- Check SMTP environment variables
- Verify iCloud app-specific password is correct

### "User already exists"
- The email is already in the database
- Use a different email or delete the existing user first

### "Invalid email format"
- Make sure the email contains @ and a domain

---

## Security Notes

- **Save the password immediately** - it won't be shown again
- **Change the password** after first login if desired (feature coming soon)
- **Enable 2FA immediately** - it's mandatory for all users
- **Don't commit passwords** to version control
- **Use strong passwords** - at least 8 characters with mixed case, numbers, and symbols

---

## Need Help?

If you encounter issues:
1. Check the script output for error messages
2. Verify all environment variables are set correctly
3. Ensure MongoDB is accessible
4. Check backend logs for additional details

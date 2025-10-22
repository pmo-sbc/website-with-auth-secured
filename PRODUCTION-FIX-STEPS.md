# Fix Password Reset Error on Production

## The Error
```
no such column: password_reset_token
```

## Why This Happens
Your production database is missing the `password_reset_token` columns. These need to be added via migration.

## Step-by-Step Fix

### Step 1: Upload Files to Production Server
Upload these files to your production server:
- `migrate-add-password-reset.js`
- `check-database-columns.js` (optional, for testing)

### Step 2: SSH into Your Production Server
```bash
ssh your-user@your-production-server
cd /path/to/your/app
```

### Step 3: Check Current Database State (Optional)
```bash
node check-database-columns.js
```

You should see that `password_reset_token` is **✗ MISSING**

### Step 4: Backup Database
**CRITICAL - Don't skip this!**
```bash
cp prompts.db prompts.db.backup.$(date +%Y%m%d-%H%M%S)
```

### Step 5: Stop Your Application
```bash
# If using PM2:
pm2 stop all

# Or if using systemd:
sudo systemctl stop your-app-name

# Or if running directly:
pkill node
```

### Step 6: Run the Migration
```bash
node migrate-add-password-reset.js
```

Expected output:
```
Migrating database: prompts.db
Starting migration...

Adding password_reset_token column...
✓ Added password_reset_token column
Adding password_reset_token_expires column...
✓ Added password_reset_token_expires column
Adding is_admin column...
✓ Added is_admin column (or already exists)
✓ Set user "username" (ID: 1) as admin

✓ Migration completed successfully!
Your database now supports:
  - Password reset functionality
  - Admin user management
```

### Step 7: Verify Migration (Optional)
```bash
node check-database-columns.js
```

Now you should see `password_reset_token: ✓ EXISTS`

### Step 8: Restart Your Application
```bash
# If using PM2:
pm2 start all
# or
pm2 start server.js

# Or if using systemd:
sudo systemctl start your-app-name

# Or if running directly:
npm start
```

### Step 9: Test the Feature
1. Go to `https://your-domain.com/admin-users.html`
2. Find a user with verified email
3. Click "🔑 Reset PW" button
4. Should now work without errors!

## If Something Goes Wrong

### Restore from Backup
```bash
# Stop the app
pm2 stop all

# Restore backup
cp prompts.db.backup.* prompts.db

# Restart app
pm2 start all
```

## Alternative: Manual SQL (if migration script doesn't work)

If for some reason the migration script fails, you can add the columns manually:

```bash
# Open SQLite
sqlite3 prompts.db

# Run these commands:
ALTER TABLE users ADD COLUMN password_reset_token TEXT;
ALTER TABLE users ADD COLUMN password_reset_token_expires DATETIME;
ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0;

# Make first user admin
UPDATE users SET is_admin = 1 WHERE id = 1;

# Exit
.quit
```

## Need Help?

If you're still getting errors:
1. Check the exact error message
2. Run `node check-database-columns.js` and send me the output
3. Check if you have write permissions to the database file
4. Make sure the database file path is correct (check your .env file for DB_PATH)

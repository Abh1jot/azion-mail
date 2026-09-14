# Azion Mail - Administrator Operations Handbook

This handbook provides practical commands, maintenance routines, and troubleshooting procedures for Azion Mail administrators.

---

## 🛠️ Common Administrative Commands

### 1. Mail Queue Management
You can view and manage the Postfix mail spool directly in the **Admin > Mail Queue** page of the web console, or via CLI:

```bash
# View all messages currently in queue
docker compose exec postfix postqueue -p

# View queue in JSON format
docker compose exec postfix postqueue -j

# Force immediate delivery attempt for all deferred messages
docker compose exec postfix postqueue -f

# Delete a specific message by queue ID
docker compose exec postfix postsuper -d <MESSAGE_ID>

# Purge all deferred messages
docker compose exec postfix postsuper -d ALL deferred
```

---

## 🧹 2. Rspamd Bayes Spam Training

Rspamd automatically learns from user moves to the "Junk" / "Trash" folder. To manually train Rspamd from an `.eml` sample:

```bash
# Train as Spam
docker compose exec rspamd rspamc learn_spam < /path/to/spam.eml

# Train as Ham (Clean Mail)
docker compose exec rspamd rspamc learn_ham < /path/to/ham.eml

# View Rspamd statistics & counters
docker compose exec rspamd rspamc stat
```

---

## 📦 3. Automated Daily Backup via Cron

To set up automatic daily backups at 03:00 AM, add the following cronjob:

```bash
sudo crontab -e
```

Add this line:
```cron
0 3 * * * cd /opt/azion-mail && sudo bash scripts/backup.sh > /var/log/azion-mail-backup.log 2>&1
```

---

## 🔍 4. Troubleshooting Checklist

### Issue: Emails Sent to Gmail Land in Spam
1. Run the **System Diagnostics** tool and check your **Reverse DNS (PTR)** record.
2. Confirm your DKIM record is published and verified via `dig TXT mail._domainkey.yourdomain.com`.
3. Check if your VPS public IP is listed on Spamhaus or Barracuda IP blocklists.
4. If testing on a brand new IP address, warm up sending volume gradually (e.g. 20-50 emails/day for the first week).

### Issue: Incoming Mail Not Arriving
1. Ensure your domain's MX record points to `mail.yourdomain.com` with priority 10.
2. Verify port 25 is listening on the host:
   ```bash
   telnet localhost 25
   ```
3. Check Postfix container logs:
   ```bash
   docker compose logs -f postfix
   ```

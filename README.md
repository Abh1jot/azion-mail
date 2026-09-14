# Azion Mail 📬

> **Production-Ready, Ultra-Lightweight Self-Hosted Email Hosting Platform for Azion Cloud**  
> Run your own modern email infrastructure on standard Linux VPS servers with Google Workspace-style management, 1-Click Cloudflare DNS Sync, and native Gmail "Send Mail As" client integration.

---

## ⚡ 1-Click VPS Deployment Command

Run this command on any fresh **Ubuntu 22.04 / 24.04**, **Debian 12**, or **Rocky Linux** VPS:

```bash
curl -sSL https://raw.githubusercontent.com/Abh1jot/azion-mail/main/deploy.sh | sudo bash
```

*Or via Git:*

```bash
git clone https://github.com/Abh1jot/azion-mail.git
cd azion-mail
sudo bash deploy.sh
```

The script automatically audits your host, installs Docker and Docker Compose if missing, configures firewall ports, generates cryptographic secrets, spins up optimized Alpine containers, seeds the Superadmin account, and outputs your console URL and credentials!

---

## 🚀 Key Highlights & Architecture

- **Ultra-Lightweight Footprint (< 350MB RAM Idle)**: Tailored for standard $3.50–$5/mo VPS servers (1GB–2GB RAM). Postfix, Dovecot, and Rspamd run on hardened Alpine Linux with minimal worker pools.
- **Gmail "Send Mail As" & Forwarding**: Forward custom domain emails to your personal Gmail account with **SRS (Sender Rewriting Scheme)** so SPF never fails at Google. Use the built-in step-by-step wizard to reply and send as `support@yourdomain.com` directly from Gmail without exposing your personal address.
- **1-Click Cloudflare DNS Sync**: Connect your Cloudflare API token to instantly auto-detect zones and provision MX, SPF (`v=spf1 mx ~all`), DKIM (`mail._domainkey`), and DMARC (`v=DMARC1`) records with automatic repair diagnostics.
- **Automated 2048-bit RSA DKIM Key Generation**: Every domain added automatically receives an isolated 2048-bit RSA keypair and formatted DNS TXT record.
- **Built-In 1-Click System Test Button**: Audit your entire stack in one click—PostgreSQL, Redis, Postfix SMTP banner & handshake, Dovecot IMAP/POP3, Rspamd spam daemon, Reverse DNS (PTR), and TLS certificates.
- **Integrated SnappyMail Webmail**: High-speed, responsive webmail client with dark mode and Single Sign-On (SSO) straight from the mailbox dashboard.
- **Comprehensive REST API & Scoped API Keys**: Automate domain and mailbox provisioning with bearer tokens and granular API keys.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend & UI** | Next.js 15 (App Router), TypeScript, TailwindCSS, Lucide Icons, Glassmorphism |
| **Backend & API** | Node.js 22 LTS, Next.js API Routes, Prisma ORM, JWT, otplib (TOTP 2FA) |
| **Database & Cache** | PostgreSQL 16 Alpine (tuned shared buffers), Redis 7 Alpine |
| **SMTP Mail Server** | Postfix (virtual PostgreSQL lookups, Dovecot SASL, Postsrsd SRS) |
| **IMAP / POP3 / LMTP** | Dovecot (PostgreSQL auth passdb, virtual maildir quotas, LMTP delivery) |
| **Spam & Anti-Abuse** | Rspamd (Bayes learning, DKIM signer, ARC, Redis backend) |
| **Webmail Client** | SnappyMail (PHP 8.2 Alpine, fast, < 40MB RAM) |
| **Reverse Proxy & SSL** | Caddy 2.8 Alpine (automatic Let's Encrypt / ZeroSSL TLS certificates) |

---

## 📸 Core Capabilities

### 1. 1-Click System Diagnostics Test Center
Click **"Run Full System Test"** from the dashboard to perform an automated 8-point inspection:
1. **PostgreSQL Database Engine**: Verifies connection pool latency and schema consistency.
2. **Redis Cache**: Confirms session and rate limiting responsiveness.
3. **Postfix SMTP Daemon**: Connects to ports 25 and 587, verifying banner greetings and EHLO capabilities.
4. **Dovecot IMAP Service**: Tests port 143/993 sockets and SSL handshake.
5. **Rspamd Spam Filter**: Pings the Milter daemon and checks symbol heuristic rules.
6. **Reverse DNS (PTR)**: Validates that your VPS public IP resolves to the mailserver FQDN.
7. **Let's Encrypt / TLS Certificates**: Checks expiration dates and domain coverage.
8. **Resource Optimization**: Confirms lightweight VPS profile mode.

### 2. Domain & Cloudflare Management
- Add custom domains (e.g., `company.com`).
- View live DNS diagnostics with color-coded badges (Valid, Warning, Missing).
- Click **"Cloudflare Sync"** to provision all DNS records in 2 seconds.

### 3. Mailboxes & Virtual Aliases
- Create mailboxes with custom storage quotas (1GB, 5GB, 10GB, unlimited).
- Suspend, reset passwords, or delete mailboxes.
- Launch SnappyMail with one-click SSO.
- Map internal aliases (`sales@` -> `john@company.com`).

### 4. Gmail Setup Wizard
- Interactive 3-step walkthrough tailored for non-technical users.
- Live SMTP tester built into the wizard to confirm credentials before configuring Gmail.

### 5. Admin Panel & Mail Spool Manager
- Real-time CPU, RAM, Disk, and uptime statistics.
- Postfix mail queue monitor with **Flush Queue** (`postqueue -f`) and **Purge Deferred** buttons.
- Delivery logs and bounce event tracking.
- Rspamd Bayes spam statistics.

---

## 🔒 Security Best Practices

- **Password Hashing**: Stored with `{BLF-CRYPT}` bcrypt salts compatible with Dovecot's native authentication daemon.
- **Two-Factor Authentication (2FA)**: RFC 6238 TOTP with QR codes and 8 emergency backup recovery keys.
- **Sender Rewriting Scheme (SRS)**: Re-writes envelope senders on forwarded emails so external providers (Gmail, Yahoo, Outlook) pass SPF checks.
- **DKIM Signing**: Outgoing emails are signed by Rspamd using 2048-bit RSA keys.
- **Network Isolation**: All internal daemons (Postgres, Redis, Rspamd controller, Dovecot LMTP) communicate over private Docker bridge networks.

---

## 📦 Backup & Maintenance Scripts

### Create a Full Backup:
```bash
sudo bash scripts/backup.sh
```
Creates a dated archive in `/var/backups/azion-mail/` containing the PostgreSQL database dump, maildir directories, DKIM keys, and configuration.

### Restore from Backup:
```bash
sudo bash scripts/restore.sh /var/backups/azion-mail/azion_mail_full_20260914_080000.tar.gz
```

### Upgrade Azion Mail:
```bash
sudo bash scripts/upgrade.sh
```

---

## 📄 License & Credits

Built with ❤️ by the **Azion Cloud** engineering team. Distributed under the MIT License.

# Azion Mail - Linux VPS Deployment Guide

This guide provides comprehensive instructions for deploying **Azion Mail** on standard Linux VPS infrastructure (Hetzner, Linode, DigitalOcean, OVH, Vultr, Contabo).

---

## 📋 Minimum System Requirements

- **Operating System**: Ubuntu 22.04 / 24.04 LTS, Debian 12, or AlmaLinux / Rocky Linux 9
- **CPU**: 1 vCPU (2 vCPUs recommended for > 50 mailboxes)
- **RAM**: 1 GB RAM minimum (Azion Mail consumes < 350MB RAM in idle mode)
- **Disk**: 20 GB SSD / NVMe
- **Network**: Clean Public IPv4 with Reverse DNS (PTR) configurable

---

## 🌐 1. Essential VPS Preparation: Port 25 & Reverse DNS (PTR)

Before running the deployment script, ensure the following two critical email prerequisites are configured:

### A. Unblock Outgoing Port 25
Most cloud VPS providers (Hetzner, DigitalOcean, Linode, AWS) block outgoing TCP port 25 by default on new accounts to prevent spam abuse.
- **Action**: Log into your VPS provider dashboard or open a support ticket to request unblocking of outgoing port 25 for transactional email hosting.

### B. Configure Reverse DNS (PTR Record)
Mail providers (Gmail, Yahoo, Microsoft) strictly require that the IP address of your mailserver resolves back to the hostname declared in your SMTP banner (`mail.yourdomain.com`).
- **Action**: In your VPS networking control panel:
  - Find your server's Public IPv4.
  - Set the **Reverse DNS / PTR** record to: `mail.yourdomain.com`.

---

## 🚀 2. Quick Deploy Command

Connect to your VPS via SSH as `root`:

```bash
curl -sSL https://raw.githubusercontent.com/Abh1jot/azion-mail/main/deploy.sh | sudo bash
```

The installer will:
1. Detect and install Docker and Docker Compose if not found.
2. Open necessary firewall ports in UFW (`25`, `80`, `443`, `110`, `143`, `465`, `587`, `993`, `995`).
3. Create `.env` and generate random passwords for PostgreSQL, Redis, and JWT secrets.
4. Prompt for your mail server hostname (e.g. `mail.yourcompany.com`).
5. Launch all containers via Docker Compose.
6. Initialize the database and create your Superadmin account.

---

## 📡 3. DNS Configuration Guide

If you manage DNS manually or via Cloudflare:

| Record Type | Host / Name | Value | Priority | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `mail.yourdomain.com` | `YOUR_VPS_PUBLIC_IP` | - | Primary Mail Server IP |
| **MX** | `yourdomain.com` | `mail.yourdomain.com` | 10 | Routes incoming email |
| **TXT** | `yourdomain.com` | `v=spf1 mx a:mail.yourdomain.com ~all` | - | SPF Authorization |
| **TXT** | `mail._domainkey.yourdomain.com` | `v=DKIM1; k=rsa; p=YOUR_DKIM_KEY` | - | DKIM Signature Verification |
| **TXT** | `_dmarc.yourdomain.com` | `v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@yourdomain.com` | - | DMARC Enforcement |
| **CNAME** | `autoconfig.yourdomain.com` | `mail.yourdomain.com` | - | Thunderbird Auto-Setup |

> **Pro Tip**: Use the **1-Click Cloudflare Sync** button in the Azion Mail dashboard to automatically push all of the above records to Cloudflare without manual copy-pasting!

---

## 🧪 4. Post-Deployment Verification

1. Log into your dashboard at `https://mail.yourdomain.com`.
2. Navigate to **System Diagnostics**.
3. Click **"Run Full System Test"**.
4. Confirm all 8 service checks display green **PASSED** badges.
5. In the **Gmail Wizard**, enter your personal Gmail address to test incoming forwarding and "Send Mail As" replying.

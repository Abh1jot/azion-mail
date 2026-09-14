# Azion Mail - Security Architecture & Hardening Guide

Azion Mail is engineered to meet modern enterprise email deliverability and security standards.

---

## 🛡️ Security Layers

### 1. Cryptographic Authentication & Passwords
- **Hash Scheme**: Passwords for virtual mailboxes are stored using the `{BLF-CRYPT}` scheme with cost factor 12, natively supported by Dovecot passdb and Postfix SASL.
- **Two-Factor Authentication (2FA)**: Standard RFC 6238 TOTP with QR codes and 8 single-use cryptographically random backup codes.
- **Session Tokens**: JWT signed using HMAC-SHA256 with 7-day expiration and strict HTTP-only cookies (`SameSite=Lax`, `Secure` in production).

### 2. Email Reputation & Deliverability Protocols
- **DKIM (DomainKeys Identified Mail)**: 2048-bit RSA keys generated per-domain using Node's `crypto` module. Outgoing messages are digitally signed by Rspamd.
- **SPF (Sender Policy Framework)**: Strict SPF headers configured on custom domains.
- **DMARC (Domain-based Message Authentication, Reporting & Conformance)**: Pre-configured with `p=quarantine` policy and feedback reporting.
- **SRS (Sender Rewriting Scheme)**: When forwarding messages to external accounts (such as personal Gmail or Outlook), Postfix routes envelope senders through `postsrsd` so that SPF checks do not fail when Google verifies the incoming message.

### 3. Spam & Abuse Mitigation (Rspamd)
- **Bayes Filter**: Continuous machine-learning classifier with Redis backend.
- **Greylisting & Fuzzy Hashes**: Drops known bulk spam and automated dictionary attacks.
- **Rate Limiting**: Configured per authenticated user and per IP to prevent compromised accounts from becoming spam relays.

### 4. Network Isolation
- External ports exposed: `25`, `80`, `443`, `110`, `143`, `465`, `587`, `993`, `995`.
- Internal services (PostgreSQL, Redis, Dovecot LMTP, Rspamd controller) are strictly confined to the private Docker bridge network (`azion_net`) and are never exposed to public internet interfaces.

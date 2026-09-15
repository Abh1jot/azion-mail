#!/usr/bin/env python3
"""
Azion Mail - Outgoing Sent Email Archiver
Invoked by Postfix pipe transport on authenticated submissions.
Extracts message headers, subject, recipient, plain text, and HTML body,
and forwards them to the internal Azion Mail web API for delivery tracking.
"""

import sys
import json
import urllib.request
import urllib.error
import email
from email.header import decode_header
import re

def safe_decode_header(val):
    if not val:
        return ""
    try:
        decoded_parts = decode_header(val)
        res = []
        for part, enc in decoded_parts:
            if isinstance(part, bytes):
                res.append(part.decode(enc or 'utf-8', errors='replace'))
            else:
                res.append(str(part))
        return " ".join(res)
    except Exception:
        return str(val)

def extract_body(msg):
    body_text = ""
    body_html = ""
    
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            disposition = str(part.get('Content-Disposition', ''))
            
            # Skip attachment files
            if 'attachment' in disposition.lower():
                continue
                
            try:
                payload = part.get_payload(decode=True)
                if not payload:
                    continue
                charset = part.get_content_charset() or 'utf-8'
                decoded_str = payload.decode(charset, errors='replace')
                
                if content_type == 'text/plain' and not body_text:
                    body_text = decoded_str
                elif content_type == 'text/html' and not body_html:
                    body_html = decoded_str
            except Exception:
                pass
    else:
        try:
            payload = msg.get_payload(decode=True)
            if payload:
                charset = msg.get_content_charset() or 'utf-8'
                decoded_str = payload.decode(charset, errors='replace')
                if msg.get_content_type() == 'text/html':
                    body_html = decoded_str
                else:
                    body_text = decoded_str
        except Exception:
            pass

    # If only HTML exists, create a plain text preview
    if body_html and not body_text:
        body_text = re.sub(r'<[^>]+>', ' ', body_html).strip()

    # Cap size at 250KB per body to avoid DB exhaustion
    if len(body_text) > 250000:
        body_text = body_text[:250000] + "\n... [truncated]"
    if len(body_html) > 250000:
        body_html = body_html[:250000]

    return body_text, body_html

def main():
    try:
        raw_bytes = sys.stdin.buffer.read()
        if not raw_bytes:
            sys.exit(0)

        msg = email.message_from_bytes(raw_bytes)

        message_id = msg.get('Message-ID', '').strip()
        from_header = msg.get('From', '').strip()
        to_header = msg.get('To', '').strip()
        subject_raw = msg.get('Subject', '').strip()
        subject = safe_decode_header(subject_raw) or "(No Subject)"
        date_header = msg.get('Date', '').strip()

        body_text, body_html = extract_body(msg)

        # Extract primary email from From header (e.g. "Support <support@domain.com>" -> "support@domain.com")
        sender_match = re.search(r'[\w\.-]+@[\w\.-]+', from_header)
        sender = sender_match.group(0) if sender_match else from_header

        # Extract recipients from To header or sys.argv
        recipients = []
        if len(sys.argv) > 2 and sys.argv[2]:
            recipients.append(sys.argv[2].strip())
        else:
            recipients = [r.strip() for r in re.findall(r'[\w\.-]+@[\w\.-]+', to_header)]

        recipient = recipients[0] if recipients else to_header

        payload = {
            "messageId": message_id,
            "sender": sender,
            "recipient": recipient,
            "subject": subject,
            "bodyText": body_text,
            "bodyHtml": body_html,
            "sizeBytes": len(raw_bytes),
            "dateHeader": date_header,
        }

        # Send to internal web application
        req = urllib.request.Request(
            "http://web:3000/api/internal/archive-mail",
            data=json.dumps(payload).encode('utf-8'),
            headers={
                "Content-Type": "application/json",
                "User-Agent": "AzionMail-Postfix-Archiver/1.0",
                "X-Internal-Secret": "azion-internal-archive-secret"
            },
            method="POST"
        )

        urllib.request.urlopen(req, timeout=3)
    except Exception as e:
        # Never crash or prevent Postfix mail delivery
        pass

    sys.exit(0)

if __name__ == '__main__':
    main()

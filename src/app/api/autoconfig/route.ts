import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const emailaddress = req.nextUrl.searchParams.get('emailaddress') || '';
  const domain = emailaddress.split('@')[1] || process.env.MAIL_HOST?.replace(/^mail\./, '') || 'azioncloud.com';
  const mailHost = process.env.MAIL_HOST || `mail.${domain}`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<clientConfig version="1.1">
  <emailProvider id="${domain}">
    <domain>${domain}</domain>
    <displayName>${domain} Mail</displayName>
    <displayShortName>${domain}</displayShortName>

    <!-- Incoming IMAP SSL -->
    <incomingServer type="imap">
      <hostname>${mailHost}</hostname>
      <port>993</port>
      <socketType>SSL</socketType>
      <authentication>password-cleartext</authentication>
      <username>%EMAILADDRESS%</username>
    </incomingServer>

    <!-- Incoming IMAP STARTTLS -->
    <incomingServer type="imap">
      <hostname>${mailHost}</hostname>
      <port>143</port>
      <socketType>STARTTLS</socketType>
      <authentication>password-cleartext</authentication>
      <username>%EMAILADDRESS%</username>
    </incomingServer>

    <!-- Outgoing SMTP TLS/STARTTLS -->
    <outgoingServer type="smtp">
      <hostname>${mailHost}</hostname>
      <port>587</port>
      <socketType>STARTTLS</socketType>
      <authentication>password-cleartext</authentication>
      <username>%EMAILADDRESS%</username>
    </outgoingServer>

    <!-- Outgoing SMTP SSL -->
    <outgoingServer type="smtp">
      <hostname>${mailHost}</hostname>
      <port>465</port>
      <socketType>SSL</socketType>
      <authentication>password-cleartext</authentication>
      <username>%EMAILADDRESS%</username>
    </outgoingServer>
  </emailProvider>
</clientConfig>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}

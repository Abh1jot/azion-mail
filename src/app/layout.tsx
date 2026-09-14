import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Azion Mail - Enterprise Self-Hosted Email Platform',
  description: 'Production-ready, lightweight self-hosted email hosting platform for Azion Cloud running on Linux VPS infrastructure.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-dark-bg text-dark-text min-h-screen antialiased selection:bg-azion-500/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}

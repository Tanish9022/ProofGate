import type { Metadata } from 'next';
import './globals.css';
import { TopBar } from '@/components/ui/TopBar';
import { ToastProvider } from '@/components/ui/Toast';
import { RoleProvider } from '@/components/ui/RoleSwitcher';
import { DemoTourBanner } from '@/components/ui/DemoTourBanner';

export const metadata: Metadata = {
  title: 'ProofGate',
  description: 'Check content against approved facts. Human approves. Clearance tracks every source version.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-paper text-ink font-sans">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <RoleProvider>
          <ToastProvider>
            <TopBar />
            <DemoTourBanner />
            <main id="main-content" className="min-h-[calc(100vh-64px)]">
              {children}
            </main>
          </ToastProvider>
        </RoleProvider>
      </body>
    </html>
  );
}


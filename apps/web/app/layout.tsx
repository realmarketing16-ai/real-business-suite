import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Real Business Suite',
  description: 'One login. Every part of your business.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'E-commerce Demo',
  description: 'E-commerce demo with concurrency control and hybrid rendering',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}



import type { Metadata } from 'next';
import './globals.css';
import './compiled.css';

export const metadata: Metadata = {
  title: 'LiquidityPulse — Market Microstructure & Quantitative Intelligence',
  description: 'Real-time order book microstructure analytics, ONNX ML inference, and quantitative anomaly detection platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen flex flex-col overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}

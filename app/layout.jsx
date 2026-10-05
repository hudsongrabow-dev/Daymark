import './globals.css';

export const metadata = {
  title: 'Daymark Planner',
  description: 'A calm personal assignment planner.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

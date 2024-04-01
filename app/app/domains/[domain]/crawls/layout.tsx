export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
      <h2>Logs</h2>
      {children}
    </div>
  );
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
      <h2>Settings</h2>
      {children}
    </div>
  );
}

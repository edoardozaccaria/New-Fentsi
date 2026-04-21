export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#0b0a09] text-[#f5ecdc]">
      {children}
    </div>
  );
}

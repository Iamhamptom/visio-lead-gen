import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tony Duardo x VisioCorp — Official Merch",
  description:
    "Exclusive Tony Duardo x VisioCorp merch collection. Limited edition streetwear starting from R800.",
};

export default function MerchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflow: "auto",
        zIndex: 9999,
        backgroundColor: "#050505",
      }}
    >
      {children}
    </div>
  );
}

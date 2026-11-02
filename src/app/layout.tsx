import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "HÙNG LÊ | Chuyên cung cấp thiết bị điện",
  description:
    "Danh mục thiết bị điện HÙNG LÊ. Liên hệ để nhận tư vấn và báo giá.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
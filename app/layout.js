// app/layout.js
import { Cairo } from "next/font/google";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata = {
  title: "منصة د. أحمد تمام — علم الأحياء",
  description: "منصة تعليمية متكاملة لمادة الأحياء مع د. أحمد تمام",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body className={cairo.className}>{children}</body>
    </html>
  );
}

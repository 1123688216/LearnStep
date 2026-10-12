import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LearnStep · 自适应学习助手",
  description: "围绕目标、诊断、课程、答疑和考核，根据答题证据持续调整的 AI 学习助手。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

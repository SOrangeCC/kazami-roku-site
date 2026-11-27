import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LiveStatusBar } from "@/components/LiveStatusBar";
import { Navbar } from "@/components/Navbar";
import { AudioPlayerDock } from "@/components/AudioPlayerDock";
import { SITE_CONFIG } from "@/lib/constants";

export const metadata: Metadata = {
  title: `${SITE_CONFIG.streamerName} | ${SITE_CONFIG.group}`,
  description: `${SITE_CONFIG.streamerName} 个人主页 · 歌单点歌 · 直播周表 · 美图画廊 · 二创聚合 · 直播数据`,
  icons: {
    icon: "/images/avatar.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem("roku-theme");var t=(s==="dark"||s==="light")?s:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-paper text-ink antialiased">
        <ThemeProvider>
          <LiveStatusBar />
          <Navbar />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24">
            {children}
          </main>
          <footer className="border-t border-frost bg-surface/60 py-6 text-center text-xs text-secondary">
            <div className="mx-auto max-w-6xl px-4">
              <p className="font-medium text-ink">
                {SITE_CONFIG.streamerName} · {SITE_CONFIG.group} · 粉丝名{" "}
                {SITE_CONFIG.fanName}
              </p>
              <p className="mt-1 italic">“{SITE_CONFIG.signature}”</p>
            </div>
          </footer>
          <AudioPlayerDock />
        </ThemeProvider>
      </body>
    </html>
  );
}

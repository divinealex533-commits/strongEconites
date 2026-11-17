import "./globals.css";

export const metadata = {
  title: "SSE ECONITES",
  description: "Class website for SSE ECONITES — Social Science Education (Economics), Faculty of Education, University of Benin.",
  icons: { icon: "/logo.jpg", apple: "/logo.jpg" },
  openGraph: { title: "SSE ECONITES", description: "Our class: chat, timetable, notes, study hub and CGPA calculator.", images: ["/logo.jpg"] },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#143322",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&family=Caveat:wght@600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { SessionProvider } from "@/components/session-context";
import { getRequestSurface } from "@/lib/request-surface";
import { getThemeInitScript } from "@/lib/theme";

const unionMetadataCopy = {
  en: {
    title: "Union | VedaMatch",
    description: "A mindful dating space for family, friendship, projects, and seva through shared values.",
  },
  ru: {
    title: "Союз | VedaMatch",
    description: "Осознанные знакомства для семьи, дружбы, проектов и севы через общие ценности.",
  },
  hi: {
    title: "Union | VedaMatch",
    description: "साझा मूल्यों के आधार पर परिवार, मित्रता, परियोजनाओं और सेवा के लिए सजग परिचय.",
  },
};

const defaultMetadataCopy = {
  title: "VedaMatch",
  description: "Browser-native VedaMatch portal for services, contacts, chats, library, news, travel, and support.",
};

export async function generateMetadata(): Promise<Metadata> {
  const { isUnion, language, origin } = await getRequestSurface();
  const metadataBase = new URL(origin);
  const copy = isUnion ? unionMetadataCopy[language] : defaultMetadataCopy;

  return {
    title: copy.title,
    description: copy.description,
    applicationName: "VedaMatch",
    metadataBase,
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title: copy.title,
      description: copy.description,
      siteName: "VedaMatch",
      type: "website",
      url: metadataBase,
      locale: language === "ru" ? "ru_RU" : language === "hi" ? "hi_IN" : "en_US",
    },
    twitter: {
      card: "summary",
      title: copy.title,
      description: copy.description,
    },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { language } = await getRequestSurface();

  return (
    <html lang={language} suppressHydrationWarning>
      <body>
        <Script id="vm-theme-init" strategy="beforeInteractive">
          {getThemeInitScript()}
        </Script>
        <SessionProvider initialLanguage={language}>{children}</SessionProvider>
      </body>
    </html>
  );
}

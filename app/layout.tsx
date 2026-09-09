import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: "Logos Academy · Oficina de Evidências",
  description: "Protótipo navegável da Logos Academy Platform",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body><TooltipProvider delayDuration={350}>{children}</TooltipProvider></body></html>;
}

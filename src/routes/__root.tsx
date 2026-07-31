import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import NotificationsProvider from "@/contexts/NotificationsProvider";
import { CallProvider } from "@/contexts/CallContext";
import GlobalCallRoot from "@/components/GlobalCallRoot";
import ForceUpdateOverlay from "@/components/ForceUpdateOverlay";
import TrialOverlay from "@/components/TrialOverlay";
import AppPersonalizationRoot from "@/components/AppPersonalizationRoot";
import BlockedAccountGate from "@/components/BlockedAccountGate";
import PremiumSecurityRoot from "@/components/PremiumSecurityRoot";
import "@/lib/safeVolume";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1.0, viewport-fit=cover",
      },
      { name: "theme-color", content: "#052e22" },
      { name: "author", content: "Jeux d'Hazard" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Jeux d'Hazard — Prédictions & Analyses Premium" },
      { property: "og:title", content: "Jeux d'Hazard — Prédictions & Analyses Premium" },
      { name: "twitter:title", content: "Jeux d'Hazard — Prédictions & Analyses Premium" },
      { name: "description", content: "Plateforme Premium de Prédictions et Analyses Avancées pour Aviator, JetX, CosmoX.\nInterface Luxe, Analyses en Temps Réel. Tous droits réservés - Copyright 2017" },
      { property: "og:description", content: "Plateforme Premium de Prédictions et Analyses Avancées pour Aviator, JetX, CosmoX.\nInterface Luxe, Analyses en Temps Réel. Tous droits réservés - Copyright 2017" },
      { name: "twitter:description", content: "Plateforme Premium de Prédictions et Analyses Avancées pour Aviator, JetX, CosmoX.\nInterface Luxe, Analyses en Temps Réel. Tous droits réservés - Copyright 2017" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/a38e51ab-9824-4abf-adb0-f8ddf649faff" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/a38e51ab-9824-4abf-adb0-f8ddf649faff" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Manrope:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {mounted ? (
          <AuthProvider>
            <CallProvider>
              <NotificationsProvider>
                <ForceUpdateOverlay />
                <AppPersonalizationRoot />
                <GlobalCallRoot />
                <TrialOverlay />
                <PremiumSecurityRoot />
                <BlockedAccountGate />

                {/* Required: nested routes render here. */}
                <Outlet />
              </NotificationsProvider>
            </CallProvider>
          </AuthProvider>
        ) : null}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

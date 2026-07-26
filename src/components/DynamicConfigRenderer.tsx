import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Trophy, Shield, Rocket, Info, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { useAppConfig, type AppConfig } from "@/hooks/useAppConfig";
import { Link } from "react-router-dom";

const ICONS: Record<string, any> = { sparkles: Sparkles, zap: Zap, trophy: Trophy, shield: Shield, rocket: Rocket };

export function DynamicConfigRenderer() {
  const { config } = useAppConfig();
  return (
    <div className="space-y-4">
      <DynamicBanners banners={config.home?.banners} />
      {config.home?.hero && <DynamicHero hero={config.home.hero} />}
      {config.home?.sections?.map((s) => (
        <div key={s.id}>
          {s.kind === "cards" ? <CardsSection section={s as any} /> : <TextSection section={s as any} />}
        </div>
      ))}
    </div>
  );
}

function DynamicHero({ hero }: { hero: NonNullable<AppConfig["home"]>["hero"] }) {
  if (!hero?.title) return null;
  return (
    <Card className="p-6 bg-gradient-to-br from-primary/20 to-accent/10 border-primary/30">
      <h2 className="text-2xl font-bold mb-2">{hero.title}</h2>
      {hero.subtitle && <p className="text-muted-foreground mb-4">{hero.subtitle}</p>}
      {hero.ctaLabel && hero.ctaHref && (
        <Button asChild variant="premium"><Link to={hero.ctaHref}>{hero.ctaLabel}</Link></Button>
      )}
    </Card>
  );
}

function DynamicBanners({ banners }: { banners?: NonNullable<AppConfig["home"]>["banners"] }) {
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("dyn_dismissed") || "[]"); } catch { return []; }
  });
  if (!banners?.length) return null;
  const visible = banners.filter((b) => !dismissed.includes(b.id));
  if (!visible.length) return null;
  const Icon = (t?: string) => t === "success" ? CheckCircle2 : t === "warning" ? AlertTriangle : Info;
  return (
    <div className="space-y-2">
      {visible.map((b) => {
        const I = Icon(b.type);
        return (
          <div key={b.id} className={`flex items-start gap-3 p-3 rounded-lg border ${
            b.type === "warning" ? "bg-yellow-500/10 border-yellow-500/30" :
            b.type === "success" ? "bg-green-500/10 border-green-500/30" :
            "bg-blue-500/10 border-blue-500/30"
          }`}>
            <I className="h-5 w-5 mt-0.5 shrink-0" />
            <div className="flex-1">
              {b.title && <p className="font-semibold">{b.title}</p>}
              {b.message && <p className="text-sm text-muted-foreground">{b.message}</p>}
            </div>
            {b.dismissible !== false && (
              <button onClick={() => {
                const n = [...dismissed, b.id];
                setDismissed(n);
                localStorage.setItem("dyn_dismissed", JSON.stringify(n));
              }}><X className="h-4 w-4" /></button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CardsSection({ section }: { section: { title?: string; items?: any[] } }) {
  if (!section.items?.length) return null;
  return (
    <div>
      {section.title && <h3 className="text-lg font-bold mb-3">{section.title}</h3>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {section.items.map((it, i) => {
          const Icon = ICONS[it.icon || "sparkles"] || Sparkles;
          const inner = (
            <Card className="p-4 hover:border-primary/50 transition-colors h-full">
              <Icon className="h-6 w-6 text-primary mb-2" />
              {it.title && <p className="font-semibold">{it.title}</p>}
              {it.description && <p className="text-sm text-muted-foreground mt-1">{it.description}</p>}
            </Card>
          );
          return it.href ? <Link key={i} to={it.href}>{inner}</Link> : <div key={i}>{inner}</div>;
        })}
      </div>
    </div>
  );
}

function TextSection({ section }: { section: { title?: string; body?: string } }) {
  return (
    <Card className="p-4">
      {section.title && <h3 className="text-lg font-bold mb-2">{section.title}</h3>}
      {section.body && <p className="text-sm whitespace-pre-wrap text-muted-foreground">{section.body}</p>}
    </Card>
  );
}

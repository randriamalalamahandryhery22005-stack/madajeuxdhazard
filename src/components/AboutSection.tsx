import {
  Facebook, MapPin, Phone, ShieldCheck, UserRound, Globe, Mail, ExternalLink,
  Award, Code2, Sparkles, Target, Zap, Lock, Rocket, Heart, Star, Gamepad2, Store,
} from "lucide-react";

const APP_VERSION = "v0.0.1 · Émeraude Prestige";

const contactItems = [
  { icon: UserRound, label: "Créateur", value: "J&H Studio" },
  { icon: MapPin, label: "Localisation", value: "Antananarivo, Madagascar" },
  {
    icon: Facebook, label: "Facebook", value: "Page officielle",
    link: "https://facebook.com/mahandry.hery.randriamalala",
  },
  {
    icon: Phone, label: "WhatsApp", value: "Ouvrir la conversation",
    link: "https://wa.me/261379594257",
  },
  {
    icon: Mail, label: "Email", value: "Écrire au support",
    link: "mailto:jeuxdhazardmada@gmail.com",
  },
];


const features = [
  { icon: Gamepad2, label: "Prédictions multi-jeux", desc: "Aviator, JetX, CosmoX…" },
  { icon: Zap, label: "Temps réel", desc: "Signaux instantanés, sync live avec la base." },
  { icon: Store, label: "J&H Store", desc: "Boutique numérique intégrée avec avis." },
  { icon: Lock, label: "Sécurisé", desc: "Authentification, RLS et vérification par code." },
];

const AboutSection = () => {
  return (
    <div className="space-y-5">
      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/25 glass-card p-6">
        <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 w-40 h-40 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-[-4px] rounded-2xl opacity-70 pointer-events-none animate-orbit"
              style={{ background: "conic-gradient(from 0deg, hsl(42 78% 58%), transparent, hsl(158 65% 40%), transparent, hsl(42 78% 58%))", filter: "blur(6px)" }} />
            <div className="relative w-14 h-14 rounded-2xl gold-gradient flex items-center justify-center shadow-lg glow-gold">
              <Award className="w-7 h-7 text-primary-foreground" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-black text-shine leading-tight">Jeux d'Hazard</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Système Expert de Prédiction</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 border border-primary/25 text-primary font-bold flex items-center gap-1">
                <Code2 className="w-2.5 h-2.5" /> {APP_VERSION}
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-emerald-400 live-dot" /> Stable
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mission */}
      <div className="rounded-2xl border border-border/40 glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notre mission</h3>
        </div>
        <p className="text-sm leading-relaxed text-foreground/85">
          Fournir des <span className="gold-text font-semibold">prédictions fiables et instantanées</span> pour les jeux
          Crash, dans une interface premium, sécurisée et pensée pour tous les joueurs — du
          débutant au professionnel.
        </p>
      </div>

      {/* Features */}
      <div className="rounded-2xl border border-border/40 glass-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border/30 bg-secondary/20">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fonctionnalités clés</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 p-3">
          {features.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="p-3 rounded-xl bg-secondary/30 border border-border/30 hover:border-primary/40 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-2">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <p className="text-xs font-bold leading-tight">{label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Contact Grid */}
      <div className="rounded-2xl border border-border/40 glass-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border/30 bg-secondary/20">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contact</h3>
        </div>
        <div className="divide-y divide-border/20">
          {contactItems.map(({ icon: Icon, label, value, link }) => (
            <div key={label} className="flex items-center gap-3 px-5 py-3 hover:bg-secondary/25 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-primary/8 border border-primary/15 flex items-center justify-center flex-shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-medium">{label}</p>
                <p className="text-sm font-medium text-foreground break-all leading-snug mt-0.5">{value}</p>
              </div>
              {link && (
                <a href={link} target="_blank" rel="noopener noreferrer"
                  className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors">
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tech / Credits */}
      <div className="rounded-2xl border border-border/40 glass-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Rocket className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Technologies</h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["React 18", "Vite", "TypeScript", "Tailwind CSS", "Lovable Cloud", "PostgreSQL", "Realtime"].map((t) => (
            <span key={t} className="text-[10px] px-2.5 py-1 rounded-full bg-secondary/50 border border-border/40 font-mono text-muted-foreground">
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center space-y-1.5 py-3">
        <div className="flex items-center justify-center gap-1.5">
          <Star className="w-3 h-3 text-primary" />
          <p className="text-[10px] text-foreground/80 font-semibold">
            © 2017 Jeux d'Hazard
          </p>
        </div>
        <p className="text-[9px] text-muted-foreground/70 flex items-center justify-center gap-1">
          Conçu avec <Heart className="w-2.5 h-2.5 text-amber-400 fill-amber-400" /> à Madagascar
        </p>
      </div>
    </div>
  );
};

export default AboutSection;

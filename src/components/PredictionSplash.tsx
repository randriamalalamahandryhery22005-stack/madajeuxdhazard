import { useState, useEffect } from "react";

interface PredictionSplashProps {
  color: string; // "emerald" | "amber" | "cyan"
  title: string;
  subtitle: string;
  duration?: number;
  onComplete: () => void;
}

const colorMap: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  emerald: { bg: "from-emerald-600/20 via-emerald-500/10 to-green-900/20", text: "text-emerald-400", border: "border-emerald-500/30", glow: "shadow-emerald-500/30" },
  amber: { bg: "from-amber-600/20 via-amber-500/10 to-orange-900/20", text: "text-amber-400", border: "border-amber-500/30", glow: "shadow-amber-500/30" },
  cyan: { bg: "from-cyan-600/20 via-cyan-500/10 to-blue-900/20", text: "text-cyan-400", border: "border-cyan-500/30", glow: "shadow-cyan-500/30" },
  blue: { bg: "from-blue-600/20 via-blue-500/10 to-indigo-900/20", text: "text-blue-400", border: "border-blue-500/30", glow: "shadow-blue-500/30" },
};

const PredictionSplash = ({ color, title, subtitle, duration = 3000, onComplete }: PredictionSplashProps) => {
  const [phase, setPhase] = useState<"enter" | "show" | "exit">("enter");
  const c = colorMap[color] || colorMap.emerald;

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("show"), 100);
    const t2 = setTimeout(() => setPhase("exit"), duration - 500);
    const t3 = setTimeout(onComplete, duration);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [duration, onComplete]);

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-xl transition-opacity duration-500 ${phase === "exit" ? "opacity-0" : "opacity-100"}`}>
      <div className={`flex flex-col items-center gap-6 transition-all duration-700 ${phase === "enter" ? "scale-90 opacity-0" : "scale-100 opacity-100"}`}>
        {/* Animated rings */}
        <div className="relative">
          <div className={`w-28 h-28 rounded-full bg-gradient-to-br ${c.bg} ${c.border} border-2 flex items-center justify-center shadow-2xl ${c.glow}`}>
            <div className={`w-16 h-16 rounded-full border-2 ${c.border} flex items-center justify-center`} style={{ animation: "spin 3s linear infinite" }}>
              <div className={`w-4 h-4 rounded-full bg-current ${c.text}`} />
            </div>
          </div>
          <div className={`absolute inset-0 rounded-full border-2 ${c.border} opacity-30`} style={{ animation: "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite" }} />
          <div className={`absolute -inset-3 rounded-full border ${c.border} opacity-15`} style={{ animation: "ping 2s cubic-bezier(0, 0, 0.2, 1) 0.5s infinite" }} />
        </div>

        <div className="text-center space-y-2">
          <h2 className={`text-xl font-black ${c.text}`}>{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        {/* Loading bar */}
        <div className={`w-48 h-1.5 rounded-full bg-secondary/50 overflow-hidden ${c.border} border`}>
          <div className={`h-full rounded-full bg-current ${c.text}`} style={{ animation: `loading-bar ${duration - 600}ms ease-in-out forwards` }} />
        </div>
      </div>
    </div>
  );
};

export default PredictionSplash;

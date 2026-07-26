import { useEffect } from "react";
import { Phone, PhoneOff } from "lucide-react";

export type IncomingCall = {
  id: string;
  callerId: string;
  callerName: string;
  avatarUrl?: string | null;
};

export default function IncomingCallOverlay({
  call,
  onAccept,
  onDecline,
  onMissed,
}: {
  call: IncomingCall | null;
  onAccept: (c: IncomingCall) => void;
  onDecline: (c: IncomingCall) => void;
  onMissed?: (c: IncomingCall) => void;
}) {
  useEffect(() => {
    if (!call) return;
    const t = window.setTimeout(() => (onMissed ?? onDecline)(call), 30_000);
    return () => window.clearTimeout(t);
  }, [call, onDecline, onMissed]);


  if (!call) return null;

  const initials =
    call.callerName
      .trim()
      .split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm mx-4 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-black shadow-2xl overflow-hidden">
        <div className="relative p-6 pb-4 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/15 via-transparent to-violet-500/15 pointer-events-none" />
          <p className="relative text-xs uppercase tracking-widest text-emerald-300/80 mb-4">
            Appel entrant · J&H Chats
          </p>
          <div className="relative mx-auto w-28 h-28 mb-4">
            <span className="absolute inset-0 rounded-full bg-emerald-400/40 blur-2xl animate-pulse" />
            <span className="absolute -inset-2 rounded-full border-2 border-emerald-400/40 animate-ping" />
            <div className="relative w-full h-full rounded-full overflow-hidden ring-4 ring-emerald-400/50 bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
              {call.avatarUrl ? (
                <img src={call.avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-2xl font-bold text-white">{initials}</span>
              )}
            </div>
          </div>
          <h2 className="relative text-xl font-bold text-white">{call.callerName}</h2>
          <p className="relative text-sm text-white/60 mt-1">vous appelle...</p>
        </div>

        <div className="p-6 pt-4 flex items-center justify-around">
          <button
            onClick={() => onDecline(call)}
            className="flex flex-col items-center gap-2 group"
          >
            <span className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-[0_10px_30px_-5px_rgba(244,63,94,0.6)] group-active:scale-95 transition">
              <PhoneOff className="w-7 h-7 text-white" />
            </span>
            <span className="text-xs text-white/80">Refuser</span>
          </button>
          <button
            onClick={() => onAccept(call)}
            className="flex flex-col items-center gap-2 group"
          >
            <span className="relative w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-[0_10px_30px_-5px_rgba(52,211,153,0.6)] group-active:scale-95 transition">
              <span className="absolute inset-0 rounded-full bg-emerald-400/40 animate-ping" />
              <Phone className="relative w-7 h-7 text-white" />
            </span>
            <span className="text-xs text-white/80">Accepter</span>
          </button>
        </div>
      </div>
    </div>
  );
}

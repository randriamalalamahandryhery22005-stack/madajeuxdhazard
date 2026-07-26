import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft, Download, Star, MessageSquare, Image as ImageIcon,
  Music, Video, FileArchive, FileText, Smartphone, FolderOpen, Send,
  X, Loader2, Sparkles, Crown, TrendingUp, Search, Flame,
  Megaphone, Link as LinkIcon, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { useUnreadStore } from "@/hooks/useUnreadStore";
import AdminGenStorePanel from "@/components/AdminGenStorePanel";
import { downloadItem, hasFile, resolveFileUrl, type GenStoreItem } from "@/lib/genStore";

const CATEGORIES = [
  { id: "all", label: "Tous", icon: Sparkles },
  { id: "annonce", label: "Annonces", icon: Megaphone },
  { id: "image", label: "Images", icon: ImageIcon },
  { id: "music", label: "Musique", icon: Music },
  { id: "video", label: "Vidéos", icon: Video },
  { id: "apk", label: "APK", icon: Smartphone },
  { id: "zip", label: "Archives", icon: FileArchive },
  { id: "folder", label: "Dossiers", icon: FolderOpen },
  { id: "link", label: "Liens", icon: LinkIcon },
  { id: "other", label: "Autres", icon: FileText },
];

const FALLBACK_CATEGORY = CATEGORIES[CATEGORIES.length - 1];
const catOf = (id: string) => CATEGORIES.find((c) => c.id === id) || FALLBACK_CATEGORY;

const SORTS = [
  { id: "recent", label: "Récents", icon: Sparkles },
  { id: "top", label: "Mieux notés", icon: Crown },
  { id: "popular", label: "Populaires", icon: TrendingUp },
];

type Item = GenStoreItem;

interface Review {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profile?: { full_name: string | null; avatar_url: string | null };
}

const formatBytes = (b: number) => {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

const isNew = (d: string) => Date.now() - new Date(d).getTime() < 1000 * 60 * 60 * 24 * 7;

const GenStore = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("recent");
  const [query, setQuery] = useState("");
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number }>>({});
  const [selected, setSelected] = useState<Item | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPublish, setShowPublish] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("gen_store_items")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false });
    if (error) {
      setLoading(false);
      toast.error("Impossible de charger la boutique");
      return;
    }
    const list = (data as any) || [];
    setItems(list);
    setLoading(false);

    if (list.length) {
      const ids = list.map((i: Item) => i.id);
      const { data: r } = await supabase
        .from("gen_store_reviews")
        .select("item_id, rating")
        .in("item_id", ids);
      const map: Record<string, { sum: number; count: number }> = {};
      (r || []).forEach((row: any) => {
        if (!map[row.item_id]) map[row.item_id] = { sum: 0, count: 0 };
        map[row.item_id].sum += row.rating;
        map[row.item_id].count += 1;
      });
      const out: Record<string, { avg: number; count: number }> = {};
      Object.entries(map).forEach(([k, v]) => {
        out[k] = { avg: v.sum / v.count, count: v.count };
      });
      setRatings(out);
    }
  };

  const { markSeen } = useUnreadStore(user?.id ?? null);

  useEffect(() => {
    load();
    // Mark this GEN Store visit — resets the badge on the Boutique nav item.
    markSeen();
    const ch = supabase
      .channel("gen-store-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "gen_store_items" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "gen_store_reviews" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!selected) return;
    loadReviews(selected.id);
  }, [selected]);

  const loadReviews = async (itemId: string) => {
    const { data: r } = await supabase
      .from("gen_store_reviews")
      .select("*")
      .eq("item_id", itemId)
      .order("created_at", { ascending: false });
    const list = (r as any) || [];
    if (list.length) {
      const userIds: string[] = Array.from(new Set(list.map((x: any) => String(x.user_id))));
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);
      const pmap = new Map((profs || []).map((p: any) => [p.user_id, p]));
      list.forEach((x: any) => (x.profile = pmap.get(x.user_id)));
    }
    setReviews(list);
    if (user) {
      const mine = list.find((x: any) => x.user_id === user.id);
      setMyRating(mine?.rating || 0);
      setMyComment(mine?.comment || "");
    }
  };

  const handleDownload = async (item: Item) => {
    if (!hasFile(item)) {
      if (item.link_url) {
        window.open(item.link_url, "_blank", "noopener");
        return;
      }
      toast.error("Aucun fichier joint à cette publication");
      return;
    }
    try {
      await downloadItem(item);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, download_count: (i.download_count || 0) + 1 } : i)),
      );
      toast.success("Téléchargement lancé");
    } catch (e: any) {
      toast.error(e.message || "Téléchargement impossible");
    }
  };

  const submitReview = async () => {
    if (!user) return toast.error("Connectez-vous pour laisser un avis");
    if (!selected) return;
    if (myRating < 1) return toast.error("Donnez une note (1-5 étoiles)");
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("gen_store_reviews")
        .upsert(
          { item_id: selected.id, user_id: user.id, rating: myRating, comment: myComment.trim() || null },
          { onConflict: "item_id,user_id" },
        );
      if (error) throw error;
      toast.success("Avis publié");
      loadReviews(selected.id);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    let list = items;
    if (filter !== "all") list = list.filter((i) => i.category === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (i) => i.title.toLowerCase().includes(q) || (i.description || "").toLowerCase().includes(q),
      );
    }
    if (sort === "top") {
      list = [...list].sort(
        (a, b) => (ratings[b.id]?.avg || 0) - (ratings[a.id]?.avg || 0),
      );
    } else if (sort === "popular") {
      list = [...list].sort((a, b) => (b.download_count || 0) - (a.download_count || 0));
    }
    return list;
  }, [items, filter, sort, query, ratings]);

  const featured = filtered.slice(0, 1)[0];
  const rest = featured ? filtered.slice(1) : filtered;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero header */}
      <div className="relative px-4 pt-4 pb-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex items-center gap-3 mb-5">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-card/60 backdrop-blur border border-border/40 hover:bg-card"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary/80">Boutique numérique</p>
            <h1 className="text-2xl font-black bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
              J&amp;H Store
            </h1>
          </div>
          <button
            onClick={() => setShowPublish((v) => !v)}
            className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold shadow-lg shadow-primary/30 hover:brightness-110"
          >
            {showPublish ? "Fermer" : "Publier"}
          </button>
          <div className="px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30 text-[10px] font-bold text-primary flex items-center gap-1">
            <Flame className="w-3 h-3" /> {items.length}
          </div>
        </div>

        {showPublish && (
          <div className="relative mb-4">
            {user ? (
              <AdminGenStorePanel onPublished={load} />
            ) : (
              <div className="p-5 rounded-2xl bg-card border border-border/40 text-center space-y-3">
                <p className="text-sm font-bold">Connectez-vous pour publier</p>
                <p className="text-xs text-muted-foreground">
                  Annonces, images, vidéos, documents : tout se publie depuis votre compte.
                </p>
                <Button variant="premium" size="sm" onClick={() => navigate("/login")}>
                  Se connecter
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un contenu..."
            className="pl-9 h-11 bg-card/70 backdrop-blur border-border/40 rounded-xl"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 overflow-x-auto scrollbar-none">
        <div className="flex gap-2 min-w-max pb-1">
          {CATEGORIES.map((c) => {
            const active = c.id === filter;
            const Icon = c.icon;
            return (
              <button
                key={c.id}
                onClick={() => setFilter(c.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all inline-flex items-center gap-1.5 ${
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                    : "border-border/40 bg-card/40 text-muted-foreground hover:border-primary/40"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sort */}
      <div className="px-4 mt-3 flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
          {filtered.length} contenu{filtered.length > 1 ? "s" : ""}
        </p>
        <div className="flex gap-1 bg-card/60 border border-border/40 rounded-lg p-1">
          {SORTS.map((s) => {
            const active = s.id === sort;
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setSort(s.id)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold inline-flex items-center gap-1 transition-all ${
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                <Icon className="w-3 h-3" />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      <div className="px-4 mt-4">
        {loading && (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-card/40 border border-border/30 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 space-y-2">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-primary/60" />
            </div>
            <p className="text-sm font-bold">Aucun contenu</p>
            <p className="text-xs text-muted-foreground">
              {query ? "Essayez un autre mot-clé." : "Revenez bientôt pour découvrir les nouveautés."}
            </p>
          </div>
        )}

        {!loading && featured && filter === "all" && !query && sort === "recent" && (
          <FeaturedCard item={featured} rating={ratings[featured.id]} onOpen={() => setSelected(featured)} />
        )}

        <div className="grid grid-cols-2 gap-3 mt-3">
          {(featured && filter === "all" && !query && sort === "recent" ? rest : filtered).map((it) => (
            <ProductCard
              key={it.id}
              item={it}
              rating={ratings[it.id]}
              onOpen={() => setSelected(it)}
            />
          ))}
        </div>
      </div>

      {/* Detail modal */}
      {selected && (
        <DetailModal
          item={selected}
          rating={ratings[selected.id]}
          reviews={reviews}
          user={user}
          myRating={myRating}
          myComment={myComment}
          submitting={submitting}
          setMyRating={setMyRating}
          setMyComment={setMyComment}
          onSubmit={submitReview}
          onClose={() => setSelected(null)}
          onDownload={() => handleDownload(selected)}
        />
      )}

      <BottomNav />
    </div>
  );
};

const CategoryBadge = ({ id }: { id: string }) => {
  const cat = catOf(id);
  const Icon = cat.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/85 backdrop-blur text-[9px] font-bold uppercase tracking-wider border border-border/40">
      <Icon className="w-2.5 h-2.5 text-primary" />
      {cat.label}
    </span>
  );
};

/** Resolves a displayable URL for an item's media (public or signed). */
const useMediaUrl = (item: Item, enabled: boolean) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!enabled || !hasFile(item)) {
      setUrl(null);
      return;
    }
    resolveFileUrl(item).then((u) => {
      if (alive) setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [item.id, item.file_path, item.file_url, enabled]);
  return url;
};

const isMedia = (item: Item) =>
  item.category === "image" || (item.mime_type || "").startsWith("image/");

const Stars = ({ value, size = "w-3 h-3" }: { value: number; size?: string }) => (
  <div className="flex">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        className={`${size} ${n <= Math.round(value) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`}
      />
    ))}
  </div>
);

const FeaturedCard = ({
  item,
  rating,
  onOpen,
}: {
  item: Item;
  rating?: { avg: number; count: number };
  onOpen: () => void;
}) => {
  const cat = catOf(item.category);
  const Icon = cat.icon;
  const preview = useMediaUrl(item, isMedia(item));
  return (
    <button
      onClick={onOpen}
      className="relative w-full rounded-3xl overflow-hidden border border-primary/30 bg-card text-left group active:scale-[0.99] transition-transform"
    >
      <div className="aspect-[16/9] relative bg-gradient-to-br from-primary/30 to-primary/5">
        {preview ? (
          <img src={preview} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon className="w-16 h-16 text-primary/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
          <Crown className="w-3 h-3" /> En vedette
        </span>
        {isNew(item.created_at) && (
          <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-green-500 text-white text-[10px] font-black uppercase tracking-wider">
            Nouveau
          </span>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
        <CategoryBadge id={item.category} />
        <h2 className="text-lg font-black leading-tight">{item.title}</h2>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          {hasFile(item) && (
            <>
              <span className="flex items-center gap-1">
                <Download className="w-3 h-3" /> {item.download_count}
              </span>
              <span>·</span>
              <span>{formatBytes(Number(item.file_size))}</span>
            </>
          )}
          {!hasFile(item) && <span>{cat.label}</span>}
          {rating && rating.count > 0 && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Stars value={rating.avg} />
                <span className="font-bold text-foreground">{rating.avg.toFixed(1)}</span>
              </span>
            </>
          )}
        </div>
      </div>
    </button>
  );
};

const ProductCard = ({
  item,
  rating,
  onOpen,
}: {
  item: Item;
  rating?: { avg: number; count: number };
  onOpen: () => void;
}) => {
  const cat = catOf(item.category);
  const Icon = cat.icon;
  const preview = useMediaUrl(item, isMedia(item));
  return (
    <button
      onClick={onOpen}
      className="group relative rounded-2xl overflow-hidden bg-card border border-border/40 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all text-left active:scale-[0.97]"
    >
      <div className="aspect-square relative bg-gradient-to-br from-primary/15 to-primary/5 overflow-hidden">
        {preview ? (
          <img
            src={preview}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-3 text-center">
            <Icon className="w-10 h-10 text-primary/50 group-hover:scale-110 transition-transform" />
            {!hasFile(item) && (
              <p className="text-[10px] text-muted-foreground line-clamp-3 leading-snug">
                {item.body || item.description}
              </p>
            )}
          </div>
        )}
        <div className="absolute top-2 left-2">
          <CategoryBadge id={item.category} />
        </div>
        {isNew(item.created_at) && (
          <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-green-500 text-white text-[8px] font-black uppercase">
            New
          </span>
        )}
        {rating && rating.count > 0 && (
          <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md bg-background/85 backdrop-blur flex items-center gap-1">
            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
            <span className="text-[10px] font-bold">{rating.avg.toFixed(1)}</span>
          </div>
        )}
      </div>
      <div className="p-2.5 space-y-1">
        <p className="font-bold text-xs truncate leading-tight">{item.title}</p>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{hasFile(item) ? formatBytes(Number(item.file_size)) : cat.label}</span>
          {hasFile(item) && (
            <span className="flex items-center gap-0.5">
              <Download className="w-2.5 h-2.5" /> {item.download_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

const DetailModal = ({
  item,
  rating,
  reviews,
  user,
  myRating,
  myComment,
  submitting,
  setMyRating,
  setMyComment,
  onSubmit,
  onClose,
  onDownload,
}: any) => {
  const media = useMediaUrl(item, hasFile(item));
  const mime = (item.mime_type || "") as string;
  const isImg = media && (item.category === "image" || mime.startsWith("image/"));
  const isVid = media && (item.category === "video" || mime.startsWith("video/"));
  const isAud = media && (item.category === "music" || mime.startsWith("audio/"));
  return (
  <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col">
    <div className="px-4 py-3 border-b border-border/40 flex items-center gap-3 sticky top-0 bg-background/95 backdrop-blur">
      <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary/60">
        <X className="w-4 h-4" />
      </button>
      <h2 className="font-bold flex-1 truncate">{item.title}</h2>
      <CategoryBadge id={item.category} />
    </div>

    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 max-w-md mx-auto w-full">
      {hasFile(item) && (
        <div className="rounded-2xl overflow-hidden bg-card border border-border/40 aspect-video flex items-center justify-center">
          {isImg ? (
            <img src={media!} alt={item.title} className="w-full h-full object-contain" />
          ) : isVid ? (
            <video src={media!} controls playsInline className="w-full h-full" />
          ) : isAud ? (
            <audio src={media!} controls className="w-full px-4" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <FileText className="w-12 h-12" />
              <p className="text-xs px-4 text-center break-all">{item.file_name}</p>
            </div>
          )}
        </div>
      )}

      {hasFile(item) && (
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-xl bg-card border border-border/40 text-center">
          <Download className="w-3.5 h-3.5 mx-auto text-primary mb-1" />
          <p className="text-sm font-black">{item.download_count}</p>
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Téléch.</p>
        </div>
        <div className="p-3 rounded-xl bg-card border border-border/40 text-center">
          <Star className="w-3.5 h-3.5 mx-auto text-amber-400 fill-amber-400 mb-1" />
          <p className="text-sm font-black">{rating?.count ? rating.avg.toFixed(1) : "—"}</p>
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
            {rating?.count || 0} avis
          </p>
        </div>
        <div className="p-3 rounded-xl bg-card border border-border/40 text-center">
          <FileArchive className="w-3.5 h-3.5 mx-auto text-primary mb-1" />
          <p className="text-sm font-black">{formatBytes(Number(item.file_size))}</p>
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Taille</p>
        </div>
      </div>
      )}

      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Description</p>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.body || item.description}</p>
      </div>

      {item.link_url && (
        <a href={item.link_url} target="_blank" rel="noopener noreferrer" className="block">
          <Button variant="premium" className="w-full h-12 text-base">
            <ExternalLink className="w-4 h-4 mr-2" /> Ouvrir le lien
          </Button>
        </a>
      )}

      {hasFile(item) && (
        <Button variant="premium" className="w-full h-12 text-base" onClick={onDownload}>
          <Download className="w-4 h-4 mr-2" /> Télécharger
        </Button>
      )}

      <div className="space-y-3 pt-3 border-t border-border/40">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" /> Avis ({reviews.length})
        </h3>

        {user && (
          <div className="p-4 rounded-2xl bg-card border border-border/40 space-y-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Votre note</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setMyRating(n)} className="active:scale-90 transition-transform">
                  <Star
                    className={`w-7 h-7 ${
                      n <= myRating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
            </div>
            <Input
              value={myComment}
              onChange={(e) => setMyComment(e.target.value)}
              placeholder="Votre commentaire (optionnel)..."
            />
            <Button size="sm" onClick={onSubmit} disabled={submitting} className="w-full">
              {submitting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}
              Publier mon avis
            </Button>
          </div>
        )}

        <ul className="space-y-2">
          {reviews.map((r: Review) => (
            <li key={r.id} className="p-3 rounded-2xl bg-card border border-border/30">
              <div className="flex items-center gap-2">
                {r.profile?.avatar_url ? (
                  <img src={r.profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-black text-primary">
                    {(r.profile?.full_name || "?")[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{r.profile?.full_name || "Utilisateur"}</p>
                  <Stars value={r.rating} size="w-2.5 h-2.5" />
                </div>
              </div>
              {r.comment && <p className="text-xs mt-2 text-muted-foreground leading-relaxed">{r.comment}</p>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
  );
};

export default GenStore;

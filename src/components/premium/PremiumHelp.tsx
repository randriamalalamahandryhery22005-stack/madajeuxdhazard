import { HelpCircle, ScrollText, ShieldCheck, MessageCircle, Mail, Sparkles } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

const FAQ = [
  { q: "Comment activer mon abonnement Premium ?", a: "Choisissez une formule dans l'onglet Abonnement, effectuez le paiement via Yas ou Airtel Money, puis envoyez la preuve. L'activation est automatique après vérification." },
  { q: "Quels services sont inclus ?", a: "Un seul abonnement débloque Aviator (Pro, Spribe, Studio), CosmoX, JetX et Virtuel — sans supplément." },
  { q: "Quels sont les moyens de paiement acceptés ?", a: "Yas et Airtel Money uniquement. Les numéros sont affichés dans le tunnel de paiement." },
  { q: "Combien de temps prend l'activation ?", a: "Généralement quelques minutes, une fois la preuve de paiement validée par un administrateur." },
  { q: "Que faire si mon paiement est rejeté ?", a: "Vous verrez le motif dans l'onglet Historique. Vous pouvez alors renvoyer une nouvelle preuve ou contacter le support Premium." },
  { q: "Puis-je changer de formule en cours d'abonnement ?", a: "Oui. Souscrivez simplement à une nouvelle formule : la durée restante s'ajoute automatiquement à votre nouvel abonnement." },
  { q: "L'abonnement À Vie expire-t-il ?", a: "Non. Il vous donne un accès permanent à tous les services Premium, sans date d'expiration." },
  { q: "Que se passe-t-il à l'expiration ?", a: "Les jeux Premium sont automatiquement verrouillés. Vous pouvez renouveler à tout moment depuis le tableau de bord." },
];

const PremiumHelp = () => {
  return (
    <div className="space-y-6">
      {/* FAQ */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-primary" />
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Questions fréquentes</h2>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur px-4">
          <Accordion type="single" collapsible className="w-full">
            {FAQ.map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-border/40">
                <AccordionTrigger className="text-sm font-semibold text-left hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Support */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" />
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Support Premium</h2>
        </div>
        <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card/60 to-card backdrop-blur p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold">Une question ? Un souci de paiement ?</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Notre équipe répond en priorité aux membres Premium.
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <a href="https://wa.me/261379594257" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="w-full h-10 text-xs font-semibold">
                <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> WhatsApp
              </Button>
            </a>
            <a href="mailto:jeuxdhazardmada@gmail.com">
              <Button variant="outline" className="w-full h-10 text-xs font-semibold">
                <Mail className="w-3.5 h-3.5 mr-1.5" /> Email
              </Button>
            </a>
          </div>

        </div>
      </section>

      {/* Terms */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-primary" />
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Conditions d'utilisation</h2>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur p-4 text-[11px] text-muted-foreground leading-relaxed space-y-2">
          <p>L'abonnement Premium donne accès aux services prédictifs proposés par l'application, pour la durée choisie au moment de la souscription.</p>
          <p>Les prédictions sont fournies à titre indicatif. Aucun gain n'est garanti et l'utilisateur reste responsable de ses décisions.</p>
          <p>Les paiements sont non remboursables une fois l'accès activé, sauf accord explicite de l'équipe support.</p>
          <p>Le partage de compte, la revente ou l'automatisation abusive du service peuvent entraîner la suspension de l'abonnement sans préavis.</p>
        </div>
      </section>

      {/* Privacy */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Politique de confidentialité</h2>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur p-4 text-[11px] text-muted-foreground leading-relaxed space-y-2">
          <p>Les preuves de paiement sont stockées de manière chiffrée et ne sont consultables que par l'équipe administration à des fins de vérification.</p>
          <p>Aucune donnée bancaire n'est enregistrée par l'application : les paiements passent exclusivement par les opérateurs Yas et Airtel Money.</p>
          <p>Vos données d'utilisation (statistiques, historique) restent privées et associées uniquement à votre compte.</p>
        </div>
      </section>
    </div>
  );
};

export default PremiumHelp;
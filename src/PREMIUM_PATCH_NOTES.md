# Jeux d'Hazard — Premium unified calculator patch

## Fait
- Les interfaces Aviator, CosmoX et JetX utilisent désormais une page de calcul commune.
- Les anciens modes Aviator (Basic/Premium/Spribe/Studio) affichent la même interface afin d'éviter les pages dupliquées.
- Les accès Menu, hubs et Premium sont redirigés vers `/aviator?game=...`.
- Interface de calcul et résultats modernisée.
- Calculs déterministes et transparents à partir de l'heure et du coefficient saisis.
- Le résultat indique clairement qu'un prochain coefficient de crash game ne peut pas être calculé avec certitude sans les données RNG/seed côté serveur.

## Important
Ce patch ne prétend pas fournir un « prochain coefficient exact ». Un crash game utilise un mécanisme aléatoire côté serveur ; l'heure et le coefficient précédent ne suffisent pas à déterminer mathématiquement le prochain résultat.

# Mise à jour des résultats Aviator, JetX et CosmoX

## Objectif
Appliquer les nouvelles règles horaires d’Aviator et harmoniser les résultats des trois jeux dans une interface premium, claire et mobile, sans modifier leurs calculs ni leurs accès.

## Modifications prévues
- Forcer toutes les saisies et étapes de calcul Aviator au format `HH:MM`, sans champ de secondes.
- Conserver un réglage « Secondes » visible mais verrouillé, avec le badge « New » ; les résultats resteront en `HH:MM:SS`.
- Recomposer les résultats multiples : les deux premiers affichent heure et coefficient ; le troisième affiche uniquement le coefficient et précise qu’il peut apparaître à l’une des deux heures précédentes.
- Ajouter une distinction explicite entre « prédictions / calculs » et « résultats réels », sans présenter les prédictions comme des résultats garantis.
- Créer un composant de résultats partagé pour Aviator, JetX et CosmoX, avec une structure commune et les couleurs propres à chaque jeu.
- Optimiser la grille, la hiérarchie, les tailles et les actions pour les petits écrans.

## Détails techniques
- Conserver les fonctions de calcul et les données existantes ; seuls le format d’entrée, les libellés et le rendu changent.
- Normaliser les heures produites pour garantir `HH:MM:SS` dans les résultats.
- Remplacer les variantes visuelles dispersées par une présentation partagée basée sur les tons sémantiques du tableau de contrôle.
- Neutraliser le contrôle administrateur des secondes sans supprimer sa présence ni sa configuration historique.

## Vérification
- Vérifier la compilation après les modifications.
- Tester les parcours de calcul et l’affichage sur mobile et ordinateur pour Aviator, JetX et CosmoX.
- Contrôler que la troisième carte n’affiche aucune heure et que tous les autres résultats utilisent `HH:MM:SS`.

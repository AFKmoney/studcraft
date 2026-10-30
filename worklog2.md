# Worklog 2 — Microtronus / Studs Plastic Edition
Date: 2026-10-29

## To-do (7 items)

1. **Scale held Technic** — DONE. Facteur de normalisation passé de 0.55 à 0.32 (0.32 × spec.hand / maxDim). Pièces à taille comparable aux items normaux. QA: tsc 0, technic.test.ts 3/3 pass.
2. **Viseur vert rapetissé** — Les cercles noirs sous les briques se font recouvrir par le cercle vert du viseur. Réduire le rayon du viseur pour que les trous noirs restent visibles et complets (air de blocs Lego).
3. **Lag** — Le jeu lag énormément. Suspects : mesher CPU qui rebuild la géométrie à chaque tick (chaque stud = mesh séparé), ou la boucle QA qui tourne en parallèle. Vérifier lequel en premier.
4. **Troncs d'arbres à plat** — Quand un arbre est abattu, les blocs doivent tomber sur le côté, comme un tronc qui tombe au sol, pas rester droits empilés.
5. **Icônes Technic retravaillées** — Trop de pièces visuellement parallèles, trop différentes du vrai. Redessiner chaque icône pour qu'on reconnaisse la pièce au premier coup d'œil.
6. **Cross block visible** — Barre rouge horizontale percée de trous, placée en tête du bac Technic pour qu'on la voie direct. ID 395.
7. **Tab pose libre** — Comme Trailmaker : Tab active le mode pose libre (rayon de placement ignore la grille, point d'intersection libre). Q reste le snap grille.

## Plan d'attaque (4 phases)

### Phase 1 — Victoires visuelles rapides
- Item 2 : viseur vert (baisser le rayon dans le shader de rendu)
- Items 5 et 6 : icônes (redessiner chaque icône Technic avec la vraie silhouette ; cross block = barre rouge percée de trous en tête du bac)
- Vérification : screenshots avant/après, QA Siren sur l'inventaire

### Phase 2 — Gameplay
- Item 7 : mode pose libre Tab dans l'input handler
- Vérification : test manuel pose libre vs snap grille

### Phase 3 — Physique
- Item 4 : troncs à plat au moment de l'abattage
- Vérification : abattre un arbre, confirmer l'orientation

### Phase 4 — Performance
- Item 3 : lag (mesher CPU vs boucle QA)
- Vérification : framerate avant/après, profiling

## Règle
Auto-vérification entre chaque phase. Ne pas passer à la phase suivante sans verdict OK.

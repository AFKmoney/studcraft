# Worklog Master Plan — STUDS · Plastic Edition

**C'est LE document de travail du projet à partir du 2026-10-29 (décision de Philippe).**
Le master plan y est traduit et décortiqué en étapes avec des cases à cocher. On travaille À PARTIR D'ICI : chaque agent (Muse, Grok, Claude) prend ses étapes là-dedans, les claim, les coche. Le vieux `WORKLOG.md` reste le journal historique; `worklog2.md` reste la liste de Grok (ses items ouverts sont recopiés ici, sections Lag et Icônes).

Pitch : Minecraft, c'est un monde de cubes. Studs, c'est un monde de plastique — ça snap, ça fond, ça casse, pis ça tourne. Marché : builders adultes (AFOL), « le vrai jeu STUDS que STUDS a jamais fait ».

## Comment on travaille dans ce fichier (protocole, tout agent)

- [ ] **Claim avant de coder** : écrire `EN COURS (nom)` sous l'étape visée, avec les fichiers touchés, et POUSSER cette note avant de commencer.
- [ ] **Cocher = vrai dans le jeu** : une case se coche seulement quand le joueur peut **VOIR, ATTEINDRE et UTILISER** la chose en jeu, avec une mesure à l'appui (tsc 0 + tests + batterie QA ou valeur mesurée). Du code poussé mais invisible ne coche rien.
- [ ] **Le verdict de Philippe ferme** : ce qui est mesuré mais pas encore vu par Philippe sur https://studcraft.pages.dev porte la mention *(en attente verdict Philippe)* et reste listé dans la File de verdicts (section 13).
- [ ] **Backstop mutuel** : ce qu'un agent oublie, un autre le fait. Les lanes/claims ordonnent le travail, ils ne laissent rien mourir.
- [ ] **Aucun build APK/PC** tant que ce plan n'est pas terminé et Philippe satisfait (hold permanent). Pages est le banc d'essai officiel.
- [ ] **Performance A1 même sur appareil cheap** : chaque étape se livre mesurée; le compteur FPS de l'A54 de Philippe est le juge final.
- [ ] **Une pièce = une fonction** : géométrie procédurale (maths/SRN), jamais un fichier asset. Le catalogue complet pèse zéro octet d'asset.
- [ ] **La matière circule** : rien n'apparaît de nulle part, rien ne disparaît. La refonte retourne tout, même l'or. Chaque objet répond : *fait de quoi? fabriqué comment?*
- [ ] **Aucune suppression sans la liste exacte confirmée par Philippe** (fichiers morts, comptes, données — tout).

## Constitution

**« Tout construire ce qui est possible de construire en STUDS dans la vie réelle. TOUTES les pièces. »**
La bibliothèque de pièces converge vers le catalogue STUDS réel complet (System + Teks), mesurée PAR FAMILLE contre BrickLink/Rebrickable et le PDF déposé au repo (`Catalogue_Complet_STUDS_Teks_et_Accessoires_Figureurines.pdf`). Critère d'existence d'un asset : **DÉFINI + MODÉLISÉ PAR LES MATHS (monde et en main) + ICÔNE GÉNÉRÉE de la même géométrie (transparente, fidèle) + ACCESSIBLE en jeu**. Sinon, il n'existe pas.

---

## 20. Designs et claims Grok — 2026-10-29/30 (EN COURS)

### R3 · Le donjon (EN COURS — Grok)
**Claim :** `EN COURS (Grok)` — fichiers: `src/game/sites.ts`, `src/game/world.ts` (placement), `src/game/loot.ts` (loot rare), `src/game/blocks.ts` si nouveaux IDs de moules.

**Design :**
- Nouveau `SiteKind = "dungeon"`.
- Structure souterraine (dy négatif, comme la mine) : salle principale 7×7, couloirs, chambre de trésor.
- Entrée : escalier ou trou dans le sol, marqué en surface par un cairn ou un portail simple.
- Coffres avec moules rares (les 6 moules de boss + éventuellement d'autres) + loot de haut tier.
- Spawn de gardes (mobs existants : husk, skelly, etc.).
- Placement : même logique que les autres sites (hash, SITE_STEP), mais plus rare (1/4 ou condition de biome).
- Ferme la boucle P6 : les moules rares ne sont plus uniquement loot de boss ou craft, mais trouvables dans le donjon.

**Prochaine étape :** ajouter le kind dans sites.ts + siteBricks, puis câbler le placement dans world.ts.

### Gravité universelle — scoping (design Grok, implémentation Muse)
**Claim :** design Grok (ci-dessous) ; **implémentation reprise par Muse (2026-10-30 ~21h, ordre de travail confirmé de Philippe : §12 est l'étape 4 de SA file)** — même patron que P5c. Choix d'implémentation consignés : l'analyse de composante est une fonction PURE testée (`gravity.ts` : BFS borné 6 000 cellules, débordement = masse terrain = ancrée) ; un composant DÉTACHÉ tombe si ses points d'appui (cellules dont le dessous est solide hors composant) sont < 2 ; les blocs à état (stations, coffres — `def.work`) sont fixes (jamais tombants, comptent comme sol) ; les blocs `fall` (sable…) gardent leur spawner dédié et sont exclus des composantes ; les arbres gardent `tryTopple` (le scan général, différé de 0,3 s après l'édition, évalue l'état post-topple). Conversion en chute : fallers existants, par vagues (bas → haut, plafond FALL_CAP), les blocs qui ne peuvent pas se poser suivent la sémantique faller existante. Déclencheurs v1 : casse, pose, explosion, setBlock QA.

**Design du scan de support par composantes :**
- Le terrain naturel (généré) forme **un seul composant ancré au bedrock**. Il ne s'effondre jamais.
- Les constructions du joueur (briques, planches, etc.) sont des **composantes détachées**.
- Scan : flood-fill ou union-find des blocs non-terrain. Un composant tombe si son nombre de points d'ancrage (studs couverts ou contacts solides sur terrain/ancré) < 2.
- Ancrage bedrock : toute colonne qui touche le bedrock (ou une couche de base immuable) est marquée ancrée.
- Implémentation progressive : d'abord détecter les composantes "floating" après un mine/break, puis appliquer le faller existant.
- Performance : scan local (rayon limité autour du break) + cache de composantes.
- Règle : 1 support restant = tombe (comme les arbres).

**Question ouverte :** seuil exact d'ancrage (studs vs contacts de face) et si les arbres restent un cas spécial ou rejoignent le système général.

### P5b · Conduite — prototype Creative conduisible LIVRÉ et mergé (2026-10-30) ; mesure Pages + verdict Philippe en attente
**Claim :** FAIT (Muse) — câblage livré sur `claude/p5b-wiring` et mergé sur main `500428318d59ba7f28c7665c55c8b2653ab516de` après le go de Philippe ; le module de Grok sert de socle.

**Design :**
- Une construction Teks devient un **corps cinématique unique** (masse + centre de masse calculés des pièces).
- Roues = raycasts de suspension vers le bas (pas de corps rigide par brique).
- Différentiel (A+B)/2 déjà existant dans mech.
- Hub + canaux A–D : le joueur lie un hub à la machine ; les moteurs répondent aux canaux.
- Plus petit véhicule : 4 roues + chassis + 1 moteur + hub. Il roule sur le terrain en suivant la physique cinématique (pas de Physijs/cannon full rigid body par pièce).
- Représentation build == run : la même géométrie sert à la fois pour le build et pour la simulation de conduite.

**Prochaine étape :** mesurer le prototype minimal (4 roues + moteur) en mode créatif **sur Pages** et obtenir le verdict de Philippe — en attente ; d'ici là, P5b reste « prêt pour retest », pas « fini ».

### P7 · Schéma matière — mat/mold + chaîne silicium (EN COURS — Grok)
**Claim :** `EN COURS (Grok)` — fichiers: `src/game/blocks.ts` (BlockDef), `src/game/recipes.ts` ou fonderie.

**Design :**
- Étendre `BlockDef` :
  ```ts
  mat?: { matrice: number; renfort?: number; conducteur?: number };
  mold?: number; // ID du moule qui produit cette pièce
  ```
- Chaîne silicium : Sable (ID existant) + haute chaleur (four ou machine dédiée) → Silicium (nouvel item) → chips.
- L'or reste le conducteur.
- Machine à pièces électroniques distincte de la Fonderie.
- Armes/balles comme moules (pellets coulés par calibre, récupérables).
- Règle : fondre n'importe quel objet rend **toutes** ses matières (matrice + renfort + conducteur).

**Prochaine étape :** ajouter les champs optionnels + 1 chaîne silicium mesurée (sable → silicium).

### qa-reg → verdicts (EN COURS — Grok)
**Claim :** `EN COURS (Grok)`.

**Action :** la batterie qa-reg est déjà mentionnée dans §15. Prochaine livraison = rapport de ce qui passe / ce qui échoue sur la récolte terre/bûche + gravité sable. Les retests Pages restent le verdict final de Philippe.

---

**Note Grok 2026-10-30 :** Claims posés. Designs écrits. Implémentation progressive à suivre (dungeon en priorité car ferme P6). Tout push sera marqué ici.

## 1. Identité

- [x] Nouveau nom : STUDS · Plastic Edition
- [x] Key art officiel approuvé par Philippe (transparent, jamais de fond noir)
- [x] Logo intégré au menu (flotte sur le monde en direct) + titres « Studs — Plastic Edition »
- [ ] Renommage technique (repo, package ids, domaine) — seulement si Philippe l'ordonne

## 2. Train v4.18 (LIVE sur Pages)

- [x] R2 : Wither refait en vrai boss + dragon poli
- [x] Passe FX (explosions, flammes/fumée v2)
- [x] 7 fixes rapportés par Philippe (drops ramassables, pause→inventaire, arbres qui tombent d'un bloc rigide, lag snapshot, placer dans l'eau, minage modèle MC, sortie de nage)
- [x] Manette : dead zones réglables, vibration, gâchettes adaptatives DualSense (WebHID)
- [x] Gravité réelle des blocs (entités faller, fini la téléportation cellule par cellule)
- [ ] Verdicts live de Philippe sur Pages (fixes, gravité, Wither, logo) → File de verdicts (§13)

## 3. Pilier Plastique — les fondations

- [x] **P0 · Grille de studs** (Muse, qa99 7/7) : couche briques sur lattice de studs, running bond, terrain voxel intact
- [x] **P1 · Intégrité structurelle** (Muse, qa100/qa101/qa102) : ancrage par studs couverts, cantilever max 2, stress → détachement en entité qui se re-pose
  - [ ] Recalibrage coins (Philippe, 2026-10-29) : **≥1 stud couvert ancre la brique** (avant ≥2 — un coin sur voxel tombait toujours), poids 1 stud → 2 / 2 studs → 4, + **assist de snap** (positions voisines ±1 stud si la visée est bloquée; fantôme = clic). Fait + vérifié code/tests — *(en attente verdict Philippe)*
  - [ ] Question ouverte : à seuil 0,12 s, le sag progressif n'a plus le temps de se développer (les briques tiennent puis tombent d'un coup). Restaurer un sag visible = cadence de scan plus fine que le seuil — décision Philippe
- [x] **P2 · Soudure v1** (Muse, qa103/qa104) : le Welder (ID 400) soude deux briques qui se touchent, le support traverse le joint, minage refusé sur soudé (cisailles seulement), joints persistés
  - [x] **P2 résidu : cordon de soudure VISIBLE — LIVRÉ (`73beae09`)**. Design : un anneau de cordon (4 segments, métal clair brillant) suit le périmètre du rectangle de contact de chaque paire soudée, à moitié saillant sur la surface des briques — lisible d'en haut (briques empilées) comme de côté (briques adjacentes). Rendu : un seul InstancedMesh reconstruit quand les soudures changent (flag dirty consommé au scan d'intégrité); math pure dans `weld.ts` (testée)
  - [x] **P2 résidu : groupe soudé non ancré tombe D'UN BLOC — LIVRÉ (`73beae09`)**. Design : au scan d'intégrité, les détachements se résolvent PAR COMPOSANTE soudée — si un membre est ancré, la soudure tient TOUTE la composante (le stress se relâche; cohérent avec « minage refusé sur soudé »); si AUCUN membre n'est ancré, la composante entière tombe comme un corps rigide (un Group de meshes, gravité + sondes par membre comme les briques tombantes), se repose au niveau entier le plus haut, et ses soudures internes se RESTAURENT à l'atterrissage (décalées de la chute). Les paires dont un membre ne peut pas se reposer (place prise) meurent avec lui (drop en item, comme aujourd'hui)

## 4. P6 · La Fonderie — la boucle centrale

Casser → plastique (rendement par bloc, les mobs en droppent) → fondre → couler dans des MOULES débloqués par quêtes (R1) et boss (R2/R3). Le crafting reste, basic seulement. **P3 · Trempe est intégrée ici** (couler en plastique trempé = grade supérieur du même moule).

- [x] Étape 1 : pellets (401), lingot (402), 9 moules de couleur (qa105)
- [x] Étape 2 : trempe — lingot trempé (403), briques trempées (410–418) (qa106)
- [x] Étapes 3–4 : moules d'outils — outils plastique (404–407) et trempés (419–422) coulés, pas craftés par paliers de minerai (qa107/qa108)
- [x] Étape 5 : 4 moules de boss (fang/cinder niveau 12, tidal 16, void 22) — lingots trempés + charge signature (tests 42/42)
- [x] Étape 5b : moules guardian (16 → GuardianPlate) + pharaoh (12 → PharaohCrown) (tests 44/44)
- [x] **qa111 PASS COMPLET** : les 6 moules de boss mesurés en jeu (témoins 350/325/600/775/475/425, 0 erreur)
- [ ] Fermeture P6 : retest Pages de Philippe → File de verdicts (§13)
- [x] Moules rares : la boucle se ferme par le donjon R3 (§8) — les « moules » sont des RECETTES de Fonderie (pas des items) : les coffres de donjon droppent leurs MATÉRIAUX (Fang, Cinder, Prism, Sapphire, Scale, GuardianSpike, PharaohGold) en bonus rare (28 %, 1 par coffre) ; gates de niveau 12/16/22 intacts. Code vérifié (tsc 0, 44/44) — fermeture définitive = mesure en jeu + verdict Pages de Philippe

## 5. P4 · Son plastique

- [x] Pose, snap et casse synthétisés (DSP pur, aucun fichier audio) (Grok, 22319127)

## 6. P5 · Mécanique — blocs fonctionnels (lane Grok, mechState/mechLink)

Pas de redstone. Le cœur tourne : graphe de rotation local et borné.

- [x] Essieux, engrenages 8/16/24 (entraxe catalogue E = (N₁+N₂)/16), vis sans fin, embrayage, poulies, manivelle
- [x] Roue à eau (tourne seulement si l'eau la touche), moulin (air au-dessus, y ≥ 40)
- [x] Came (ouvre la porte/barrière à l'est après un demi-tour)
- [x] Moteur à ressort (358) : clic droit pour armer, tourne, s'arrête (non persisté)
- [x] Différentiel (359) : sortie = (A+B)/2
- [x] Crémaillère (360), Cardan (361), Roue (362)
- [x] Convoyeur (363) : un tour avance le bloc posé dessus d'une case
- [x] Piège (364) : un tour fait tomber le bloc posé dessus si la case du dessous est libre
- [x] Anneaux de vitesse (365/366) : rapport 1 ou 2 au clic droit
- [x] Engrenage 40T (367), coniques 12T/20T (368/369), vérin (370), tourelle (371), embrayage 24T (372)
- [x] Pneumatique, le lot (373 pompe, 374 cylindre, 375 valve, 376 réservoir) : l'air reste dans le réservoir valve fermée (plafond 4), un tour pousse le cylindre et dépense 1 (non persisté)
- [ ] P5a reste ouvert seulement comme case parente de P5b/P5c/P5d ci-dessous

## 7. P5 · Couche Teks 1:1 (le relais de Claude — logique vraie grandeur)

`teks.ts` = logique pure (aucun three.js) : 99 pièces avec leurs vrais numéros STUDS, couleurs et dimensions du PDF; grille d'assemblage au demi-module; règles d'ajustement vraies (un pin rond n'entre JAMAIS dans un trou en croix); moteur d'engrenages (ratios réels, vis sans fin, moteurs, manivelle, détection de bourrage).

- [x] `teks.ts` livré par Claude (1 048 lignes, constantes réelles : alésage 4,85/16 mm, pas = dents/16) — tests 3/3 revérifiés indépendamment
- [x] Étape 1 : `teksGeo.ts` fidèle (Muse) — 99/99 pièces, géométrie valide (0 NaN, volumes > 0, trous RÉELS prouvés par le volume, 62 100 triangles au total)
- [x] Étape 5 : vraies couleurs (Muse) — 99/99 corrigées du PDF (celles de Grok étaient inventées), bijection TEKS ↔ SPECS prouvée
- [x] Étapes 2+3+4 : câblage (Muse) — couche Teks dans game.ts (une Mesh par pièce, géométrie cachée), pose/raycast/minage minuté (la pièce revient toujours, les deux modes), rotation R + bouton tactile, rotation calculée par le moteur de teks.ts seulement, règle d'alimentation (un moteur tourne ssi un hub/batterie ALLUMÉ du même assemblage), conversion des vieilles sauvegardes sans jamais perdre une pièce
- [x] Étape 6 : icônes (Muse) — 99/99 PNG 160×160 transparents rendus DE la géométrie du jeu (même matériau Lambert vertexColors), fallback SVG si un PNG manque
- [x] Étape 7 : QA navigateur (Muse) — pose PASS, ratios **−1/3 exacts** (8T→24T), alimentation moteur PASS complet (14,137 rad/s = Motor M 135 rpm exact), minage Créatif PASS, icônes 99/99 en jeu, **0 erreur JS**
  - [x] Étape 7 reste : sauvegarde aller-retour MESURÉE — **PASS (qa7j-roundtrip, 2026-10-30 ~01:50)** : pièces posées → sauvegardées → rechargées → pièces identiques au retour
  - [x] Étape 7 reste : minage Survival mesuré — **PASS (qa7i3, 2026-10-30 07:54 PDT)** : poutre 378 posée, contrôle négatif OK, visée « Liftarm 1×5 » du premier essai, beamGone=true (~9,5 min de poll sous contention), drop {378} au sol, 0 erreur JS
  - [ ] Échelle en main PROPORTIONNELLE + main qui serre la pièce (décision de Philippe 2026-10-29, poussé `dad9180d`) *(en attente verdict Philippe)*
- [x] Nettoyage : retirer le câblage électrique P5b de Grok (mechLink moteurs/hub/batterie) — DONE (Grok). Bloc drive motor/hub/battery retiré de stepMech. Tests 17/17. Scale en main intouché.
- [x] Modèle d'arbalète distinct — DONE (Grok). Crossbow a son propre modèle (stock + prod horizontal + corde courte), plus le modèle de l'arc.
- [ ] Lag mesher — première passe faite par Grok (`cb7c919b`) : STUD_N 8→6 (−25 % triangles sur les studs), time-box 6 ms déjà en place. Pas de mesure avant/après : fermeture = verdict perf de Philippe + profilage §16 (la boucle QA reste le principal suspect sur la machine partagée).
- [ ] **Shaders SRN sur le Teks** (ordre de Philippe 2026-10-29 ~20:38) : les pièces quittent le Lambert plat pour un MeshStandardMaterial + sirenizeWorld (coutures 0,3, relief 1) — monde ET main; Lambert = fallback non-réaliste, swap câblé dans relight(). Codé + tsc 0 + tests 44/44. POUSSÉ 2026-10-29 ~23:15. Vérification visuelle au rig NON obtenue (5 morts de harnais qa-tech2, contention) — fermeture = verdict Pages de Philippe (look SRN sur pièces posées).
- [ ] **Main qui flotte + pièces plates en main** (photos de Philippe 20:32/20:36) : la Turntable 56T est à la BONNE échelle (rayon pas = 56/16 = 3,5 modules → 7 modules de large, le vrai 48452) — le problème était la présentation : les pièces plates (épaisseur < 30 % de l'envergure) sont maintenant tenues PAR LE BORD (clip sur le rim, bore le long de la tangente), basculées autour de la prise comme une assiette en main, rétrécies un cran de plus quand géantes (plafond 0,62 d'envergure modèle); swing Teks amorti à 50 % dans animateViewmodel (même famille que le bug du bras centre-écran). POUSSÉ 2026-10-29 ~23:15. Rig visuel NON obtenu (5 morts de harnais) — fermeture = verdict Pages de Philippe (sens de la bascule à confirmer). **Verdict de Philippe (2026-10-30 ~10:07 PDT, photo Pages) : « j'ai encore un problème avec les mains »** — la main reste perchée sur le dessus de la plaque au lieu de la serrer. Cause trouvée au code : le `shaft` (l'axe du bore de la pince) était calculé sur la matrice AVANT la bascule de −0,82 rad, pendant que la pièce, elle, basculait → la main gardait l'orientation non basculée, **47° à côté du bord**, pour TOUTES les pièces plates. Corrigé (2026-10-30) : la main bascule AVEC la pièce (le shaft subit la même rotation −0,82 sur X) — alignement par construction, comme la chaîne v4.17; tsc 0, tests 44/44. Fermeture = retest Pages de Philippe.
- [ ] **Mode construction (Tab) pensé Teks** (ordre de Philippe 20:31) : plaque holographique **30×30 studs** (15×15 blocs, une ligne de grille par stud) ancrée sur la dernière face du haut visée, épinglée ensuite; pose possible partout sur la plaque (cible « face » synthétique au plan de la plaque, portée 18); rotations du fantôme au clavier — **A/D lacet (axe Y), W/S tangage (X), Q/E roulis (Z), Shift+Q/E tangage (l'autre axe)** — par pas de 90° dans le groupe des 24 orientations (`composeO` nouveau dans teks.ts, prouvé headless : 4 quarts de tour = identité sur 24 orientations × 3 axes, inverses exacts); `plan(..., wantO)` honore l'orientation demandée EXACTEMENT ou retourne null (jamais de substitution silencieuse); en mode construction WASD tournent la pièce et les FLÈCHES déplacent le joueur; R et le bouton tactile réinitialisent au cycle du planner. Codé + contrat wantO prouvé headless (48/48 poses assises retournent l'orientation demandée); POUSSÉ 2026-10-29 ~23:15. Rig visuel NON obtenu (5 morts de harnais) — fermeture = verdict Pages de Philippe (sens des rotations WASD/QE à confirmer). **CORRECTION DE PHILIPPE (2026-10-30 ~10:48 PDT) : « quand tu pèses sur tab ça doit montrer une caméra au vol dans une boîte 30x30, pas le personnage, pis un grid pour construire n'importe quelle machine » → v2 codée le même jour** : Tab ancre la boîte sous les pieds du joueur (30×30 studs × 30 de haut) et active une **caméra libre** confinée dans la boîte (le personnage reste parqué, aucun input, pas de bras/item à l'écran); la grille devient **volumétrique** (verticales au stud sur les 4 murs, anneau à chaque bloc de hauteur, grille au plafond, poteaux de coin); le rayon de visée part de la caméra (portée 26), la pose/le minage se font depuis la caméra, le personnage parqué ne bloque plus le fantôme; contrôles : souris = regarder, flèches = voler (WASD aussi sans pièce en main; avec pièce, WASD/QE gardent les rotations de son spec 2026-10-29), Espace/C = monter/descendre, Shift = rapide. tsc 0, tests 44/44; fermeture = son verdict Pages (sens de vol + lisibilité de la grille).
- [ ] Icônes Teks v2 — silhouettes noires dans l'inventaire (plainte de Philippe 20:31) : re-render du lab avec éclairage studio (key/fill/rim), métriques livrées (pire écart-type 4,43 → min 8,22; Conveyor 6,1 → 25,6), feuille de contact livrée à Philippe. POUSSÉES 2026-10-29 ~23:15. Fermeture = verdict Pages de Philippe.
- [x] Manivelles des sites de débris : **DÉCISION DE PHILIPPE (2026-10-30) : c'est un BUG** — elles doivent spawner éteintes. Corrigé le même jour : les trouvailles Teks des sites de débris passent par `convertLegacyTechBrick(..., off=true)` → `p.on = false` (la conversion de sauvegardes garde l'ancien comportement); tsc 0, tests 44/44. Fermeture = retest Pages de Philippe

### P5b · Électrique + conduite (LE gros morceau restant)

- [x] Moteurs électriques câblés à la couche 1:1 (tailles = couple/vitesse : M 405 rpm/11 Ncm, L 390/18, XL 220/40, servo ±90° — mesures Power Functions, STUDS ne publie rien) — câblés dans vehicle.ts/game.ts et prouvés par les tests de conduite ; le servo sert à la direction, pas à la propulsion
  - **LIVRÉ (Muse, merge 2026-10-30 `5004283…`)** — à partir du socle de Grok (constantes PF du proto) : conversion d'assemblage, corps cinématique unique, suspension par raycasts terrain, différentiel partagé de mech, batterie drainée par charge-couple. Tests src/game 66/66 + tsc 0 sur l'arbre mergé.
- [x] Hub/batterie + télécommande à canaux A–D : le joueur LIE un hub à sa machine — binding réel testé, contrôle négatif inclus (mauvais canal = aucun mouvement)
- [x] **Conduite : un véhicule construit roule pour vrai sur le terrain** — UN corps cinématique par construction (masse/centre calculés des pièces), roues = raycasts de suspension, différentiel (A+B)/2. Jamais un corps rigide par brique, jamais de représentation build ≠ run — jouable en Créatif ; mesure Pages + verdict de Philippe encore dus
- [x] **CARBURANT (ordre de Philippe 2026-10-30 — n'était PAS au plan)** : fondre du plastique donne aussi du **fuel** (la Fonderie gagne un deuxième produit — la matière boucle : P6 nourrit les machines). À designer en chiffres : item fuel + réservoir, quels moteurs brûlent du fuel (combustion) vs électriques (batterie), taux de consommation selon la charge, recharge/drain de batterie, comportement à sec (la machine s'arrête, jamais de magie). Aucune énergie de nulle part : chaque joule répond « fait de quoi » — **LIVRÉ (2026-10-30)** : item Fuel (ID 470), Kiln 0,25/pellet, réservoir 4, moteurs électriques sur batterie, générateur du hub au fuel, arrêt à sec prouvé sur un véhicule en mouvement
- [ ] **Contrôle des machines sur TOUS les appareils (ordre de Philippe 2026-10-30)** : la télécommande canaux A–D doit exister au **tactile** (télécommande à l'écran) et à la **manette** (sticks/gâchettes), pas juste au clavier; et le **mode construction Tab** doit être atteignable et pilotable au tactile + à la manette (entrée dans le mode, caméra au vol aux sticks, rotation des pièces) — la v2 poussée 2026-10-30 est clavier seulement, c'est une limite assumée à fermer ici — **NON livré par le merge P5b** : la conduite réutilise le sample d'input existant, mais la télécommande tactile dédiée et le mode construction tactile/manette restaient ouverts — **CODE LIVRÉ (Muse, 2026-10-30)** : sneak tactile (parcage + binding), bouton Build + vol stick/▲▼ + rotation A D W S Q E à l'écran, bouton CH (télécommande), manette : accord L3+R3 + bumpers/D-pad en rotation; gate tsc 0 + 66/66 + build OK; **case non cochée** — mesures rig (qa-touch) en attente d'un slot (contention VM) + verdict Pages de Philippe — **EN COURS (Muse, claim 2026-10-30)** : pris sur l'ordre de continuation de Philippe (« vérifie entre chaque étape, teste entre chaque étape, n'arrête pas jusqu'à ce que tout fonctionne et soit complété »). Périmètre : télécommande canaux A–D tactile (à l'écran), conduite manette (sticks/gâchettes), mode construction atteignable et pilotable au tactile + à la manette (entrée, caméra au vol, rotation des pièces). Fichiers attendus : `src/game/game.ts` (input/sample/gestes), `src/game/GameView.tsx` (contrôles tactiles). File des rigs avant code : verdict qa-p5b (conduite en jeu) puis probes qa-bug3.

### P5c · Pneumatique complet + vérins + machines qui travaillent

**EN COURS (Muse, claim 2026-10-30 — ordre de Philippe : « pas besoin de Grok, tu peux le faire »; design SIMPLE, joli, fini métal Teks maison — formes fonctionnelles génériques seulement, rien de protégé).** État de départ mesuré : les pièces existent (Pump, SmallPump, SpringPump, Cylinder, Valve, Tank, Pipe, PipeElbow, CylBlock, EnginePiston, ActMini/Actuator/ActXL) mais sont INERTES — aucun comportement air/vérin dans le solveur. Design en 3 étapes, chacune testée headless avant la suivante :

- [x] **Étape 1 — Vérins à vis — LIVRÉE (code + tests, `946a9dd5`)** : ActMini/Actuator/ActXL devenus `drive: "screw"` — corps statique (exclu des groupes de spin, comme les moteurs), l'axe dans leur trou d'entrée tourne → l'extension `ext` (0..1, persistée dans la sauvegarde) intègre ω × pas / course (1 module/tour, signe = sens de l'axe d'entraînement : axe retourné ou engrenage inverseur = rétraction); tient la charge à ω=0 (vis autobloquante); fin de course = clutch (ext clampée). Rendu : géométrie corps/tige séparée (`rod` dans teksGeo), la tige translate de ext × course. Test headless dédié (étend ~0,58 en 0,5 s à 135 rpm, clampe, tient, rétracte) — fermeture = verdict Pages de Philippe
- [x] **Étape 2 — Pneumatique V2 COMPLET — LIVRÉE (code + tests, `e34d9435` + valve `1b6f555c`)** : réseau d'air = composante connexe par contact AABB entre pièces d'air (Pump/SmallPump/SpringPump, Cylinder, Tank, Valve, Pipe, PipeElbow), reconstruit à chaque changement. Pression 0..1 par réseau : la pompe charge quand elle est entraînée (axe dans son entrée, voisin qui tourne, moteur voisin alimenté — manivelle voisine = pompe manuelle); le Tank porte le plafond à 1 et la fuite à 0,004/s (sans lui : plafond 0,35, fuite 0,03/s). Valve au geste « use » : elle choisit la DIRECTION — sans valve la ligne est directe (étend), valve ouverte étend, toutes fermées rétractent — double effet, vitesse ∝ pression, le travail consomme l'air (0,22/unité). Le piston de la pompe bouge quand elle travaille. Force exposée `cylForce` = pression × bore² (vérins à vis : avantage constant × bore²). Test headless dédié (charge, extension complète, force, valve fermée/ouverte/rétraction, plafond sans réservoir) — fermeture = verdict Pages de Philippe
- [x] **Étape 3 — Pelle qui CREUSE — LIVRÉE (code + tests, `94c751c8`; icône `d479f88a`)** : les véhicules gagnent les JOINTS — conversion par sous-groupes connexes (le hub = groupe 0, hiérarchie BFS), un servo ou un vérin à vis touchant ≥2 sous-groupes devient une articulation commandée par son CANAL (touche C / bouton CH en conduite pour changer le canal du hub; throttle = consigne : servo → angle ±90°, vérin → ext). Park = les servos se replient au quart de tour près, les vérins gardent leur extension. Pièce **Godet 471** livrée (maths seules, GUN, recette de fonderie générée, icône rendue du même modèle). Creusage : le centre du godet en mouvement échantillonne une sphère R1,15 — un bloc part dans le godet (capacité 4) si sa dureté ≤ force du dernier joint de sa chaîne; plein/trop dur = message; déverser = échantillon « place » ou bouton ⛏ tactile → inventaire, surplus au sol. Modèle **« Rig Digger »** au catalogue (19 pièces, 4 servos auto-bindés B/C/D/D au chargement). Tests : 18/18 véhicule (articulation par canal, repli au park, round-trips exacts) + catalogue (conversion complète, le canal C ne bouge QUE le boom). Bornes v1 assumées : les cylindres à AIR ne s'articulent pas en véhicule (le réseau d'air vit sur le treillis fixe — la pelle = servos + vérins à vis); collision/occupation d'un vérin = son empreinte rétractée; pas d'IK (suivi de pointe approximatif). Fermeture = verdict Pages de Philippe

### P5d · Capteurs + automatisation

**EN COURS (claim Muse, 2026-10-30 ~21h PDT — ordre de Philippe).** Design (dans la loi B7 : aucun fil, aucun niveau de signal — un capteur CONTRÔLE, l'énergie vient toujours du hub) :
- **Capteur de proximité (ID 472)** : pièce Teks, regarde le long de son +X local; portée réglable au geste « use » (25 cm / 50 cm / 1 m / 2 m = 1/2/4/8 blocs); lecture = quelque chose de solide dans la portée (blocs ou pièces, échantillonné à 0,25 bloc).
- **Capteur de couleur (ID 473)** : lit la famille de couleur de ce qui est juste devant lui; cible réglable au geste « use » (N'importe quoi, Rouge, Jaune, Vert, Bleu, Blanc, Sombre); classification par teinte/luminosité du hex de la cible (fonction pure testée).
- **Logique** : cadence 0,25 s — (a) VOISINS DIRECTS : comme un interrupteur B7, le capteur pose `on` = sa lecture sur les pièces qui le touchent; (b) RELAIS HUB : si un hub de sa composante écoute le même canal que le capteur (bind sneak+use, comme les moteurs), tous les moteurs/vérins de ce canal dans la composante suivent la lecture — les machines réagissent toutes seules, sans fil.
- **Inclinaison dans le hub** : le véhicule publie pitch/roll (hauteurs de roues); au-delà de ~40° le hub coupe les moteurs (protection retournement) + message, cooldown 6 s.
- Config persistée : `Part.cfg` (portée/cible packée), 8e élément optionnel du tuple de sauvegarde Teks; lecture runtime `Part.sense` (non persistée). Icônes 472/473 par le pipeline B12; recettes de fonderie + catalogue automatiques (SPECS/registre).

- [x] **P5d LIVRÉ (code + tests, `c3f8d964`)** : capteurs 472 (proximité, 4 portées) + 473 (couleur, 7 cibles) — specs/géométrie/icônes du pipeline B12 (lentille sombre + LED cyan; anneau blanc + 4 pastilles de couleur); évaluation dans game.ts `tickSensors` (0,25 s) : rayon échantillonné à 0,25 bloc pour la distance (blocs solides OU cellules Teks), sonde à face +0,55 pour la couleur (une pièce Teks dans la cellule gagne sur le bloc derrière; familles par `colorFamilyOf`, fonction pure testée); drive (a) voisins directs au contact (loi B7) + (b) relais hub par canal dans la composante; protection inclinaison câblée dans la boucle de conduite (throttle forcé à 0 au-delà de 0,7 rad de pitch/roll, message à cooldown 6 s). Gestes : use = cycle portée/cible (+ say), sneak+use = bind canal. Crochet QA `getSensors()`. Portes : tsc 0, tests 81/81 (+3 : specs, cycle cfg + labels, familles de couleur), build OK. Fermeture = verdict Pages de Philippe (la case parente reste ouverte jusqu'à son retest)

## 8. Lane RPG

- [x] R1 : 4 chaînes de quêtes, 38 quêtes, journal par chaîne
- [x] R2 : boss (Wither refait en vrai boss, dragon poli — dans v4.18)
- [x] **R3 : le donjon** — mergé sur main (PR #3, 2026-10-30, vérifié par Muse : tsc 0, 44/44, docs intacts) + matériaux des moules de boss dans les coffres (finition Muse). Fermeture définitive = mesure en jeu (spawn 7 % jamais rencontré au rig) + verdict Pages de Philippe
- [x] **R4 : identité de construction + loot nommé rare — LIVRÉ (code + tests, `47367c85` + `942a09ae`)**. Fermeture = verdict Pages de Philippe. Définition d'origine (roadmap RPG 2026-10-28) : « A specialization choice that commits the character (one signature branch bonus) + rare named loot with affixes, so two players' gear reads different. » Design arrêté :
  - **Spécialisation engagée** (choix au panneau Ranks, persisté `save.path`; premier choix libre, changer coûte **25 émeraudes** — l'engagement a un prix, pas un menu) : **Founder** (Fonderie 20 % plus rapide; recyclage 75 % au lieu de 50 %) · **Mechanic** (upgrades de machines −25 % de matière, via le point unique `lvlAfford`/`lvlPay`) · **Scavenger** (coffres de monuments : jackpot Teks garanti + le loot nommé y est plus fréquent) · **Breaker** (casse 25 % plus vite; les éclats de minage partent par 3 au lieu de 2 — la destruction comme identité)
  - **Câblage livré** : `identity.ts` (pur, testé) + game.ts — choix au panneau Ranks (`choosePath`, changement payé et refusé sans les émeraudes), Founder dans `tickFurnaces` (seuil de cuisson ×0,8 + recyclage ×1,5 arrondi sup.) et la normalisation du panneau, Mechanic dans `lvlCostFor` (point unique afford/pay/affichage), Scavenger à la première ouverture d'un coffre monument (jackpot garanti + relique 50 %), Breaker dans le calcul de casse (÷1,25) et les éclats (3/stage); reliques : `grantRelic` (boss/coffres), effets Keen (dégâts), Swift (casse), Sturdy (usure), Lucky (rendement, seulement si le bloc donne déjà du plastique — la matière ne naît pas de rien); noms via `hud.named` dans la pilule, la bulle et la barre. Bonus attrapé au passage : le recyclage §11 perdait son rendement sur la DERNIÈRE pièce d'une pile (l'input était zéro avant la lecture du rendement) — corrigé (input capturé avant décrément). Hooks QA `getPath`/`getRelics`/`grantRelicQa`. Portes : tsc 0, tests 99/99
  - **Loot nommé rare à affixes** : les boss (dragon/wither 40 %, ravager/evoker 15 %) et les coffres de monuments (25 %) peuvent donner une **relique** : une pièce d'équipement haut de gamme (base existante) portant un nom généré (« Keen Gem blade of the Wind ») + **2 affixes distincts** aux effets RÉELS tant qu'elle est en main — Keen +2 dégâts · Swift casse 15 % plus vite · Sturdy s'use moitié moins vite · Lucky +1 pellet sur les blocs plastique. Stockage : la besace ne tient qu'une instance par id d'équipement (son compte = sa durabilité) → les données nommées vivent dans `save.named` clé par id de base; un doublon de base se convertit en 8 pellets (rien ne se perd). Le nom s'affiche dans la pilule d'inventaire, la bulle et la barre (hud.named)

## 9. P7 · Objets, matériaux, équipement — refonte par la matière

- [x] Audit v1 : 363 IDs cartographiés (`p7-audit.md`, local)
- [ ] Schéma : étendre `BlockDef` avec `mat?: {matrice, renfort?, conducteur?}` + `mold?` dans blocks.ts
- [ ] Chaîne électronique : Sable → (haute chaleur) → **Silicium** → chips; l'or = conducteur
- [ ] Machine à pièces électroniques — distincte de la Fonderie (les machines sont les verbes)
- [ ] Armes + balles naissent comme MOULES : balles = pellets coulés par calibre, récupérables, refondables
- [ ] Refonte totale : fondre n'importe quel objet retourne TOUTES ses matières (même l'or des circuits)
- [ ] CAT-06 : accessoires figureurines (lane Muse) — définis + modélisés + icônes + accessibles, comme tout le reste

## 10. P8 · Inventaire, crafting, machines

- [x] Fix système BUG-4 : le catalogue Créatif est DÉRIVÉ du registre BLOCKS (+ `CATALOG_EXCLUDED` documenté), assertion permanente définitions↔catalogue dans les tests
- [x] **Catégories d'inventaire par SYSTÈME plastique — LIVRÉES (`f508a448`)** : All / Bricks / Teks / **Matter** (pellets, lingots, trempés, minerais, métaux/charges, briques-couleurs + trempées, Fuel — la matière du système) / **Gear** (outils, armes, armures) / Food & Brews / **Nature** (drops, graines, divers non classés). Fermeture = verdict Pages de Philippe
- [x] **Dissolution pierre + fer — LIVRÉE (`f508a448`)** : les paliers SUPPLANTÉS par un moulé strictement meilleur ont quitté le jeu — Pierre (PickS/SwordS, T2 80 usages < plastique T2 120) et Fer (PickI/SwordI/AxeI/ShovelI, T3 160 < trempé T3 240) : 6 recettes retirées, sources re-pointées vers les moulés (vendeur, quête, coffres de loot, drop vindicator), CATALOG_EXCLUDED documenté, **migration au chargement sur TOUS les contenants** (sac, barre, armure, coffres) → pellets au rendement de fonte (T2 → 6, T3 → 12; une rangée d'inventaire = un outil, son compte = sa durabilité), écriture unique (saveDirty). Registre `dissolve.ts` + `dissolve.test.ts` (aucune source ne produit un dissous, successeurs strictement meilleurs au même palier). Bois (starter) et Gemme/Bronze/Chrome/Prisme restent — ils dissoudront quand leurs moulés P7 arriveront. Fermeture = verdict Pages de Philippe
- [ ] Crafting réduit aux basics; la progression passe par les machines (Fonderie, électronique)
- [ ] Machines qui gagnent des niveaux : effet chiffré RÉEL et VISIBLE — le look change, l'effet se ressent en jeu, l'UI montre les stats avant/après. Un upgrade invisible n'est pas livré
- [ ] **Arbres d'upgrades par machine (à spécifier, ordre de Philippe 2026-10-30)** : la loi ci-dessus existe, mais aucun arbre n'est écrit — Fonderie (vitesse de fonte, rendement, capacité fuel?), machine électronique, hub/batterie (capacité, canaux), moteurs (couple/vitesse par niveau) : chaque machine reçoit ses niveaux chiffrés quand son système arrive (P5b/P7), payés en matière du système, jamais en monnaie inventée — **ARBRES ÉCRITS (claim Muse, 2026-10-30 ~21h45)** :
  - **Fonderie (bloc Furnace, niveau par instance, persisté dans l'objet Furn)** : L1 cuisson 5,0 s · **L2 « Refractory lining »** cuisson **3,5 s** (coût 8 lingots plastique + 4 cuivres) · **L3 « Twin bellows »** cuisson **2,2 s** + **carburant ×1,5** (coût 16 lingots + 8 cuivres + 2 lingots trempés). UI : carte machine au panneau (bandeau couleur par niveau + stats avant/après + bouton Upgrade). Dette look assumée : le tile monde par niveau reste à faire (mesher) — la carte panneau porte le visuel v1
  - **Hub (pièce Teks, niveau par position treillis, persisté `teksLvl`)** : L1 drain batterie ×1 · **L2** capacité ×1,5 (drain ×0,67, coût 10 lingots + 6 cuivres) · **L3** capacité ×2 (drain ×0,5) + **générateur ×1,5** (coût 20 lingots + 12 cuivres + 4 trempés). Geste : use en tenant les coûts = offre, 2e use ≤3 s = confirme (même patron moteurs)
  - **Moteurs (drive motor, incl. servos)** : L1 rpm ×1 · **L2** rpm **×1,25** (coût 6 lingots + 2 cuivres) · **L3** rpm **×1,5** (coût 12 lingots + 6 cuivres + 1 trempé). Le facteur passe au TechWorld par un callback `rpmMul` (le groupe hérite du facteur de son moteur meneur)
  - Machine électronique : son arbre s'écrira avec P7 (le système n'existe pas encore — Grok)
  - **LIVRAISON des trois arbres arrivés (`f508a448`)** : Fonderie — niveau sur l'objet Furn (persisté par le spread save), cuisson lue du niveau dans `tickFurnaces`, carburant ×1,5 au L3, carte panneau avec bandeau couleur par niveau (acier → cuivre → cyan trempé) + stats avant/après + bouton Upgrade payé en matière. Moteurs — facteur `TechWorld.rpmMul` injecté depuis `teksLvl` (persisté `save.teksLvl`, clé position treillis); deux moteurs de niveaux différents sur un même groupe se bloquent (vitesses incompatibles — honnête). Hub — `battMul`/`genMul` passés au `DriveCmd` du véhicule (clé hub gardée sur l'entité). Geste moteurs/hub : tenir des lingots plastique + Use = offre chiffrée, 2e Use ≤ 3 s = confirmation + paiement. Tests : rpmMul ×1,5 exact (teks.test), drain ÷2 et générateur ×1,5 (vehicle.test). Fermeture = verdict Pages de Philippe (le look « tile monde par niveau » de la Fonderie reste la dette écrite plus haut)

## 11. Sites de débris

- [x] v1 câblé et jouable : 3 pièces/chunk, pool de 6, dispersion par hash
- [x] **Design complet : double voie pour TOUTES les pièces avancées** — les fabriquer OU les trouver; jamais une pièce loot-only non craftable (le crafting = le pity timer, à 3–5× le coût) — **LIVRÉE (`eaa963d2`)** : le côté FABRIQUER était complet depuis B4 (recettes de moulage générées pour les 102 pièces); le côté TROUVER est livré ici (pools par tiers ci-dessous). Fermeture = verdict Pages de Philippe
- [x] **Topologie de spawn — LIVRÉE (`eaa963d2`)** : routes = artères de loot, monuments = gros lots, rareté par tiers de zone — **DESIGN ARRÊTÉ (même claim)** : zones par distance à l'origine (zone 0 < 20 chunks, zone 1 < 56, zone 2 au-delà); **artères** = un champ de bruit basse fréquence (crête = densité ×0,6→×2,2) qui concentre les sites en bandes apprenables; présence ~38 % × artère (v1 mettait un site par chunk, sans lecture); composition — zone 0 : 2–4 pièces de base (+ 8 % un avancé « teaser », jamais du rare), zone 1 : 3–5 + 1 avancé garanti, zone 2 : 4–6 + 2 avancés garantis; rareté dans les slots avancés : 12 % (z1) / 28 % (z2) de tirer du RARE (hub, gros moteurs, servo, remote, capteurs, ActXL); **monuments = jackpots** : les coffres des sites (wreck/ruin/mine/shrine/tomb/reef + majeurs) gagnent ~55 % du temps une pièce avancée bonus (20 % de rare) via le même patron que le bonus boss-mats de `stockChest`
- [x] **Recyclage à ~50 % — LIVRÉ (`eaa963d2`)** : les débris non utilisés = plastique à fondre (lien P6) — **DESIGN ARRÊTÉ (même claim)** : chaque pièce Teks devient un input de Fonderie valide (`SMELT[pièce] = Pellets`, rendement `SMELT_N` = 50 % arrondi de son coût de moulage en lingots; le cuivre des moteurs = les frais du recycleur). Le tick du four apprend les rendements multiples (défaut 1)

## 12. Gravité — la loi de Philippe (2026-10-29)

« La gravité pour TOUT les blocs. Si un arbre est coupé de 3 studs et qu'il reste un stud, il tombe. Les feuilles tombent avec l'arbre et se placent. »

- [x] Arbres : la règle des 2 supports (le composant au-dessus de la coupe tombe sauf s'il repose sur **2+ points solides** extérieurs; 1 support restant = il tombe) — les anciens gates de forme (canopée ≥6 feuilles, ≥2 bûches, zéro appui) sont morts
- [x] Arbres : le sens de chute choisit un chemin LIBRE (sweep testé; le tronc ne clippe plus à travers le sol ni les blocs)
- [x] Arbres : shading réaliste sur les blocs qui tombent (même pile d'atlas que le monde statique)
- [x] Feuilles : elles tombent avec l'arbre et SE PLACENT (settle trié bas→haut, le tronc tombé sert de support; ce qui ne peut pas se placer drop en item — rien ne disparaît) *(en attente verdict Philippe)*
- [x] **Gravité par composantes pour TOUS les blocs — LIVRÉE (code + tests, `2b4b39de`)** : analyse pure `gravity.ts` (BFS 6-voisins à travers tout solide ordinaire, terrain inclus; budget 2 500 cellules en jeu — un remplissage qui ne se ferme pas = la masse terrain, ancrée; adjacence bedrock = ancrée). Un composant DÉTACHÉ tombe si ses appuis sur du sol non absorbable (blocs fixes à état, blocs `fall`, bedrock) sont < 2 — 1 appui = tombe, comme les arbres. Câblage : scans différés 0,3 s après casse/pose/explosion/creusage au godet/setBlock QA (≤2 scans/frame, un seul flood de masse par scan via ensemble partagé), conversion en fallers ordinaires par vagues bas→haut (≤10/frame, plafond FALL_CAP partagé) — les blocs retombent et SE REPOSENT (sémantique faller existante). Bornes v1 assumées : les blocs à état (`def.work`, coffres, shulker, panneaux) sont fixes — jamais tombants, comptent comme sol; les blocs `fall` gardent leur spawner et sont exclus des composantes; un méga-build détaché > 2 500 cellules lit comme du terrain; le feu qui brûle un support ne déclenche pas de scan (casse/pose/explosion seulement). Tests : gravity.test 6/6 (flottant, 1 vs 2 appuis, sable comme sol, bedrock, débordement = terrain, colonne coupée). Fermeture = verdict Pages de Philippe

## 13. Campagne de fermeture — les 6 bugs (fermeture = mesuré + retest Philippe)

- [ ] **BUG-1 · Les briques posées sur studs n'avaient pas l'éclairage réaliste**
  - [x] Cause trouvée : `brickGeo` n'écrivait aucun attribut `color` alors que le matériau exige `vertexColors:true`
  - [x] Fix mesuré au rig (qa109c) et poussé (`9996c2fe`)
  - [ ] Retest Pages de Philippe
- [ ] **BUG-2 · Le Bow**
  - [x] Le nom est « Bow » (le renommage « Arc / Bow » de Grok a été reverté — jamais un alias en nom d'affichage)
  - [x] Modèle en main reconstruit (photo de Philippe : l'ancien était 2 boîtes droites + une corde flottante = un bloc beige) : branches en 3 segments sur un vrai arc, corde pointe-à-pointe (`5d7a41b5`)
  - [x] Mesure rig FAITE (boucle 2026-10-29 ~20:20, sur le build du head `5e2a2482` qui contient le modèle reconstruit) — en **Survival** (plus strict que le Créatif écrit ici) : nom exact « Bow » ✓, craft recette `bow` (Stick 3→0, String 3→0, Bow pris = durabilité 80/80) ✓, contrôle négatif sans flèche (aucun tir) ✓, tir ×2 (projectiles 0→1→2, flèches 5→4→3) ✓, 0 erreur de page. Détail au WORKLOG 20:20 boucle.
  - [ ] Retest Pages de Philippe (silhouette + tir)
  - [x] Dette liée : modèle d'arbalète distinct — fait par Grok (`0b9f60cb` : stock + prod horizontal + corde courte) *(silhouette en attente verdict Philippe)*
- [ ] **BUG-3 · Gravité (briques et sable)**
  - [x] Fix de Grok : seuil de stress des briques 0,75 s → 0,12 s; `spawnFaller` et l'atterrissage lisent la couche briques
  - [x] Vérification Muse : 3/3 cas journalisés MESURÉS PASS + régression P1 au nouveau seuil
  - [x] Défaut collatéral trouvé par la mesure : `TEMPERED_STRESS_MAX` était un littéral périmé (12,5× au lieu de l'invariant 2×) — corrigé (`0f557775`)
  - [ ] **Sable flottant : FAIL MESURÉ AU CALME (qa-reg run n°3, 2026-10-30)** — un bloc de sable posé en l'air (gy+4) n'est JAMAIS tombé (sa case de départ le contient toujours après 40 polls, fenêtre calme, 0 erreur). Chantier code OUVERT : pourquoi le scan faller ne ramasse pas cette case (déclencheur = voisinage d'une casse seulement? rayon de scan centré joueur? le setBlock du rig ne produit pas l'update qu'une pose/minage réel produit — à trancher au code, puis re-mesurer)
  - [ ] **Topple « un seul support » : FAIL au critère du rig (qa-reg run n°3, au calme)** — le cas du frère : aucun topple observé après la coupe de base. À déterminer au code : le composant n'est jamais tombé (vrai bogue contre la loi des 2 supports) OU il est tombé en fallers droits (le critère toppleCount ne le voit pas). Lecture du code d'abord, re-mesure ensuite
  - [ ] Retest Pages de Philippe
- [ ] **BUG-4 · Pièces invisibles dans l'inventaire Créatif**
  - [x] Fix système poussé (`b9204a76`) : catalogue dérivé du registre (voir §10)
  - [x] Contrôle visuel en jeu : 99/99 icônes Teks chargées, recherche fonctionnelle (étape 7, cas 6)
  - [ ] Retest Pages de Philippe
- [ ] **BUG-5 · Aucun loot en Créatif**
  - [x] Cause : tout le rendement de `breakBlock` était dans `if (!creative)`; mesuré PASS au rig
  - [x] Confirmation qa-reg : **MESURÉ PASS au calme (run n°3, 2026-10-30)** — casse de terre en Créatif : drop {id:2} au sol ET ramassage prouvé (inventaire 0→1); même résultat pour la bûche. La plainte du 2026-10-29 soir (« on peut pas récupérer de la terre ») est fermée au niveau rig : les échecs du run n°1 étaient la contention. Reste le retest Pages de Philippe ci-dessous
  - [ ] Retest Pages de Philippe
- [ ] **BUG-6 · Un coffre brisé perdait son contenu**
  - [x] Cause : aucune branche `ID.Chest` dans `breakBlock`; mesuré PASS au rig
  - [ ] Retest Pages de Philippe

## 14. Fixes du soir 2026-10-29 (faits + vérifiés code/tests — verdict = son œil)

- [x] Bras au milieu de l'écran en minant à main nue : swing amorti (45 % de la rotation, 50 % de la translation) — le pivot MC complet plantait la manche au centre, retrigger à chaque coup (`5e2a2482`) *(en attente verdict Philippe)*
- [ ] File complète des verdicts en attente (Philippe coche au fur et à mesure sur Pages) :
  - [ ] v4.17 (fonte réaliste + FUSION, feu MC, outils en main transform MC, proportions) — A54/PC
  - [ ] v4.18 : les 7 fixes + Wither + gravité faller
  - [ ] BUG-1, BUG-3, BUG-4, BUG-5, BUG-6 (retests)
  - [ ] BUG-2 : silhouette du Bow reconstruit + tir
  - [ ] P6 complète (la boucle fonderie + les 6 moules de boss)
  - [ ] Couche Teks 1:1 : pose, engrenages qui tournent, moteur alimenté, icônes
  - [ ] Échelle proportionnelle + main qui serre les pièces Teks
  - [ ] Arbres : shading, sens de chute libre, règle des 2 supports, feuilles qui se placent — **+ le retest de son frère** (les arbres ne tombaient pas de son bord sur l'ancien build)
  - [ ] Bras en minant (tunnel à main nue + à la pioche)
  - [ ] DualSense réelle sur PC, manette Bluetooth, calibration FPS désert Créatif (20 FPS rapportés)

## 15. Dettes QA (à mesurer, dans l'ordre de la file)

- [x] qa-reg : **run n°3 TERMINÉ en fenêtre calme (2026-10-30, load ~0,7, 0 erreur JS)** — run n°1 (contention) : D PASS, A/B/C/E FAIL à la fenêtre; run n°2 tué par un remplacement de VM (aucun cas). **Verdicts du run calme : A terre PASS (drop + ramassage inv 0→1), B bûche PASS (inv 0→1), D topple coupe médiane PASS** — les FAILs de ramassage du run n°1 étaient des artefacts de contention. **C sable FAIL confirmé au calme** (la case de départ contient toujours le sable après 40 polls) → chantier code ouvert sous BUG-3. **E un seul support FAIL au critère du rig** (aucun topple observé) → à déterminer au code (composant jamais tombé vs tombé en fallers droits, invisibles à toppleCount)
- [x] qa-dungeon-unit : MESURÉ PASS au niveau fonction (2026-10-30 ~09:41 PDT) — la vraie `stockChest` (head `c3448644`) sur 2 000 coffres dungeon : gate mesuré 28,4 %, 0 mismatch de sélection (hash seed+777), les 7 matériaux de moules de boss présents, 0 fuite sur 1 500 coffres contrôles (deep/castle/wild), garde « bin pré-rempli » OK. Reste dû : la mesure EN JEU (spawn 7 % jamais rencontré au rig) + verdict Pages de Philippe
- [ ] qa96 restes : s3b (sonde settle du topple), s4 (Wither — le harnais est mort, pas le jeu), s5 (FX — aucun verdict n'existe, les deux logs sont vides)
- [ ] qa97 : performance (chiffres relatifs au rig seulement — le verdict perf est l'A54 de Philippe)
- [x] qa-bow : MESURÉ PASS (voir BUG-2 §13) — reste seulement le retest Pages de Philippe
- [ ] Re-mesurer qa100/qa101/qa102 sous le recalibrage studs (§3) — **harnais recalibrés par la boucle (20:33)** : qa102/qa101 v3 (les anciennes assertions sag /0,75 sont impossibles : stress max 0,12 + scan gate 0,25 → détachement au premier scan, sag inobservable — observation de design ouverte), qa100 re-dérivé au code (verdict attendu inchangé : 10/8/{C3,F}); mesures au rig encore dues (fenêtre calme + dist 8091 frais)

## 16. Lag (de worklog2, item 3 — ouvert)

- [ ] Profiler la vraie cause : mesher CPU (rebuild de géométrie) vs contention des bancs QA sur la machine partagée. Sur Pages/téléphone il n'y a aucun banc — si ça lag là, c'est le mesher/studs
- [ ] Framerate avant/après mesuré, correctif ciblé (jamais d'optimisation au feeling)

## 17. Icônes Teks — rework (de worklog2, item 5 — ouvert)

- [x] v1 : 99/99 rendues de la vraie géométrie, transparentes, en jeu (étape 6)
- [ ] v2 : silhouettes retravaillées (meilleurs angles/lumière) dans le lab d'icônes hors-ligne — après le verdict de Philippe sur la v1 (le Converoyeur 363 est le moins lisible : dalle quasi noire)

## 18. Nettoyage du repo (DÉCISION DE PHILIPPE 2026-10-30 : oui — mais APRÈS la fin du master plan, pas maintenant)

**Décision (2026-10-30 ~10:05 PDT) :** « il va falloir remapper quand on aura fini et delete les vieux code ; pas tout suite ». Donc : quand le master plan sera terminé → **refaire la carte au head du moment** (le repo aura changé depuis la carte du 2026-10-29), re-vérifier la liste morte contre la carte fraîche, supprimer le vieux code, puis re-vérifier tsc 0 + tests + build. **Rien n'est supprimé avant ce moment-là**, et la liste exacte reste confirmée par Philippe au moment de l'exécution (sa loi post-purge).

Carte mesurée livrée : `~/workspace/your_files/studcraft/carte-du-repo.html` (512 fichiers suivis; le jeu vivant = 34 fichiers).

- [ ] Mort confirmé, zéro référence : `public/icons/` (162 vieux JPG photo ≈ 25,6 Mo — remplacés par icons-160), `public/__grok/` (6 fichiers ≈ 208 Ko)
- [ ] Scaffold mort (l'app Grok Build d'origine, jamais atteinte par les deux entrées du jeu) : `src/lib/auth/`, `src/lib/app-data/`, `src/routes/`, `src/router.tsx`, `src/routeTree.gen.ts`, `src/lib/db.ts`, `env.server.ts`, `error-component.tsx`, `preview-*`, `src/components/preview-host-bridge.tsx`, `src/lib/multiplayer/`, `server/`, `migrations/auth/`, `vite.config.ts` (moitié scaffold du script build) + 14 fichiers de tests du scaffold
- [ ] À confirmer : `scripts/` (26 fichiers, outillage de l'ère scaffold), docs `AUDIT-1A1.md`, `STANDALONE.md`, `MULTIPLAYER.md` (`AGENTS.md` = boilerplate Grok Build, ne gouverne PAS ce projet)
- [ ] Après suppression : re-vérifier tsc 0 + tests + build (l'historique git garde tout récupérable)

## 19. Sortie (SEULEMENT quand le plan est terminé et Philippe satisfait)

- [ ] Train de builds : APK vc40 « 4.18 » + PC 4.18.0 (Setup NSIS + portable + zips) — bumps pré-stagés, EN HOLD
- [ ] Uploads Drive avec MD5 revérifiés + Release GitHub (liens Drive, jamais d'assets directs — uploads.github.com refuse nos credentials)
- [ ] Message de livraison avec l'étape Débloquer (clic droit → Propriétés) pour le PC

---

## Prochains moves — UNCLAIMED (protocole Rythme : prendre le dernier, claim avant de coder)

- [x] **R3 · Le donjon** (§8) — FAIT côté code (voir §8) ; reste la mesure en jeu + le verdict Pages de Philippe.
- [ ] **Gravité universelle — scoping** (§12) : écrire le design du scan de support par composantes (ancrage bedrock) AVANT tout code.
- [x] **P5b · Conduite** (§7) : prototype Creative conduisible livré et mergé (2026-10-30 — corps cinématique unique, liaison hub, canaux, fuel) ; reste la mesure sur Pages + le verdict de Philippe.
- [ ] **P7 · Schéma matière** (§9) : `mat`/`mold` dans BlockDef + chaîne silicium en une étape mesurée.
- [ ] **qa-reg → verdicts** (§15) : finir la batterie en cours, livrer le rapport ce qui marche / ce qui est cassé.


### R3 merged 2026-10-30
- Placement rare + clear d'entrée dans world.ts.
- Table dungeon avec items Foundry (Pellets, PlasticIngot, TemperedIngot, PlasticPick/Sword, TPlasticPick).
- Mergé dans main via PR #3 (branche propre depuis main actuel).
- Boucle P6 : les coffres du donjon donnent maintenant du feedstock Foundry + outils plastiques.

### R3 — vérification + finition des moules (Muse, 2026-10-30)
- Merge PR #3 VÉRIFIÉ après coup (la règle « vérifier avant merge » a été contournée par l'ordre direct de Philippe à Grok) : head `75a04279` resynchronisé, tsc 0, tests 44/44 ; WORKLOG intact (4 619 lignes, aucune troncature), master plan +7/−0 ; world.ts = le code vérifié sur la branche.
- RÉSERVE levée autrement : la table de Grok ne contenait AUCUN moule — et pour cause, les moules de boss sont des recettes (`recipes.ts` bmold-*), pas des items. Finition Muse dans `loot.ts` : le bonus rare des coffres de donjon (gate hash > 0,72) donne 1 matériau de moule de boss (pool de 7, choix déterministe) au lieu du Diamond générique. La boucle P6 est nourrie, les gates (niveau + lingots trempés + Fonderie) restent entiers.
- Reste dû : rencontrer un donjon en jeu (spawn 7 % des colonnes éligibles) — aucune mesure de rig à ce jour, ni pour la structure ni pour les coffres.

---

## 21. Audit de fermeture — retours de jeu de Philippe (2026-10-30 ~15h37 PDT, session A54 sur 8fa2ec2c)

Philippe a testé sur Pages et rapporté 7 chantiers. Audit au code fait le même jour (Muse) — verdicts ci-dessous, AUCUN basé sur une impression : chaque ligne cite son endroit dans le code. Exécution par batches, gate entre chaque (tsc 0, tests, build, push, déploiement). **EN COURS (Muse)** — fichiers : `mesher.ts`, `game.ts`, `GameView.tsx`, `styles.css`, `recipes.ts`, `blocks.ts`.

### A1 · Studs — DEUX défauts confirmés
- [ ] **Terrain hexagonal** : `mesher.ts` `STUD_N = 6` (passe lag de Grok, 8→6 « encore rond à cette taille » — faux à l'œil : un hexagone). Les studs du sol doivent être RONDS comme ceux des briques. Fix : `STUD_N` → 12; coût triangles assumé et noté, mesure perf qa97 derrière.
- [ ] **Dessin DANS les studs des briques placées** : `brickGeo` (game.ts) pose des cylindres 16 segments (ronds ✓) mais remappe l'UV du stud sur la tuile top ENTIÈRE de l'atlas → le dessin de la tuile (cercle + arcs) se réimprime dans chaque stud = les « 4 demi-cercles » de Philippe. Fix : les studs échantillonnent une zone UNIE de la tuile (ou couleur plate du def) — rond et plastique, aucun dessin. Vérifier le ghost au passage.

### A2 · Redstone — un moteur Minecraft complet encore vivant (viole la loi P5 « jamais de redstone », 2026-10-28)
- [ ] `tickRedstone` (game.ts, ~800 lignes) : dust/repeater/comparator/hopper/daylight (298)/night sensor (299)/target + ignition TNT; catégorie « Redstone » au livre de Crafting (2 recettes), filtre GameView, icônes dédiées. Nos machines sont moteurs + batteries + fuel — le système d'alimentation redstone doit PARTIR. Les capteurs utiles (lumière) reviendront re-logic en P5d (électrique), pas avant. Migration save : les blocs redstone d'un monde chargé sont convertis (composants → air; capteurs/blocs pleins → pellets selon le rendement, la matière ne disparaît pas). Chantier propre, claim séparé au moment de couper.
- [x] **B5 FAIT** (retrait du moteur, migration save = drop pellets à la casse, `tickHoppers` conservé hors redstone). **B7 FAIT (2026-10-30, précision de Philippe ~16h03 : « certains items redstone se gardent en changeant leur logique »)** : Lever, Pressure plate, Daylight → **Solar switch**, DaylightInv → **Night switch**, Observer → **Watcher**, Target sont revenus, re-logic sur le modèle d'énergie — couche `applySwitch` : aucun fil, aucun niveau de signal, l'interrupteur pose l'état `on` des pièces Teks dans ses 6 cellules voisines, l'énergie vient toujours des hubs/fuel. Registre `switchCells` persisté (save.ts `switches`), tick 0,4 s. Restent retirés : Dust, RedTorch, Repeater, Comparator, Piston (l'Actuator est le poussoir), Dispenser. Fermeture = verdict Pages de Philippe.

### A3 · Machines / fuel — la boucle EXISTE au code, mais invisible et INCOMPLÈTE
- Constat code : Kiln craftable (8 cobble), SMELT pellets→ingots 1:1, fuel distillé 0,25/pellet payé en items Fuel à côté du kiln (`fuelAcc`), 14 recettes de moulage au livre (cat. Build), ingot trempé — tout est là. Philippe n'a rien trouvé : le problème est réel et il est triple.
- [ ] **TROU RÉEL — créer des pièces Teks en Survival : IMPOSSIBLE.** Zéro recette pour les 99 pièces (débris/donjon seulement). Fix : recettes de moulage Teks GÉNÉRÉES depuis le registre `teks.ts` (coût = masse réelle de la pièce → pellets/ingots), fondues au Kiln comme les autres moulages.
- [ ] **Progression du kiln invisible** (plainte directe) : l'état `cook`/`burn` existe (`Furn`), la barre existe (GameView, `hud.furnace.cook`) — déterminer pourquoi Philippe ne la voit pas bouger (rafraîchissement du panneau? ouverture au tactile?) et corriger; mesure rig à l'appui.
- [ ] **Découvrabilité** : rien dans le jeu ne raconte la chaîne casser → pellets → kiln → ingots → moules → fuel. Fix minimal : les recettes nommées pour ce qu'elles font + une quête P6 qui marche le joueur dans la boucle une fois.

### A4 · Bouton Build (▦) sur mobile — « fonctionne pas »
- [ ] Code + CSS présents (8fa2ec2c, `sc-touch-build` stylé dans styles.css). MAIS la capture de Philippe à 15h14 montre l'ANCIEN HUD (Pause + Bag seulement, pas de ▦) : sa session roulait un build en cache. Rig qa-touch lancé (taps CDP réels, oracle `getBuildMode`) : s'il passe, le code est bon et le remède = cache (fermer/rouvrir l'onglet) + on durcit quand même le retour visuel à l'entrée du mode. S'il échoue, fix du handler avant tout le reste.

### A5 · Eau dans l'inventaire — confirmé au code
- [ ] `ID.Water` : `hard: 0,15`, aucun `drop` défini → casser un bloc d'eau donne l'item Water. Aucun sens (la chaudière et la bouteille existent pour ça). Fix : les fluides (Water/Lava) ne donnent RIEN au minage; la collecte reste Bucket (scoop en place, game.ts remplissage) + Bottle à la source si absent.

### A6 · Modèles en main + items hors-sujet — audit FAIT, modèles LIVRÉS (B8, 2026-10-30)
- [x] Couverture mesurée (simulation des branches de `buildStudsItem3D` sur les 470 ids) : 88 ids en branches dédiées + catégories (outils par `d.tool`, Teks par teksGeo, fioles, seaux, lingots, gemmes, nourriture, rods) — **109 items tombaient sur la tuile plate générique**. Les bouteilles AVAIENT déjà leur fiole; les vrais trous : Seeds, armures, véhicules, livres, disques…
- [x] **B8 modèles livrés** (section 4b2 dans `buildStudsItem3D`, mêmes maths, zéro texture) : armures par slot (`d.armor`/`armorSlot`, ~30 pièces), pochette Seeds/Wheat, Boat, Cart, Saddle, Compass, Clock, Map, Paper, Book/EnchBook/Tome, les 5 Discs, Shears, Firework, DragonEgg, WitherSkull, Horn, Lead/String, NameTag, Feather, Fang, Antler, Scale, Cinder, Frost, Slime, ShulkerShell, Eye, Totem, RawIron/Bronze/Flint, et les petites matières en tas (Powder, Wisp, BaseBrew, Wart, Shell, GravelBar, InkSac). Restent sur la tuile : les états (Open door, Lit lamp…) jamais tenus tels quels, et Night switch (état du Solar). Portes : tsc 0, tests 66/66, build OK. Fermeture = son œil sur Pages.
- [ ] Items sans rôle : le scan de références (tout `src/game` hors blocks.ts) ne trouve AUCUN orphelin complet hors l'ensemble redstone déjà retiré (B5/B7, drops → pellets) et les variantes d'escaliers (logique générique `d.stairs`). **Aucun retrait proposé sans sa liste** (règle suppression). Reste ouvert en dette : le graphe d'accessibilité Survival complet (chaque item atteignable par drop/recette/loot/quest) — à mesurer en rig dédié.

### Ordre d'exécution (claim Muse, 2026-10-30)
B1 studs (A1) → B2 eau (A5) → B3 bouton Build selon verdict qa-touch (A4) → B4 kiln visible + recettes Teks générées (A3) → B5 retrait redstone (A2) → B6 bulle de nom (ajout de Philippe 16h01) → B7 interrupteurs re-logic (précision de Philippe 16h03) → B8 modèles en main + liste items (A6). Fermeture de chaque ligne = mesuré + retest Pages de Philippe.

### B13 · Retours A54 de Philippe en direct (2026-10-30 20:31, 6 captures) — LIVRÉ `d479f88a`, fermeture = son retest après RECHARGEMENT de la page

Diagnostic d'abord : ses captures 1–2 montrent la bannière « No internet connection » — son onglet roulait une copie HORS-LIGNE chargée avant plusieurs déploiements (le catalogue sans les natives prouve une copie d'avant P-B `64fb2042`). Deux de ses six points sont ce cache, pas le code courant — PROUVÉ par mesure : repro statique au format A54 (915×412) avec le CSS réellement construit + le DOM réel du panneau = **0 débordement** sur les 3 familles d'icônes (cube PNG, teks PNG, SVG), grille et barre du panneau; et `catalogueList()` inclut les natives inconditionnellement (Starter Buggy + Rig Digger).

- [x] **Pilule de nom sur l'icône** : le nom de l'item sélectionné apparaît dans une petite pilule au coin supérieur droit DE L'ICÔNE (`.sc-name-pill`) — grille du sac (sélection `hud.cursor`) + barre du panneau (slot actif). La bulle B6 en haut du panneau reste.
- [x] **Menu pause réparé** : sur écran court (≤460 px de haut) la carte pause dépassait l'écran centré → logo croppé en haut, boutons coupés en bas. Bloc compact dédié : logo 104 px, boutons 42 px, gaps réduits, écran défilant en filet de sécurité.
- [x] **Deuxième joystick en mode construction** : le stick gauche = position (caméra de construction, déjà branché), NOUVEAU stick droit « Pivot » = rotation de la pièce en main (horizontal = yaw A/D, vertical = pitch W/S, pas répétés en maintenant; mêmes `rotatePart` que les touches). La rangée de lettres reste pour le roll Q/E.
- [x] **Spawn toujours sur grass** : `findSpawn` exige maintenant un dessus en `ID.Grass` (passe 1 : grass + terrain doux; passe 2 : grass élargi r≤150; repli historique seulement si le monde n'a aucun grass).
- [x] **Icône du Godet 471** rendue par le pipeline B12 (même géométrie, même loi métal) — P5c est complet en code + assets.
- [ ] **Débordement d'icônes + catalogue vide** : copies périmées chez Philippe (voir diagnostic) — fermeture = son retest après fermeture/réouverture de l'onglet. Si ça persiste après reload, c'est un vrai bug et on repart de sa capture fraîche.

### B14 · Rapport du testeur externe de Philippe (2026-10-31) — LIVRÉ `a3ee5fb3`, fermeture = verdict du testeur + Philippe

Un testeur IA mandaté par Philippe a passé le jeu au crible (browser, SwiftShader ~1 fps — performances et conduite non jugées par lui). Chaque point vérifié au code et, quand il le fallait, MESURÉ par sonde de rendu (vraie géométrie + vrai atlas + vrai shader, hors jeu complet) :

- [x] **CRITIQUE — une pile de briques soudées flottait dans le vide** : CONFIRMÉ au code. La graine d'intégrité comptait les briques dessous comme ancrages (`studQuadrantCovered` acceptait briques + voxels) : chaque brique de la pile était « ancrée » par la suivante, et la soudure ramenait l'appui à celle du bas — la pile se tenait elle-même. **Correctif : seule la matière voxel ancre** (`voxelStudsBelow`); les briques PROPAGENT (extrait pur `supportCant` dans `src/game/weld.ts`, `computeIntegrity` n'est plus qu'un adaptateur). Le passage poids reste sur `studsCoveredBelow` inchangé. Tests `weld.test.ts` +6 — pile soudée sans graine = 0 tenue, avec base au sol = tenue, porte-à-faux plafonné à 2, soudure = coût égal par-dessus le plafond. Suite 110/110.
- [x] **Tenons beiges sur brique rouge** : CONFIRMÉ et MESURÉ, mais pas à l'endroit pointé par le testeur. L'atlas au centre du tile Red = (242,90,70) (rouge franc, mesuré sur le vrai atlas) et `brickGeo` échantillonne juste — brique réplique rendue hors jeu = tenons rouges sous Lambert ET Standard nus. Le coupable = le **coat studio du shader SRN** (`sirenizeWorld`) : additif quasi-blanc, il couvre toute la surface visible des petits tenons courbes — tenon mesuré (218,143,136) beige-saumon contre (229,92,64) sans coat. **Correctif chirurgical** : le shader détecte déjà les tenons (`srnOnStud`) → nouvel indicateur `gSrnStud`, coat ×0,30 et SSS ×0,65 sur les tenons seulement (le corps garde le satin complet). Re-mesuré par la même sonde, brique alignée au réseau comme en jeu : tenons (210,105,92) / (225,104,81) — le rouge domine de nouveau. Cache shader v6→v7.
- [x] **`weldAt` ne marquait pas `weldBeadsDirty`** : corrigé — les rigs voient le cordon dès la pose du crochet (le jeu réel, lui, passait par la torche et était correct — le testeur s'en est d'ailleurs rétracté sur ce point).
- [x] **Compteur `falling` de `getIntegrity`** : compte maintenant les membres des groupes soudés en chute en plus des briques libres.
- [x] **Aucune garde NaN sur la position du joueur** : garde ajoutée avant la physique — position non finie = retour au spawn, vitesses zéro.
- [x] **Verre en main = brique blanche opaque** : la branche générique des blocs plaçables de `buildStudsItem3D` construit en `skin()` opaque; Window (Glass) et Ice passent maintenant par des matériaux transparents (opacity 0,45, depthWrite off).
- [x] **Par design (pas des bugs, répondus au testeur)** : les cisailles coupent les soudures — c'est LA règle P2 (une brique soudée refuse le minage normal, les cisailles sont l'outil de déssoudage); et un membre de groupe dont la case d'atterrissage est occupée tombe en item au sol — la matière n'est jamais perdue, c'est le repli consigné de P2.
- [ ] **`worklog2.md` ligne 12 (« Tab = pose libre »)** : journal historique de la session de Grok (Tab toggait alors son freePlace); aujourd'hui Tab ouvre le mode construction. Non réécrit par Muse (journal d'un autre agent) — à corriger par Grok ou au ménage §18.
- [ ] **Non testé par le testeur (son navigateur sans GPU)** : performances, véhicules en jeu, four, manette, tactile; bouton « Save & quit » non trouvé par lui — retour au monde non vérifié de son côté. Ces verdicts restent à Philippe / aux rigs.

---


### B15 · Rapport du testeur externe #2 (2026-10-31) — LIVRÉ `0634fd2c`, fermeture = retest du testeur + verdict de Philippe

Le testeur a repassé le jeu complet et **confirmé les correctifs B14 en ligne** (pile soudée, couleurs de tenons, Save & quit). Il a photographié **472 objets en main : 205 OK, 234 PLACEHOLDER, 29 MAUVAIS_MODELE, 3 MANQUANT** (table CSV livrée par Philippe; sa marge d'erreur déclarée : quelques objets). Chaque point revérifié au code; les comptes recalculés par scripts sur les vraies données (recipes.ts / blocks.ts / teks.ts importés en node). Portes du lot : tsc 0, suite 110/110, catalogue 7/7, eslint teks.ts propre, build OK.

**Craft**
- [x] **Collisions d'ids de recettes** CONFIRMÉES (exactement 3 sur 375) : `plate` (l'armure Shell volait le bouton de la Pressure plate), `cookie` (Ash cookie = même id que Cookies — les deux donnent ID.Cookie, le correctif est l'id unique, pas un nouvel objet), `hub` (Hub simple vs Teks Hub 4 ports) → renommées `shell` / `ashcookie` / `hub4`. Revérifié par script : 0 doublon.
- [x] **Recettes à la poudre rouge retirée (B5)** CONFIRMÉES (exactement 3) : Compass + Clock → centre en **Résine** (précédent B5 : le Chime), Launcher → **Poudre** (lecture propergole), descriptifs mis à jour. Revérifié : 0 référence à ID.Dust dans les 375 recettes (besoins + grilles).
- [x] **craft() ignorait l'établi** CONFIRMÉ : le contrôle 3×3 n'existait que dans `fillGrid` (grille manuelle); le craft du livre passait outre — **178 recettes sont 3×3** (mesuré; le testeur en comptait 162). Porte ajoutée dans `craft()` : forme >2×2 sans le panneau bench ouvert = « Needs a 3×3 Crafting Bench », même règle et même message que fillGrid.
- [x] **Re-craft d'outil = réparation gratuite** CONFIRMÉ : `give()` réassigne `inv[id] = maxUse` pour les outils — recrafter un outil déjà porté le remplissait en brûlant les matériaux. Refus net dans `craft()` quand l'outil est déjà porté (« You already carry a … »), avant tout paiement.
- [x] **Deux objets nommés « Spark »** CONFIRMÉ : l'outil durable 143 (ID.Flint) renommé **Striker** (def + nom de recette); le consommable 342 garde « Spark » (l'étincelle qu'on frappe et qu'on dépense, `game.ts` strike).
- [x] **Grilles ≠ ingrédients** : 3 écarts mesurés par script (le testeur en annonçait 4) — executioner-axe (grille 2 bâtons vs besoin/descriptif 1 : grille corrigée), guardian-plate (grille 5 pointes + 3 écailles vs 4 + 2 annoncés : grille refaite en cuirasse 4/2), remote (la grille mettait l'ancien Hub 398 au lieu du Teks Hub 446 des besoins : corrigée). Revérifié : 0 écart grille/besoin sur les 375 recettes.
- [x] **Lint teks.ts** CONFIRMÉ : exactement 2 erreurs (expressions à virgule, lignes 712 et 1338) + 3 warnings (YEL/ORG/GRN déstructurés inutilisés) → corrigées; eslint exit 0.

**Main (`buildStudsItem3D`) — 263 objets signalés, traités par familles**
- [x] **Teks minuscules (101 objets)** : le coefficient d'échelle en main passe de 0,11 à **0,19/module**, plafond 0,85 → 1,0 — la PROPORTION par module (loi de Philippe 2026-10-29) est inchangée, une pièce d'1 module ≈ la taille d'un bloc en main. Les 3 variantes d'état (Crank (turning) 350, Clutch (open) 352, Driving ring low 366) montrent la géométrie de leur pièce de base (349/351/365) au lieu d'un cube.
- [x] **Nourriture (19)** : la plaque à tenons générique est remplacée — silhouettes par aliment (pomme étagée, poisson + nageoire losange, pain bombé, cookie + pépites, tranches + croûte, miel en pot, ragoût en bol, tarte lattée, carotte conique, patates, betterave) et un plat « servi » (assiette + monticule) pour le reste. **Aucun aliment ne porte de tenons** — c'était la signature « placeholder ».
- [x] **Lingots/métaux** : barre étagée **sans tenons** (la grille de tenons la faisait lire comme une tuile); Bronze déplacé des « morceaux bruts » vers les lingots; Plastic ingot (402) + Tempered ingot (403) ajoutés à la branche.
- [x] **Armures (32)** : la coque n'était qu'une plaque plate — chaque slot gagne de la profondeur (rebord au casque, plaque dorsale + épaulières à la coque, ceinture + genouillères aux jambes, protège-tibias aux bottes). Les slots étaient propres (1/2/3/4 vérifiés sur les 32 defs).
- [x] **Plantes et produits (20)** : les plantes plaçables tombaient dans le constructeur de cubes — branche dédiée (champignons à chapeau, fleurs, buisson à baies, blé jeune/mûr, tiges grimpantes, cultures avec le légume visible à la base, touffes de pousses sur motte) + citrouille/melon ronds au lieu de cubes.
- [x] **Variantes d'état de blocs (11)** : Water, Open door, Lit lamp, Pusher, Open gate, Plate down, Magma, Launcher, Packed ice → leur bloc en main, propres couleurs (transparence pour Water, émissif Lit lamp/Magma); Lever on → un levier complet.
- [x] **Composants retirés (7)** : Red dust / Lit red dust → pincée de poudre; Repeater / Comparator / Night switch (+ variantes allumées) → dalle à mini-torches.
- [x] **Petits objets dédiés** : Scarab relic (un scarabée d'or — il rendait comme un lingot), Eye of ender (orbe + pupille, retiré de la branche gemmes), Nether star (étoile croisée + cœur lumineux), Plastic pellets (poignée de billes), Fuel (bidon à poignée), Spark (braise émissive), Glide shell (coquille éventail), Fur/Pelt (peau pliée), Wax (bloc de cire), Wax seal (disque scellé debout), Shell chip (éclats — la branche « tas de poudre » l'avalait), Striker (barre d'acier coudée + pierre), Welding torch (poignée + col + buse + flamme vive), Antler bow (branche de l'arc partagée), disques (debout comme un vinyle tenu par le bord — ils gisaient à plat et se voyaient par la tranche), Dragon egg (ventre renflé + écailles).
- [x] **Crossbow « trop gros »** CONFIRMÉ par le calcul : l'affichage outil normalisait par la HAUTEUR — le crossbow (0,31 de large × 0,053 de haut) explosait à ~6× la largeur d'une pioche à l'écran. Plancher de longueur à 60 % de la plus grande dimension dans le chemin outil de `placeHeldMinecraft`; les outils hauts (pioche, épée, hache, torche droite) ne changent pas.
- [ ] **Torches invisibles (32/193/194)** : NON reproduit au code — la branche torche construit un modèle complet (bâton, col, flamme sculptée), ids et constantes vérifiés, chemin d'affichage « upright » dédié dans le pipeline outil. Le banc local n'a pas pu démarrer le jeu complet pour photographier la chose (machine saturée par d'autres chantiers, SwiftShader ~1 fps). Aucun correctif aveugle appliqué. Fermeture = retest du testeur; si ça persiste, sa capture exacte décidera.
- [ ] **Signalés mais déjà modélisés au code** (bateau, livre, boussole, horloge, carte, tome, corne, laisse, étiquette, plume, croc, écaille, slime, coquille de shulker, oeil, totem, tas de poudres, gemmes, potions, lit/Bunk = ID.Bed) : branches dédiées existantes — lecture « placeholder » possible à ses captures minuscules (sa marge d'erreur déclarée). Plastic axe / Tempered plastic axe : même branche validée OK pour les autres haches du même set — bruit de classification suspecté. Fermeture = son retest.

**Catalogue**
- [x] **Starter Buggy chargé 3/11** CONFIRMÉ et expliqué au quart de module près : les `dq` des modèles sont relatifs au HUB — les roues du Buggy vivent à dq y = **−7**, les poutres à **−5**; l'ancre de chargement était au niveau des PIEDS du joueur → 8 pièces naissaient dans le terrain et `tech.test` les refusait. Ne passaient que hub (0), moteur (+7) et batterie (−1) = exactement les 3 du testeur. **Correctif : l'ancre est posée au sol** (hauteur de surface au point visé, la pièce la plus basse du modèle affleure le premier bloc d'air), puis levée bloc par bloc (≤3) en gardant la hauteur où le plus de pièces passent. Le compteur placé/hologrammes était déjà affiché au joueur (`say`).
- [x] **Rig Digger « sans joints, sans godet »** : même racine — sa base enterrée empêchait l'assemblage de se former (les joints naissent à la conversion en véhicule). Avec l'ancre au sol, les 19 pièces d'origine passent sur terrain plat.
- [x] **Rig Digger « sans capteurs »** : vrai par construction (le modèle intégré date de P5c, avant les capteurs P5d) → **SensorDist 472 ajouté** au modèle (miroir du moteur); validé par le test de conversion du catalogue : véhicule complet, 0 pièce manquante, 20 pièces. À binder au canal de conduite par sneak+use pour armer l'arrêt obstacle.
- [ ] **Marchand** : non testé par le testeur (aucun village trouvé de son côté) — le rig `qa-vendor` reste dû.

### B16 · Retest #3 du testeur (build `eabec77f`, 2026-10-31) — LIVRÉ `5436dc21`, fermeture = retest du testeur + verdict de Philippe

Le testeur **confirme en jeu les correctifs B15** : recettes et doublons réglés (Pressure plate, Ash cookie, Teks Hub 4, Compass, Clock, Launcher craftent), porte établi complète (aucune des 178 recettes 3×3 sans l'établi, toutes avec), **Starter Buggy 11/11, converti, roule**, modèles bateau/livre/boussole/horloge présents. Son nouveau chiffre CSV (230 « carrés flottants ») est déclaré **non fiable par lui-même** : sa comparaison automatique ne repère que les invisibles, ~10 objets revérifiés à l'œil; les reworks visuels B15 (aliments, lingots, armures, plantes, disques, Teks en main) restent donc **non revérifiés à l'œil** — il offre une passe visuelle complète. Portes du lot : tsc 0, suite **111/111** (nouveau test de placement inclus), build OK.

- [x] **Torches 32/193/194 invisibles, bras compris** CONFIRMÉ avec mécanisme mesuré : l'exception « upright » de `placeHeldMinecraft` (translation sprite 0,5, rotation −30°) plaçait la poignée à NDC x ≈ 0,75 en 16:9 et **1,01 en 4:3**, contre 0,55 pour une pioche (sonde three.js de la chaîne matricielle réelle). Le bras pend à la poignée : les deux sortaient du cadre — son hypothèse « dessinés hors de l'écran, à droite » était exacte. **Correctif : exception supprimée**, les torches prennent l'affichage diagonal standard de tous les outils; sonde après coup : poignée identique à la pioche aux formats 2,22 / 1,78 / 1,33, modèle dans l'enveloppe de la pioche.
- [x] **Crossbow presque entièrement hors cadre à droite** CONFIRMÉ : le plancher B15 (0,6 × la largeur) laissait l'échelle à f ≈ 6,2 contre 3,1 pour une pioche. **Correctif : la longueur de normalisation est la plus grande dimension du modèle** (pour les outils hauts, c'est la hauteur — inchangés); sonde : enveloppe ≈ celle de la pioche.
- [x] **Rig Digger 16/20, 4 hologrammes, bras déconnecté** CONFIRMÉ et reproduit en simulation avec la vraie loi de placement : les **4 servos** du modèle intégré violaient `TechWorld.test` — cellules chevauchant celles d'un voisin **sans accouplement axe-trou** (S1 contre le moteur, S2 et S3 contre les Liftarm11, S4 contre le Liftarm7) → refusés au chargement; le bras placé restait hors de la composante du hub (12/20, 0 joint). Le test du catalogue ne le voyait pas : il convertissait la liste **brute** (`add` sans `test`) — une passe par procuration. **Correctif : servos déplacés, orientations inchangées** — S1 `[0,7,0]` o4 → `[−2,12,4]` o4; S2 `[10,15,0]` → `[10,15,−4]`; S3 `[26,19,0]` → `[26,19,4]`; S4 `[38,15,0]` → `[38,18,−4]` — chargement ordonné **20/20**, composante stricte du jeu (tolérance 0,06 bloc) **20/20**, chaîne de joints série **0→1→2→3→4**. **Nouveau test « built-in models PLACE »** (`catalogue.test.ts`) : rejoue la loi réelle (placement `test()` + ancrage au sol + composante) pour chaque modèle intégré — il échouait avant le correctif, il passe après; la classe de bug ne peut plus passer en silence.
- [x] **Recette liftarm5 : grille ≠ forme** CONFIRMÉ : `w:3, h:2` déclarés (6 cases) pour une forme de 5 — un blob 3×2 pour une poutre 1×5. Seul cas sur 375 (balayage complet : longueur de forme vs w×h ET comptes; le contrôle B15 ne comparait que les comptes — la leçon est consignée). **Correctif : liftarm3 + 2 planches en rangée 3×1** (le patron du liftarm7; la grille du jeu plafonne à 3×3, une rangée de 5 y est impossible; matière totale inchangée : 3+2 = 5 planches).
- [x] **Leaf brick sans recette — pire : sans AUCUNE source** CONFIRMÉ : `drop = −1`, casser des feuilles ne paie que pommes (8 %) / bâtons (12 %), même au silk, et la recette du Sapling **consomme** une Leaf brick (recette morte). **Correctif : les cisailles (ou un outil silk) sur les feuilles récoltent le bloc lui-même**; à mains nues, fruits et bâtons comme avant.
- [x] **Garde anti re-craft d'outil — code CORRECT, test invalide** : le testeur a testé établi fermé; dans `craft()` le refus « Needs a 3×3 Crafting Bench » précède la garde (ordre voulu : la recette est d'abord infaisable). Procédure de retest : établi ouvert + outil déjà porté → « You already carry a … » et aucun matériau dépensé.

### B17 · Véhicule/affichage (ordre de Philippe, 2026-10-31) — LIVRÉ `8394bed7`, fermeture = retest Pages (Grok) + verdict de Philippe

- [x] **Digger impossible à embarquer** : capteurs sur FRONT seulement (fini le niveau qui tenait hub/moteur à OFF entre les deux « use » d'entrée). Mesuré : avant 0/0 sur 6/6 + 6 échecs d'entrée; après 1/1 sur 6/6, embarqué en 2 pulsations, assis 10/10 sur 10 s, avance.
- [x] **Autosave en conduite** : `packSave` ne gare ni ne vide plus jamais un véhicule actif; sérialisation en place (poses de parcage, re-clé bindings/réserves/niveaux, `vehBucket` restauré au boot). Mesuré : sauvegarde écrite en pleine conduite, conducteur en place, les 20 pièces du Digger dans la sauvegarde (comptes par id revérifiés).
- [x] **Crossbow** : axe du modèle réaligné sur la diagonale des outils (pré-rotation sprite, crosse à la poignée) + prod du modèle perpendiculaire à la crosse (le modèle était une ligne 0,31×0,05×0,03, son prod colinéaire — aucun cadrage ne pouvait le sauver). Capture : arme entière, lisible, même famille que la pioche.
- [x] **Caméra conduite** : siège CALCULÉ à l'embarquement (`computeSeatEye` + `VPart.box`) : premier point derrière/au-dessus du hub dégageant chaque pièce ≥ 0,45 bloc et en air libre. Captures : avant = monde + pont sous l'œil + bras au-dessus; côtés/arrière ouverts. Fini l'écran noir.

## 22. Catalogue de véhicules + contrôles véhicule (ordres de Philippe, 2026-10-30 ~16h06-16h07 PDT)

### 22.1 Le catalogue (le modèle = une liste de pièces Teks relatives)
- [ ] **Format modèle** : un véhicule = la liste de ses pièces (id, orientation, position relative à une ancre) + nom + auteur. C'est le format que la couche Teks sauvegarde déjà — un modèle est un assemblage portable, rien d'autre.
- [ ] **Catalogue persistant HORS monde** : les modèles du joueur vivent dans un catalogue (stockage local du jeu, clé séparée des mondes) qui **survit à la suppression d'un monde**. Sauver le véhicule qu'on regarde/conduit dans le catalogue = un geste.
- [ ] **Véhicules préfabriqués** : un set de départ (buggy, camion, tracteur/excavatrice…) — assemblages VALides au sens de `vehicleFromAssembly` (hub + moteur + ≥2 roues), vérifiés headless avant d'entrer au catalogue.
- [ ] **Le vendeur spécial + le hangar** : dans CERTAINS villages, un **commerce** — un gros garage/hangar mécanique décoré (pièces exposées, véhicules en montre) avec un **vendeur mécanicien** qui vend les modèles préfabriqués (prix en matière : ingots + cuivre selon les pièces du modèle). Worldgen : le hangar est une structure générée comme les sites, le vendeur est un trader spécialisé.
- [ ] **Charger un modèle — la loi matière** : en **Creative**, le modèle se pose directement. En **Survival**, il faut AVOIR les matériaux (les pièces) : les pièces payées se posent pour vrai; les pièces manquantes se posent en **hologrammes transparents** (le modèle est incomplet, visible comme tel) et se complètent plus tard quand le joueur a les pièces (le geste « compléter » remplit les hologrammes restants). Un hologramme n'est ni solide ni conduisible tant qu'il manque des pièces structurelles.
- [ ] **Publier en ligne** : phase 1 = codes de partage (le modèle encodé en texte, copiable/collant — aucun serveur requis, le catalogue importe un code). Phase 2 (serveur) : publication dans un catalogue en ligne partagé entre joueurs — requiert le backend, à brancher sur l'infra existante quand elle sera choisie. Ne jamais simuler un en ligne qui n'existe pas.
- [ ] **Modifier** : un modèle chargé redevient un assemblage ordinaire (on ajoute/retire des pièces), re-savable au catalogue sous le même nom ou un nouveau.

### 22.2 Contrôles véhicule (même ordre — LIVRÉ en code 2026-10-30, B9 : bouton Drive/Park + cluster de conduite tactile; fermeture = verdict Pages de Philippe)
- [ ] **Bouton Entrer/Sortir** : un bouton dédié (tactile : visible quand on vise un hub conduisible, et pendant la conduite pour sortir) — l'entrée/sortie ne doit plus dépendre seulement du geste « use » sur le hub et du parcage au sneak. Clavier/manette gardent use/parcage; le bouton appelle le même geste.
- [ ] **Commandes adaptées au véhicule** : en conduite tactile, le cluster d'actions devient un cluster de conduite (gauche/droite, gaz/frein, parcage) au lieu des boutons miner/poser qui n'ont aucun sens au volant. Le stick de marche peut rester le volant, mais les boutons dédiés sont la référence.

### Phasage (claim Muse à l'inscription)

**P-A LIVRÉ (code `d2dac6fc`, déployé; portes tsc 0 / tests 71/71 à la livraison, 72/72 après P-B) :** module `catalogue.ts` (modèle = liste de pièces relatives à une ancre hub/coin-min, catalogue localStorage `studs.catalogue.v1` HORS mondes, bill de matière, codec de partage texte `STUDS-MODEL:`); côté jeu : registre d'**hologrammes** persisté dans la sauvegarde (champ `blueprints`), chargement ancré devant le joueur (Creative = tout placé; Survival = pièces possédées placées + `spend`, le reste en hologrammes translucides NON solides et NON conduisibles — absents de `tech.parts`, donc invisibles pour `techComponent`/`vehicleFromAssembly`), **complétion** par le geste « use » en visant un hologramme (consomme la pièce en Survival); UI : écran « Vehicle catalogue » au menu pause (liste, charger, code de partage, supprimer, sauver le build visé/conduit). **P-B LIVRÉ (`64fb2042`) :** préfabriqué « Starter Buggy » (la géométrie exacte assemblée par les rigs P5b) intégré au catalogue comme modèle built-in non supprimable, validé headless par `vehicleFromAssembly` (test catalogue 6/6 : conversion complète, zéro pièce manquante). **P-D : substantiellement livré dès P-A** (le panneau expose déjà Share code / Import). Reste : rig `qa-catalogue` en jeu (persistance inter-mondes, chargement 11/11, hologrammes 11, complétion) + P-C (vendeur + hangar). Fermeture = rig + verdict Pages de Philippe.
P-A format modèle + catalogue local persistant + sauver/charger (Creative direct, Survival matière + hologrammes) → P-B préfabriqués + contrôles véhicule (§22.2) → P-C vendeur + hangar worldgen → P-D partage (codes, puis serveur). Fermeture par phase = mesuré + verdict Pages de Philippe.

**P-C EN COURS (claim Muse, 2026-10-30 ~19h30, ordre de Philippe) :** rôle de marchand « mechanic » (quests.ts TRADERS : offres pièces Teks contre matière + section spéciale préfabriqués dans son panneau); **hangar-garage en worldgen** : annexe à l'est du village (`stampVillage` : pad nivelé 16×18, murs pierre, grande ouverture côté village, toit, établi/four/coffres, aire de livraison) + spot du mécanicien dans `folkLayout` (+ backfill des sauvegardes existantes, patron mage/ranger — les vieux mondes gagnent le vendeur, pas le bâtiment); **achat d'un préfabriqué** : prix = coût de fonderie réel du modèle (ingots + cuivre des électriques, la table de coûts B4), paiement depuis l'inventaire, livraison = l'assemblage placé devant le joueur (même mécanique que le chargement catalogue, branche tout-placé) — jamais d'argent fictif, refus net si fonds ou place insuffisants; **buggy d'exposition** (sans batterie) placé par game.ts à la création d'un monde neuf devant le hangar. Rig dédié `qa-vendor`. Fermeture = portes + rig + verdict Pages de Philippe.

---

## 23. Dossier juridique — lignes rouges marques (apportées par Philippe, 2026-10-30 ~16h27 PDT)

Le jeu est 100 % procédural / 0-asset (maths SRN/SDF, aucun modèle, aucune texture, aucune bibliothèque de pièces externe) : le copyright d'assets est déjà blindé. Tout se joue sur les **marques** (trademarks, marques 3D, trade dress). La brique de base à tenons est dans le domaine public (brevet expiré; Kirkbi c. Ritvik / Mega Bloks, Cour suprême du Canada; jurisprudence européenne : une forme purement fonctionnelle ne se monopolise pas en marque). « Studs » et « Plastic » sont des termes descriptifs génériques — le titre **Studs - Plastic Edition** est sûr tant que la typographie ne copie pas la leur.

### Lignes rouges (zéro exception)
- [ ] **ZÉRO figurine classique** : la silhouette de la figurine (tête cylindrique jaune + tenon, torse trapézoïdal, **mains en pince C**) est une marque 3D active. **CONSTAT 2026-10-30 : le personnage actuel VIOLE cette ligne** — `makeFigure()` (ex-makeMinifig) construit une figurine classique, et le bras première personne (v4.13) est une main en C sur wrist pin, jaune. Chantier prioritaire : nouveau design de personnage (proportions différentes — tête cubique/sphérique, robots de briques, mains non-C) à décider avec Philippe, PUIS remodeler perso + bras + tous les usages. Ne pas déclarer le jeu « blindé » tant que ce chantier n'est pas fermé.
- [x] **ZÉRO mot interdit dans le code** (fait 2026-10-30, voir WORKLOG) : les mots LEGO / Duplo / Bionicle / Technic / Minifig bannis du titre, des descriptions, des balises SEO, des noms de variables/fichiers du code, des vidéos promo. Vocabulaire de remplacement : « briques de construction en plastique », « blocs emboîtables », « voxel à tenons », **Teks** pour le système mécanique/électrique (ex-Technic). Périmètre appliqué : tout `src/`, noms de fichiers, les 99 icônes renommées, champ de sauvegarde migré (`teks`, fallback lecture de l'ancien nom pour les mondes existants). Le WORKLOG historique n'est pas réécrit (journal daté); le plan, si (document vivant). Exception assumée : la présente section nomme les marques pour énoncer la règle, et une citation datée de Philippe (loi redstone §9/§21) garde ses mots d'origine entre guillemets.
- [x] **ZÉRO texte sur les tenons** : nos studs sont déjà lisses et CREUX (studs « hollow » du brickGeo/mesher) — aucun lettrage. Conforme aussi au tweak « creux au centre » ci-dessous.
- [ ] **ZÉRO pièce spéciale récente / design de boîte officiel** : briques standards libres (2×4, 1×2, plaques, pentes classiques); les pièces moulées récentes spécifiques (casques, armes moulées, mécaniques complexes récentes) restent sous design patents — nos pièces Teks sont des formes mécaniques génériques (poutres, axes, engrenages, pins) générées par maths; garder ce cap, ne jamais copier un set commercial.
- [x] **Code couleur des connecteurs = LE NÔTRE** (fait 2026-10-30, B10 puis **corrigé par SA directive finale ~16h43** : « Laisse faire le jaune pis l'orange. Je veux métallique gris, mais un gris qui nous appartient ») : le code standardisé adverse (pin long bleu, friction noir, sans-friction beige, axe court rouge, bush jaune) est remplacé dans `teks.ts` (COL + specs) et `blocks.ts` (couleurs des defs) : **Pin 3L + AxlePin + Axle 2 = gris métal foncé DGM #3d454e**; **Pin 2L friction = ÉMERAUDE** (code à nous); **pins sans friction = BLANC**; HalfBush gris. Les 99 icônes sont re-rendues depuis la géométrie (pipeline : `~/workspace/studcraft-work/render-icons.mjs` + entrée vite temporaire; cadrage iso uniforme pour tout le set).
- [x] **Moteurs + boîtier batterie restylés + LOI MÉTAL** (fait 2026-10-30, B10→B11/B12, directive finale de Philippe) : fini les carters gris type Power Functions et le bouton vert. Toute la famille électrique (Motor M/L/XL, Servo, Hub, Battery, Remote) passe en **boîtier NOIR + dessus GUN #71808f — notre gris signature, acier bleuté**, jauge de charge **LED bleue** sur la batterie (+ poussoir sombre), boutons hub/remote LED bleue, sliders remote DGM. **Et le fini lui-même change de catégorie : `techMatStd` passe à metalness 0.85 / roughness 0.24 / envMapIntensity 0.9** (fallback non-réaliste : Phong spéculaire, le Lambert moderne n'ayant plus de spéculaire) — UN seul matériau, donc pièces posées, véhicules et pièces en main deviennent de la **quincaillerie métallique luisante** pendant que les briques restent plastique satiné : la rupture ABS mat vs métal anodisé/acier est elle-même la protection (analyse de Philippe). Icônes re-rendues avec le matériau métal + environnement de reflets (preuves lues : dessus moteur acier brossé, boss métal brillant, pin 3L gunmetal foncé). Portes tsc 0 / 66/66 / build OK.
- [x] **AUDIT LICENCES + PROVENANCE — RIEN ne peut forcer l'ouverture** (fait 2026-10-30, Muse, sur sa demande « vérifie qu'on a rien qui pourrait nous forcer à être open ») : (1) **Géométrie** — zéro fichier .dat/.obj/.gltf/.glb/.fbx/.blend/.ldr/.mpd/.io dans les 619 fichiers du repo; tout est maths (SRN/SDF), aucun import LDraw/Mecabricks/Studio; le commentaire qui nommait « BrickLink/LDraw » dans teks.ts est nettoyé. Les numéros de pièces des specs = données de référence inertes (jamais affichées; la géométrie vient des dimensions). (2) **Licences** — balayage des 414 paquets installés : 346 MIT, 26 ISC, 21 Apache-2.0, 13 BSD, Python-2.0, Unlicense, 0BSD — **ZÉRO GPL/AGPL/LGPL/SSPL/BUSL**. Seuls exceptions anodines : lightningcss MPL-2.0 et caniuse-lite CC-BY-4.0, **build seulement, jamais livrés** (le MPL couvre le code de l'outil, pas sa sortie). Le bundle livré n'embarque que three.js + React (MIT) → **attribution ajoutée : `NOTICES.txt` livré à la racine du site** (dist-game vérifié); c'est la seule obligation du MIT, elle ne force aucune ouverture. (3) **Musique** — générations Suno de Philippe lui-même (2026-10-25); droits commerciaux selon son palier Suno à la génération (**à confirmer par lui**). (4) **Signalés (non bloquants produit)** : le PDF catalogue tiers est DANS le repo privé (jamais dans le bundle) — recommandé de le sortir au nettoyage §18 (suppression = son GO); `public/__grok/` (chrome plateforme Grok Build, logo Grok inclus) est déployé sur Pages — à retirer au §18; « Minecraft » ne survit que dans des commentaires du code privé. **Reste pour « 100 % clean » : le PERSONNAGE (ligne 1 — décision design de Philippe), le dessous des briques (ligne ci-dessous), la confirmation du palier Suno.**
- [x] **Dessous des briques — CONFORME, rien à ajuster** (vérifié au code par Muse, 2026-10-30) : nos briques placées (`brickGeo`) sont des **boîtes pleines fermées** (BoxGeometry issue de `fallerGeo`) + cylindres de tenons sur le dessus — le dessous est une **face plane texturée** : aucune cavité, aucun tube cylindrique, aucun motif d'accroche n'existe dans la géométrie, ni le leur ni un autre. Les blocs voxel du mesher sont des cubes pleins, même constat. On ne peut pas copier un motif qui n'existe pas chez nous; la face plane est maximalement distincte de leur dessous à tubes.
- [ ] **Trade dress** : logo = l'art approuvé de Philippe (écusson du jeu, esthétique industrielle/fonte — PAS le carré rouge texte blanc liseré); pas d'UI copiée des jeux officiels sous licence; monnaie/débris = notre vocabulaire (« Shards », « Pièces », « Plastique », « Studs » dans notre design); descriptions store : jamais « comme un jeu [marque] » — dire « jeu de destruction physique de briques en plastique procédurales ». Les joueurs/YouTubeurs peuvent prononcer le mot dans leurs commentaires, pas nous.
- Note de Philippe : architecture préventive — ne remplace pas l'avis formel d'un avocat marques si signature avec un gros éditeur.

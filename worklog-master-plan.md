# Worklog Master Plan — STUDS · Plastic Edition

**C'est LE document de travail du projet à partir du 2026-10-29 (décision de Philippe).**
Le master plan y est traduit et décortiqué en étapes avec des cases à cocher. On travaille À PARTIR D'ICI : chaque agent (Muse, Grok, Claude) prend ses étapes là-dedans, les claim, les coche. Le vieux `WORKLOG.md` reste le journal historique; `worklog2.md` reste la liste de Grok (ses items ouverts sont recopiés ici, sections Lag et Icônes).

Pitch : Minecraft, c'est un monde de cubes. Studs, c'est un monde de plastique — ça snap, ça fond, ça casse, pis ça tourne. Marché : builders adultes (AFOL), « le vrai jeu LEGO que LEGO a jamais fait ».

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

**« Tout construire ce qui est possible de construire en LEGO dans la vie réelle. TOUTES les pièces. »**
La bibliothèque de pièces converge vers le catalogue LEGO réel complet (System + Technic), mesurée PAR FAMILLE contre BrickLink/Rebrickable et le PDF déposé au repo (`Catalogue_Complet_LEGO_Technic_et_Accessoires_Minifigurines.pdf`). Critère d'existence d'un asset : **DÉFINI + MODÉLISÉ PAR LES MATHS (monde et en main) + ICÔNE GÉNÉRÉE de la même géométrie (transparente, fidèle) + ACCESSIBLE en jeu**. Sinon, il n'existe pas.

---

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
  - [ ] P2 résidu : cordon de soudure VISIBLE rendu au joint
  - [ ] P2 résidu : un groupe soudé non ancré tombe D'UN BLOC (une seule pièce rigide), pas brique par brique

## 4. P6 · La Fonderie — la boucle centrale

Casser → plastique (rendement par bloc, les mobs en droppent) → fondre → couler dans des MOULES débloqués par quêtes (R1) et boss (R2/R3). Le crafting reste, basic seulement. **P3 · Trempe est intégrée ici** (couler en plastique trempé = grade supérieur du même moule).

- [x] Étape 1 : pellets (401), lingot (402), 9 moules de couleur (qa105)
- [x] Étape 2 : trempe — lingot trempé (403), briques trempées (410–418) (qa106)
- [x] Étapes 3–4 : moules d'outils — outils plastique (404–407) et trempés (419–422) coulés, pas craftés par paliers de minerai (qa107/qa108)
- [x] Étape 5 : 4 moules de boss (fang/cinder niveau 12, tidal 16, void 22) — lingots trempés + charge signature (tests 42/42)
- [x] Étape 5b : moules guardian (16 → GuardianPlate) + pharaoh (12 → PharaohCrown) (tests 44/44)
- [x] **qa111 PASS COMPLET** : les 6 moules de boss mesurés en jeu (témoins 350/325/600/775/475/425, 0 erreur)
- [ ] Fermeture P6 : retest Pages de Philippe → File de verdicts (§13)
- [ ] Moules rares : la boucle se ferme par le donjon R3 (§8)

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

## 7. P5 · Couche Technic 1:1 (le relais de Claude — logique vraie grandeur)

`technic.ts` = logique pure (aucun three.js) : 99 pièces avec leurs vrais numéros LEGO, couleurs et dimensions du PDF; grille d'assemblage au demi-module; règles d'ajustement vraies (un pin rond n'entre JAMAIS dans un trou en croix); moteur d'engrenages (ratios réels, vis sans fin, moteurs, manivelle, détection de bourrage).

- [x] `technic.ts` livré par Claude (1 048 lignes, constantes réelles : alésage 4,85/16 mm, pas = dents/16) — tests 3/3 revérifiés indépendamment
- [x] Étape 1 : `technicGeo.ts` fidèle (Muse) — 99/99 pièces, géométrie valide (0 NaN, volumes > 0, trous RÉELS prouvés par le volume, 62 100 triangles au total)
- [x] Étape 5 : vraies couleurs (Muse) — 99/99 corrigées du PDF (celles de Grok étaient inventées), bijection TECHNIC ↔ SPECS prouvée
- [x] Étapes 2+3+4 : câblage (Muse) — couche Technic dans game.ts (une Mesh par pièce, géométrie cachée), pose/raycast/minage minuté (la pièce revient toujours, les deux modes), rotation R + bouton tactile, rotation calculée par le moteur de technic.ts seulement, règle d'alimentation (un moteur tourne ssi un hub/batterie ALLUMÉ du même assemblage), conversion des vieilles sauvegardes sans jamais perdre une pièce
- [x] Étape 6 : icônes (Muse) — 99/99 PNG 160×160 transparents rendus DE la géométrie du jeu (même matériau Lambert vertexColors), fallback SVG si un PNG manque
- [x] Étape 7 : QA navigateur (Muse) — pose PASS, ratios **−1/3 exacts** (8T→24T), alimentation moteur PASS complet (14,137 rad/s = Motor M 135 rpm exact), minage Créatif PASS, icônes 99/99 en jeu, **0 erreur JS**
  - [ ] Étape 7 reste : sauvegarde aller-retour MESURÉE (méthode prescrite : session courte, pause→reprendre — jamais par reload; script `qa7h-save.mjs` prêt)
  - [ ] Étape 7 reste : minage Survival mesuré (le chemin Créatif est prouvé)
  - [ ] Échelle en main PROPORTIONNELLE + main qui serre la pièce (décision de Philippe 2026-10-29, poussé `dad9180d`) *(en attente verdict Philippe)*
- [x] Nettoyage : retirer le câblage électrique P5b de Grok (mechLink moteurs/hub/batterie) — DONE (Grok). Bloc drive motor/hub/battery retiré de stepMech. Tests 17/17. Scale en main intouché.
- [ ] Manivelles des sites de débris : elles spawnent `on=1` et tournent toutes seules — bug ou feature? Décision Philippe

### P5b · Électrique + conduite (LE gros morceau restant)

- [ ] Moteurs électriques câblés à la couche 1:1 (tailles = couple/vitesse : M 405 rpm/11 Ncm, L 390/18, XL 220/40, servo ±90° — mesures Power Functions, LEGO ne publie rien)
- [ ] Hub/batterie + télécommande à canaux A–D : le joueur LIE un hub à sa machine
- [ ] **Conduite : un véhicule construit roule pour vrai sur le terrain** — UN corps cinématique par construction (masse/centre calculés des pièces), roues = raycasts de suspension, différentiel (A+B)/2. Jamais un corps rigide par brique, jamais de représentation build ≠ run

### P5c · Pneumatique complet + vérins + machines qui travaillent

- [ ] Pneumatique V2 comme expansion COMPLÈTE (pompe manuelle ou moteur, réservoir, valves, cylindres double effet) — jamais à moitié
- [ ] Vérins linéaires à vis (tiennent la charge, clutch de fin de course)
- [ ] Une pelle qui CREUSE : tourelle/boom/stick/godet (un actionneur chacun), comptabilité de godet (dureté × volume ≤ force du vérin), déversement = inventaire ou tas

### P5d · Capteurs + automatisation

- [ ] Capteurs (distance 1–200 cm, couleur, inclinaison dans le hub) + logique simple sur hub : les machines réagissent toutes seules

## 8. Lane RPG

- [x] R1 : 4 chaînes de quêtes, 38 quêtes, journal par chaîne
- [x] R2 : boss (Wither refait en vrai boss, dragon poli — dans v4.18)
- [ ] **R3 : le donjon** — site souterrain, les moules rares de la Fonderie cachés dedans (ferme la boucle P6)
- [ ] R4 : identité de construction + loot nommé rare

## 9. P7 · Objets, matériaux, équipement — refonte par la matière

- [x] Audit v1 : 363 IDs cartographiés (`p7-audit.md`, local)
- [ ] Schéma : étendre `BlockDef` avec `mat?: {matrice, renfort?, conducteur?}` + `mold?` dans blocks.ts
- [ ] Chaîne électronique : Sable → (haute chaleur) → **Silicium** → chips; l'or = conducteur
- [ ] Machine à pièces électroniques — distincte de la Fonderie (les machines sont les verbes)
- [ ] Armes + balles naissent comme MOULES : balles = pellets coulés par calibre, récupérables, refondables
- [ ] Refonte totale : fondre n'importe quel objet retourne TOUTES ses matières (même l'or des circuits)
- [ ] CAT-06 : accessoires minifigurines (lane Muse) — définis + modélisés + icônes + accessibles, comme tout le reste

## 10. P8 · Inventaire, crafting, machines

- [x] Fix système BUG-4 : le catalogue Créatif est DÉRIVÉ du registre BLOCKS (+ `CATALOG_EXCLUDED` documenté), assertion permanente définitions↔catalogue dans les tests
- [ ] Catégories d'inventaire par SYSTÈME plastique (remplacer les 4 catégories héritées de Minecraft)
- [ ] Dissoudre l'équipement par paliers de minerai à mesure que les équivalents moulés arrivent — **règle de migration : un item retiré d'une sauvegarde se convertit en pellets selon son rendement de fonte** (la matière ne disparaît jamais)
- [ ] Crafting réduit aux basics; la progression passe par les machines (Fonderie, électronique)
- [ ] Machines qui gagnent des niveaux : effet chiffré RÉEL et VISIBLE — le look change, l'effet se ressent en jeu, l'UI montre les stats avant/après. Un upgrade invisible n'est pas livré

## 11. Sites de débris

- [x] v1 câblé et jouable : 3 pièces/chunk, pool de 6, dispersion par hash
- [ ] Design complet : **double voie pour TOUTES les pièces avancées** — les fabriquer OU les trouver; jamais une pièce loot-only non craftable (le crafting = le pity timer, à 3–5× le coût)
- [ ] Topologie de spawn : routes = artères de loot, monuments = gros lots, rareté par tiers de zone
- [ ] Recyclage à ~50 % : les débris non utilisés = plastique à fondre (lien P6)

## 12. Gravité — la loi de Philippe (2026-10-29)

« La gravité pour TOUT les blocs. Si un arbre est coupé de 3 studs et qu'il reste un stud, il tombe. Les feuilles tombent avec l'arbre et se placent. »

- [x] Arbres : la règle des 2 supports (le composant au-dessus de la coupe tombe sauf s'il repose sur **2+ points solides** extérieurs; 1 support restant = il tombe) — les anciens gates de forme (canopée ≥6 feuilles, ≥2 bûches, zéro appui) sont morts
- [x] Arbres : le sens de chute choisit un chemin LIBRE (sweep testé; le tronc ne clippe plus à travers le sol ni les blocs)
- [x] Arbres : shading réaliste sur les blocs qui tombent (même pile d'atlas que le monde statique)
- [x] Feuilles : elles tombent avec l'arbre et SE PLACENT (settle trié bas→haut, le tronc tombé sert de support; ce qui ne peut pas se placer drop en item — rien ne disparaît) *(en attente verdict Philippe)*
- [ ] **Gravité par composantes pour TOUS les blocs** (pierre, planches, constructions du joueur) : quand le support d'un composant tombe sous 2 points, le composant tombe. Chantier d'architecture : le scan de support doit distinguer un composant DÉTACHÉ du terrain (le terrain entier est un seul composant ancré au bedrock — il ne doit jamais s'effondrer). À scoper avant de coder

## 13. Campagne de fermeture — les 6 bugs (fermeture = mesuré + retest Philippe)

- [ ] **BUG-1 · Les briques posées sur studs n'avaient pas l'éclairage réaliste**
  - [x] Cause trouvée : `brickGeo` n'écrivait aucun attribut `color` alors que le matériau exige `vertexColors:true`
  - [x] Fix mesuré au rig (qa109c) et poussé (`9996c2fe`)
  - [ ] Retest Pages de Philippe
- [ ] **BUG-2 · Le Bow**
  - [x] Le nom est « Bow » (le renommage « Arc / Bow » de Grok a été reverté — jamais un alias en nom d'affichage)
  - [x] Modèle en main reconstruit (photo de Philippe : l'ancien était 2 boîtes droites + une corde flottante = un bloc beige) : branches en 3 segments sur un vrai arc, corde pointe-à-pointe (`5d7a41b5`)
  - [ ] Mesure rig : prendre le Bow en Créatif et TIRER une flèche (script `qa-bow.mjs` prêt, en file derrière la contention des bancs)
  - [ ] Retest Pages de Philippe (silhouette + tir)
  - [ ] Dette liée : le Crossbow porte encore le modèle de l'arc — modèle d'arbalète distinct à faire
- [ ] **BUG-3 · Gravité (briques et sable)**
  - [x] Fix de Grok : seuil de stress des briques 0,75 s → 0,12 s; `spawnFaller` et l'atterrissage lisent la couche briques
  - [x] Vérification Muse : 3/3 cas journalisés MESURÉS PASS + régression P1 au nouveau seuil
  - [x] Défaut collatéral trouvé par la mesure : `TEMPERED_STRESS_MAX` était un littéral périmé (12,5× au lieu de l'invariant 2×) — corrigé (`0f557775`)
  - [ ] Retest Pages de Philippe
- [ ] **BUG-4 · Pièces invisibles dans l'inventaire Créatif**
  - [x] Fix système poussé (`b9204a76`) : catalogue dérivé du registre (voir §10)
  - [x] Contrôle visuel en jeu : 99/99 icônes Technic chargées, recherche fonctionnelle (étape 7, cas 6)
  - [ ] Retest Pages de Philippe
- [ ] **BUG-5 · Aucun loot en Créatif**
  - [x] Cause : tout le rendement de `breakBlock` était dans `if (!creative)`; mesuré PASS au rig
  - [ ] Confirmation qa-reg en cours : récolte terre + bûche + gravité sable (batterie `qa-reg` — la plainte du 2026-10-29 soir, « on peut pas récupérer de la terre », doit être tranchée par la mesure)
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
  - [ ] Couche Technic 1:1 : pose, engrenages qui tournent, moteur alimenté, icônes
  - [ ] Échelle proportionnelle + main qui serre les pièces Technic
  - [ ] Arbres : shading, sens de chute libre, règle des 2 supports, feuilles qui se placent — **+ le retest de son frère** (les arbres ne tombaient pas de son bord sur l'ancien build)
  - [ ] Bras en minant (tunnel à main nue + à la pioche)
  - [ ] DualSense réelle sur PC, manette Bluetooth, calibration FPS désert Créatif (20 FPS rapportés)

## 15. Dettes QA (à mesurer, dans l'ordre de la file)

- [ ] qa-reg (en cours) : récolte terre/bûche, gravité sable, topple petite coupe + cas « un seul support » (le cas du frère)
- [ ] qa96 restes : s3b (sonde settle du topple), s4 (Wither — le harnais est mort, pas le jeu), s5 (FX — aucun verdict n'existe, les deux logs sont vides)
- [ ] qa97 : performance (chiffres relatifs au rig seulement — le verdict perf est l'A54 de Philippe)
- [ ] qa-bow : voir BUG-2 (§13)
- [ ] Re-mesurer qa100/qa101/qa102 sous le recalibrage studs (§3) : les classifications « unsupported » à 1 stud changent par design

## 16. Lag (de worklog2, item 3 — ouvert)

- [ ] Profiler la vraie cause : mesher CPU (rebuild de géométrie) vs contention des bancs QA sur la machine partagée. Sur Pages/téléphone il n'y a aucun banc — si ça lag là, c'est le mesher/studs
- [ ] Framerate avant/après mesuré, correctif ciblé (jamais d'optimisation au feeling)

## 17. Icônes Technic — rework (de worklog2, item 5 — ouvert)

- [x] v1 : 99/99 rendues de la vraie géométrie, transparentes, en jeu (étape 6)
- [ ] v2 : silhouettes retravaillées (meilleurs angles/lumière) dans le lab d'icônes hors-ligne — après le verdict de Philippe sur la v1 (le Converoyeur 363 est le moins lisible : dalle quasi noire)

## 18. Nettoyage du repo (EN ATTENTE de l'OK de Philippe sur la liste exacte)

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

- [ ] **R3 · Le donjon** (§8) — ferme la boucle des moules rares de P6. Le plus petit chantier qui ferme un pilier entier.
- [ ] **Gravité universelle — scoping** (§12) : écrire le design du scan de support par composantes (ancrage bedrock) AVANT tout code.
- [ ] **P5b · Conduite** (§7) : design d'abord (corps cinématique unique, liaison hub, canaux), puis le plus petit véhicule qui roule pour vrai.
- [ ] **P7 · Schéma matière** (§9) : `mat`/`mold` dans BlockDef + chaîne silicium en une étape mesurée.
- [ ] **qa-reg → verdicts** (§15) : finir la batterie en cours, livrer le rapport ce qui marche / ce qui est cassé.

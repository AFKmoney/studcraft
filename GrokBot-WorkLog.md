# GrokBot-WorkLog

Journal de travail de studs game tester (Grok Bot) sur StudCraft. Heures en heure du Pacifique (PDT).

## 2026-10-31
- ~01:15 Premier test QA de studcraft.pages.dev + audit du code (73beae09) : C1 pile soudée qui flotte, M1 couleur des tenons, M2 weldAt sans cordon.
- ~03:00–04:00 Deep test complet : 472 objets en main (234 placeholders), 375 recettes, 120 fontes, infobulles, véhicules, manette. CSV held-items.csv.
- ~05:50–06:20 Retest B15 (eabec77) : recettes, établi et Buggy OK ; torches invisibles, Rig Digger cassé.
- ~07:00 Routine de surveillance du dépôt créée (toutes les 20 min).
- ~09:30 Retest B16 (645ddb9) : torches, liftarm5, Leaf brick et Digger 20/20 OK ; entrée dans le Digger, stationnement automatique, Crossbow et caméra de conduite encore cassés.
- ~10:10 Étude du pipeline procédural (zéro asset, shader SIREN/SNR) + refonte des 44 mobs : mob-redesign.md et 7 concepts.
- ~10:16 Philippe valide la refonte, go pour coder. Connexion GitHub (gh) en cours sur mon ordi.
- ~10:20 Clone neuf /workspace/studcraft-mobs, branche grokbot/mob-redesign depuis main 68673ee. Base : tsc 0 erreur, 111/111 tests.
- ~10:22 mobNames.ts : table MOB_LABEL (44 kinds, noms FR) branchée sur le HUD, la barre de boss et les messages ; 21 libellés d'objets renommés dans blocks.ts (ids inchangés).
- ~10:24 Refonte des mobs dans beast()/buildStuds, valeurs seulement : Pétabrique, Vide-Bac, Démoulé (+ sables, gonflé), Squelek (+ givré), Meuhbloc, Cochonnet-Tirelire, Cocotte-Clic, Grue-Garde.
- ~10:25 Boss : 2 nouvelles règles SNR isolées (bossSkin, cache keys à part) : coulée « molten » pour La Grande Presse, cordon « weld » pour Le Triple Rebut.
- ~10:27 MobBatchRenderer : creeper/skelly/stray/walker/husk/drowned sortis du batch (ses gabarits instanciés gardaient les formes Minecraft).
- ~10:30 Nouvelle demande de Philippe : drops cohérents. Audit : tables en chaîne de ternaires dans game.ts, bat/axolotl/gros slime sans drop, cheval sur le repli [Green].
- ~10:33 mobDrops.ts : MOB_BASE_DROPS + MOB_BONUS_DROPS (données, testables), plus aucune table vide ; nouveaux modèles en main : Teks rod, Burr, Fin tile, Sorter marble.
- ~10:35 Tests ajoutés (mobNames, mobMeshes, mobDrops) : 120/120. Captures headless de 42 mobs avant/après + montages dans shots-mobs/.
- ~10:37 tsc 0 erreur, npm run build OK.
- ~10:38 PR #4 ouverte (grokbot/mob-redesign → main, non mergée) : https://github.com/AFKmoney/studcraft/pull/4
- ~10:40 Nouvelle demande : 2e PR séparée grokbot/biomes-bosses (biomes + mobs par biome + 1 boss/biome à 10 %). Audit de world.ts biomeOf (l.115-143) et des spawns game.ts (l.11820-11900) ; plan rédigé, pas encore codé.

## PR 2 — biomes & boss (branche grokbot/biomes-bosses, empilée sur PR #4) — 31 oct. 2026 (PDT)
- ~10:41 Plan approuvé par Philippe. Branche créée depuis grokbot/mob-redesign.
- ~10:42 Pétabrique « bombe orange » : seul mob explosif = kind `creeper`, déjà redessiné en bombe orange dans PR #4. Décision : on garde le kind (c'est la bombe), on retire les restes verts (ragdoll d'explosion → orange/noir/jaune), aucune variante creeper dans les rosters (Volcan : Fumebloc cendré à la place). Mobs non sauvegardés → aucune incompatibilité de save ; drops inchangés (déjà ceux de la bombe).
- ~10:43 Refs (refs/) : Pétabrique refait d'après bombe.jpg (tonneau rond, bandes noires, clé de remontage, yeux jaunes, mèche + flamme, 3 pattes) ; Démoulé d'après demoule.jpg (visière fissurée verte, liftarm traîné) ; La Grande Presse d'après dragon.jpg (ailes en treillis, panneaux violets, engrenages, pointes cristal, câbles).
- ~10:44 src/game/biomes.ts : 11 zones (variantes de bruit sur les biomes existants, terrain inchangé → saves valides), 22 espèces originales style « collection » (6 archétypes : crabe, raptor, scarabée, ankylo, drake, araignée ; joints Technic gris, yeux verts), 11 boss, règle de spawn (10 % à l'entrée, cooldown 240 s, un seul vivant).
- ~10:45 game.ts : buildSpecies, applyBiomeLook, 6 nouvelles règles SNR (vein, heat, frost, jelly, strata, iris ; molten/weld réutilisées) avec clé de cache propre ; spawnZoneMob/spawnZoneBoss/tickZones branchés dans la boucle de jeu ; HUD barre de boss ; drops boss/espèce ; pas de pénalité de réputation pour un boss golem.
- ~10:46 Tests biomes.test.ts + extensions mobMeshes/mobDrops : 127/127 ; tsc 0 erreur ; build OK.
- ~10:48 Captures headless (biome-shots.html) : 11 biomes, 11 boss, 22 espèces, montages + comparaisons côte à côte avec les refs dans shots-biomes/.
- ~10:50 Commits, push unique, ouverture de la PR (base main, dépend de PR #4).

## 2026-10-31 — Phase 3 v2: refs-faithful mobs + NFR/SIREN (PDT)
- 11:10–12:40 Studied NFR-Compressor + skills-nfr (nfr-srn). Added tools/nfr (siren_fit.py, fit_refs.py). Fitted 4 ref crops into SIRENs (fp16 L1, int8 per-block L2/L3) → src/game/nfrFields.ts, decoded into GLSL by `nfrGlsl` and sampled in `nfrSkin`:
  bombe 854 B / 28.8 dB · demoule 2038 B / 17.5 dB · dragon RGB 1450 B / 28.1 dB · crab 854 B / 24.3 dB.
- Rewrote buildSpecies (rounded/dome shells, stud domes, 2-segment Technic limbs with ball joints + axles, glowing bezel eyes, gears, flex tubes, crystal spikes), new makeDemoule, Pétabrique v2 (lathe barrel, bands, wind-up key, fuse, flames), Grande Presse v2 (molten hull, crystal spikes, truss wings with translucent NFR panels).
- Visual tweaks after renders (eye saturation, seam, spider splay, wing raise, Démoulé amt, raptor neck).
- Ref photos untracked (refs/ in .gitignore); they remain in history from commit e5e7e7c (no force-push done).
- Tests 130/130 (+NFR decode/normalisation, +v2 part test), tsc 0, build OK. Stats: shots-v2/stats.md. Montages: shots-v2/ref-vs-*.png, montage-*.png.

## v3 — tout démoulé, léger et réaliste (31 oct. 2026, ~11h44 → soir, PDT)

- **NFR** : refit du champ `demoule` (crop 380,360→620,600, réseau 2-48-48-1, 2828 o) : 17,5 → **20,7 dB**. Champ `dragon` élargi (2-44-44-3, 2602 o) : 28,1 → **32,6 dB**. `bossSkin` accepte désormais une carte NFR et `applyBiomeLook` conserve la NFR lors de la recoloration.
- **Allègement** : `PartBatch` + `v3Optimize` fusionnent les pièces statiques par matériau (en cache). Les petites pièces utilisent un RoundedBox à 1 segment, les tores sont à 6 segments et les flexTube ont deux fois moins de nervures. **Total sur 63 mobs : draw calls 3448 → 1919 ; triangles 567k → 504k.** Grande Presse : 305 → 69 draw calls, 49k → 29k triangles. Démoulé : 135 → 35 draw calls, 38k → 21k triangles. Pétabrique : 70 → 17 draw calls.
- **Démoulé** : surface densifiée (briques et creux fusionnés), casque plus gros, visière lumineuse unique.
- **Pétabrique** : vrai petit feu, un seul quad billboard avec bruit fbm, animé et vacillant, sans aucun asset.
- **Grande Presse** : silhouette basse et horizontale, tête-presse projetée vers l'avant, grandes ailes en treillis Technic noir avec panneaux NFR violets, épines cristal, longue queue. **Dracobraise** : n'est plus une minifig, c'est un mini-dragon quadrupède avec ailes en treillis et panneaux NFR.
- **Boss et bêtes refaits** : Totem et Golem (robot-grue), Cochonnet (tirelire), Meuhbloc, Mammouth (ravager), Kraken (bouée-œil), Forge-Titan (noyau, flammes), mouton, poule.
- **PNJ** : villageois en salopette. Les 8 marchands portent tablier, bandoulière et sacoche, avec une silhouette par métier : épicier, forgeron, maçon, berger, commis, mage, ranger, mécano (lunettes, clé, ceinture d'outils).
- **Tests** : tsc OK, 130/130 tests, build OK. Pattes et userData identiques à la v2 pour les 42 types.
- **Limites** : cheval, chèvre, loup, renard, chat, squelettes, illageois, piglin, sorcière, etc. ne reçoivent qu'une passe de finition (arêtes arrondies, matériau à reflet, fusion), sans refonte. Pour les petits animaux, les triangles augmentent (arrondis) mais les draw calls baissent. Pas de bloom. Les refs/*.jpg restent dans l'historique (e5e7e7c), sans force-push.
- Visuels : `shots-v3/` (before/, after/, montage-*.png, ref-vs-dragon.png, ref-vs-demoule.png, stats.md).

## v3.1 — bras séparés (31 oct. 2026, 12h12 PDT)
- Retour de Philippe : les bras des villageois étaient fusionnés au corps. `makeFig` : chaque bras est un pivot distinct, écarté de 4 cm du torse (épaule à ±0,235), avec une rotule d'épaule sombre, une couture au coude et des manches un ton plus foncé. Le correctif touche toutes les figurines humanoïdes : villageois, squelettes, piglin, sorcière, illageois.
- Marchands : la sacoche passe sur la hanche arrière. Empiècements, cape et ceinture sont rétrécis pour ne plus couvrir les bras. Les outils (houlette, bâton, marteau, clé, truelle, arc, registre, cagette) sont tenus dans la pince et suivent donc le balancement.
- Nouveau test : 2 pivots de bras par villageois et marchand, pilotés par l'animateur (legs[2]/[3]), avec un écart à l'épaule. 131/131 tests, tsc et build OK.
- Montage : `shots-v3/montage-pnj-bras.png` (avant, après au repos, après bras balancés).

## v3.2 — Démoulé : retour au look v2 (31 oct. 2026, 12h14 PDT)
- Philippe préfère le Démoulé v2 : plus fin, tête séparée sur un cou, visière décalée, sans motif de trous sombres. Le `makeDemoule` v2 est restauré tel quel pour le marcheur, le husk et le noyé.
- La fusion v3 est conservée : les tronçons statiques sont fusionnés par matériau, mais la tête et les 4 membres restent des pivots séparés. Les primitives sont allégées.
- Marcheur : 135 → 25 draw calls, 38,3k → 20,6k triangles. Husk : 137 → 27 draw calls. Noyé : 139 → 29 draw calls.
- Le champ NFR `demoule` refit (20,7 dB) est conservé : les trous venaient de la géométrie v3, pas du champ.
- Comparaison réf. | v2 | v3 (rejeté) | v3.2 : `shots-v3/ref-vs-demoule-v32.png`. Tests 131/131, tsc et build OK.

## v4 — refonte complète des mobs restants (2026-10-31)
- 21 builders neufs (cheval, chèvre, loup, renard, chat, enderman, slime, abeille, calmar, chauve-souris, axolotl, perroquet, grenouille, feu follet, ghast, phantom, shulker, vex, wither, crabe, araignée) : peau NFR « fourrure », membres articulés (v3Limb) en pivots séparés, ailes battantes (flapWing), géométrie fusionnée par v3Optimize sauf membres.
- Humanoïdes refaits (`humanoidV4`) : squelette/stray (crâne, cage thoracique, arc, carquois), piglin (tête de cochon, casque et épée d'or), sorcière (chapeau tourné, robe, potion), pillard (arbalète), vindicateur (gilet, hache), évocateur (robe, mantelet d'or, totem). Objets tenus dans les pivots de bras → ils s'animent.
- Boss : Chef Pilleplot, Pharaon-Presse, Reine-Gélatine héritent des nouveaux corps. Sphinx-Moulé reste sur le Démoulé v2 (demande de Philippe).
- Hauteurs de vol conservées (bbox vérifiées vs v3), nb de pattes / userData inchangés.
- Coût : 391 → 613 draw calls, 64k → 150k triangles sur ces 28 mobs (membres articulés + détails). Ordre de grandeur des mobs v3 (cochon 34, vache 41). Détail dans shots-v4/stats.md.

## v5 — Veilleur-Prisme + allègement (2026-10-31)
- L'enderman (« Vide-Bac », grand bonhomme noir à bâtons) devient le **Veilleur-Prisme** : sentinelle flottante en verre de vide (octaèdre NFR translucide), grosse lentille-œil (= tête, garde le hook du regard), halo doré, éclats de brique en orbite, deux bras Technic flottants à pince, deux ailerons stabilisateurs. Plus aucun contact au sol. 4 pivots/head conservés → animateur, téléport, colère au regard inchangés (code de gameplay non touché).
- Drops : `VoidGlass` (id **474**, nouveau, « Void-glass shard ») + `EnderPearl` (id **268** inchangé, renommé « Blink lens ») ; bonus `VoidCore` (id **305** inchangé, renommé « Prism sentinel core »). Fonte : SMELT[VoidGlass] = Prism. Recette « blink-lens » : 3 éclats → 1 lentille. void-blade inchangée (mêmes ids). Tests ajoutés (mobDrops.test.ts).
- Allègement : v3Limb sans sous-groupe genou (une jambe = 1 à 3 draws), pas de bille de hanche, billes 6 segments, geoBall par défaut 8, rbox 1 segment jusqu'à 36 cm.
## PR 3 — structures de biomes (branche grokbot/biome-structures, empilée sur grokbot/biomes-bosses / PR #5) — 31 oct. 2026 (PDT)
- ~11:13 Clone neuf dans /workspace/studcraft-structures, branche grokbot/biome-structures créée depuis grokbot/biomes-bosses. npm ci ; base : 127/127 tests.
- ~11:16 Audit : hamletOrigin/hamletAt (grille REGION 192, hash2 + salt), siteAt/siteBricks (grille 96, bricks purs relatifs à l'origine), landmarkAt (grille 256), paintHamlet/paintSites (force() par chunk), zoneAt/zoneFor (biomes.ts), stockChest (loot.ts), ouverture de coffre game.ts (pool par proximité).
- ~11:25 Nouveau fichier src/game/structures.ts (mêmes règles : 1 candidat par cellule de 128, tout tiré de hash2(cellule, seed+sel), motifs de briques purs ; seules les variables changent via THEMES par zone). Types : village thématique par zone (cottage/adobe/tour/igloo/pilotis/bunker), Cité du désert (grille 3×3 de rues, immeubles 2–4 étages, palais à dôme, marché), sanctuaires, méchas abandonnés en pièces (mode « posé au sol »), points d'intérêt par zone, caveaux cachés enterrés.
- ~11:27 Exclusions : rayon de 112 autour du hameau de départ et de l'origine, hameaux, sites, landmarks ; chaque structure reste dans sa cellule (aucun chevauchement) ; pente max, pas d'eau (sauf village sur pilotis des îles).
- ~11:28 Intégrations minimales : world.ts (1 import + 1 appel paintStructures après paintSites), loot.ts (pools sanctum/mecha/vault), blocks.ts (2 pièces rares non posables : Sanctum stud 480, Mecha core 481), game.ts (pool du coffre si dans une structure + hook QA findStructureQa) — aucun code de mob touché.
- ~11:33 Tests src/game/structures.test.ts (déterminisme, densité, spawn dégagé, plans par zone avec coffre, régénération de chunk identique, loot) : 134/134 ; tsc 0 erreur.
- ~11:50 Placement ajusté : îlots (le pad comble les hauts-fonds) pour toutes les structures des Îles, pente tolérée +6 dans les zones accidentées (arctique, volcan, montagne, canyon), hauteur du pad bornée par la hauteur dégagée. tsc/tests/build OK.
- 12:00 (PDT) — Garages marchands : le hameau existant avait déjà un étal et un hangar de mécano (world.ts). Règle étendue aux villages thématiques : lot est (GARAGE_LOT=4) remplacé par un atelier 10×10 aux matériaux du biome, ouvert vers la place, avec coin établi (four, enclume, établi), racks de pièces (barils, fer), pont élévateur avec buggy en briques, étal extérieur à auvent et épave dépecée. Également un bloc garage dans la cité du désert. Nouveau test : 135/135, tsc et build OK.
- 12:00 — Captures : OOM corrigé avec un rayon 3 préréglé dans localStorage et un viewport de 640×360. On attend la fin de « Building the land » ; le clic sur Create world est désormais ciblé exactement.
- 12:20 (PDT) — Nouvelles briques de biome (grès, glace, basalte, mangrove, corail) : bloqué. Les chunks sont en Uint8Array, et les 255 ids de bloc sous 256 sont tous pris (98 par des items). Ajouter une brique posable demande soit de passer les chunks en Uint16Array (moteur, sauvegardes, multijoueur, mesher), soit de renuméroter des items, ce qui casse les sauvegardes. Rien n'a été fait sans décision. Les thèmes réutilisent les briques existantes (Calcite, Basalt, Ice, Obsidian, Crystal, Moss, etc.).
- 12:20 — Captures : chrome-headless plante encore (Target crashed) même au rayon 3. Pas de PNG de structure à ce stade.
- 12:30 (PDT) — Chunks passés en 16 bits : world.ts et structures.ts utilisent Uint16Array. Saves et réseau stockent ou envoient des tuples d'ids en JSON, donc aucun changement de format. Ajout d'un marqueur `ids: 16` dans SaveV1 et de normalizeSave(), qui migre les saves legacy 8 bits et y filtre les ids > 255. Le relais mp transmet `block` tel quel.
- 12:30 — Mémoire : 16×72×16 = 18 432 cellules, donc 18 Ko → 36 Ko par chunk. Au rayon 8 (289 chunks) : 5,2 → 10,4 Mo. Atlas 48 → 52 lignes (+8 % de texture, 2048×6656). Les slots d'atlas vont d'abord aux briques monde, les pièces Teks en dernier (rendues par la couche Teks).
- 12:30 — 13 nouvelles briques (ids 482–494) : Sandstone, Adobe, Packed snow, Ice brick, Basalt tile, Obsidian tile, Mangrove, Bamboo, Coral, Crystal brick (lumière 6), Jungle stone, Mud brick, Red rock. Chacune a un label, une recette sans forme et des paramètres SNR (glace/cristal/obsidienne brillants). Les thèmes de biome les utilisent. Ajout des recettes SanctumStud et MechaCore. Nouveau chunk16.test.ts : 141/141 tests, tsc et build OK.
- 12:45 (PDT) — Garage → concession TEKS. Le bâtiment voxel fait 10×10×6 et reprend le thème du biome : porte de 4×4 vers la place, bandeau accent, comptoir, coin atelier, étagères de racks de 2 de haut, poteaux de pont. garageOf() renvoie la baie d'exposition, la place du mécano au comptoir, les racks et les pièces Technic (liftarms, axes, engrenages, roue). Les deux sont déterministes.
- 12:45 — Dans game.ts, liveStructureVillages() (appelée depuis ensureRoamingFolk) habille le garage une seule fois. On y pose le vrai Starter Buggy de builtinModels() sans batterie, comme pour le hangar du hameau, et les pièces Teks sur les racks, uniquement dans des cellules libres (tech.test), donc pas de doublons après rechargement. Elle fait aussi apparaître le mécano au comptoir (vente TEKS/Technic via le système de troc existant) et 4 villageois aux rôles tirés de la seed. Le Rig Digger, trop long (13 blocs), n'est pas exposé. 143/143 tests, tsc et build OK.

## 2026-10-31 12:28 (PDT) — Société : module pur + bâtiments civiques
- Ajout de `src/game/society.ts` (module pur, RNG seedé + tables) : schéma de quête JSON + `validateQuest`, quêtes de chef (tuer mob du biome, ramener, trouver sanctuaire/mécha, boss), 15 guildes (couleurs de hall, rangs, perks, missions), quêtes bandits/receleur, crimes/réputation/prime, détection furtive (ligne de vue, accroupi), arrestation (payer/prison/résister). Monnaie = Émeraude (déjà existante, aucune migration). 7 tests.
- `structures.ts` : manoir du chef (lot 6) dans chaque village, palais = château de la cité ; cachot souterrain (3 cellules à barreaux + porte, coffre à preuves, échelle) sous le manoir/palais (sauf village sur pilotis des îles) ; hall de guilde aux couleurs de la guilde (1 par village, 2 dans la cité) ; nouveau type rare `bandit` (palissade, tentes, feu, tour de guet, étal du receleur, butin). Exports `civicOf()` et `banditFolk()`. 2 nouveaux tests.
- Validation : tsc OK, tests du jeu OK (les 16 échecs og/template sont préexistants et hors périmètre), build OK.

## 2026-10-31 12:35 (PDT) — Câblage de la société dans game.ts
- Nouveau `src/game/societyState.ts` (état pur sérialisable) : carnet de contrats (max 8), progression par tag de kill / crime non vu, réclamation (émeraudes + objets, rép du village, XP de guilde, adhésion et rangs), époques par donneur, crimes (vu → prime + échec des contrats de crime), arrestation. 4 tests.
- `game.ts` (glue localisée, un bloc avant ensureRoamingFolk + petits hooks) : chef au manoir/palais, 2 gardes (rouge foncé) qui patrouillent la place, maîtres de guilde, vendeur d'améliorations au garage TEKS, receleur + 4 bandits aux camps ; contrats affichés au tableau (section « Contracts ») ; hook de kill (tag du mob + boss) ; crimes : casser une brique (pas le terrain naturel) ou prendre dans un coffre du village, sabotage dans le garage, cambriolage d'un caveau, vol à la tire du chef en étant accroupi ; détection = villageois en vue (cône, portée, accroupi, nuit, ligne de vue par briques) ; « Halte ! » près d'un garde si prime ≥ 20 ; parler = payer, accroupi + parler = cachot (téléport en cellule, saut horaire, confiscation dans le coffre à preuves si prime ≥ 40), frapper un garde = résister (gardes hostiles) ; sauvegarde `society` validée au chargement.
- `quests.ts` : rôles « outfitter » (vendeur d'améliorations : lingots plastique, cuivre, engrenages, lingot trempé, batterie, livre) et « fence » (receleur).
- Correctif : le chef de la cité ne se tient plus sur le coffre du trésor (test qui échouait).
- Validation : tsc OK, node --test src/game/*.test.ts 156/156, vite build OK.
# GrokBot — Fonderie de plastique (branche grokbot/plastic-foundry)

## Audit (état sur main, 31 oct. 2026)
- Le bloc Furnace (« Kiln ») est la fonderie : entrée / combustible / sortie, cuisson 5 s, `SMELT` + `SMELT_N` dans `recipes.ts`, tick dans `tickFurnaces` (`game.ts`).
- Boucle existante : blocs cassés / mobs → **Pellets** (générique, sans couleur) → Kiln → **PlasticIngot** (+0,25 Fuel distillé par pellet) → recettes de moulage (briques, outils, 99 pièces TEKS au coût = volume réel ×2, cuivre pour moteurs/alim).
- Recyclage : toute pièce TEKS refond en pellets à ~50 % (Founder ×1,5).
- Niveaux de fonderie 1→3 (cuisson 5 → 3,5 → 2,2 s, carburant ×1,5) payés en lingots/cuivre/tempered.
- TemperedIngot : seulement par trempe dans l'eau (1:1, gratuit) ou loot.
- **Bug trouvé et corrigé** : le hopper sous le Kiln cherchait la clé `"x, y, z"` (avec espaces) au lieu de `"x,y,z"` → l'automatisation de sortie ne marchait jamais.
- Manques : aucune notion de qualité/pureté, pas de chaleur (le feu est binaire), les objets rares n'avaient aucun usage dans la fonderie, l'upgrade n'apportait que de la vitesse.
- Risque d'équilibre : avec Founder, une petite pièce (1 lingot) recycle en 2 pellets → boucle de matière positive (préexistant).

## Changements
- `src/game/foundry.ts` (pur, data-driven, testé) : chaleur, pureté, paliers Raw/Fine/Superior/Masterwork, affixes de rare melt, couleur du bain.
- **Chaleur** : monte quand ça brûle (plus vite par niveau), refroidit sinon ; vitesse de cuisson ¼ à froid → 1 à chaud.
- **Pureté** : chaque fonte fait tendre vers le plafond du niveau (45/70/90) ; le niveau limite aussi le palier max (Lv1 = Fine max, Lv3 = Masterwork). Bonus de lingots +15/30/50 % via accumulateur déterministe.
- **Rare melt** (table `RARE_MELT`) : Guardian spike, Scarab relic, Witch essence, Illager emblem, Ender core, Prism, Sapphire, Amber → pellets + pic de pureté + affixe chargé (N coulées) : Abundant (+1 lingot), Tempered (coule des TemperedIngot), Swift (cuisson ×2), Volatile (distillation ×3). Même affixe = charges cumulées.
- **Regrind** : refondre une pièce TEKS baisse la pureté de 15 → limite la boucle recyclage/Masterwork.
- UI Kiln : panneau « Molten pool » (palier coloré, pureté, barre de chaleur lumineuse, affixe actif, palier débloqué par l'upgrade). Message + son `rank` au rare melt.
- Tests : `src/game/foundry.test.ts` (10 tests). tsc OK, 121 tests OK, vite build OK.

## Limites honnêtes
- Les affixes s'appliquent au lot (lingots), pas comme propriété persistante par objet : l'inventaire n'est qu'id+quantité.
- Pas de couleur/mélange de couleurs du plastique (Pellets est un id unique) ; pas de visuel shader SNR sur le bloc (seulement l'UI).
- L'équilibre Founder+Masterwork sur petites pièces reste à surveiller en jeu.

## 2026-10-31 — grokbot/integration : GPU, fonderie v6, quêtes LLM (cœur)
- **Intégration** : #5 + #6 + #7 fusionnées dans `grokbot/integration` (PR #8, brouillon). Conflit blocks.ts : les deux jeux d'ids gardés, 305 = « Prism sentinel core ». RARE_MELT remappé (VoidCore, VoidGlass, EnderPearl/Blink lens) ; le test de #5 (VoidGlass→Prism) suit maintenant la règle fonderie (→ Pellets).
- **Trous comblés** : perks de guilde (rabais, minage, furtivité, butin, xp, amende), patrouilles de gardes (patrolOf, 8 points), blocs posés par le joueur exclus des crimes, baie longue du Rig Digger en ville, vendeur d'améliorations (« outfitter ») et receleur (« fence »).
- **GPU** : powerPreference « high-performance » sur tous les renderers, failIfMajorPerformanceCaveat avec repli, détection WEBGL_debug_renderer_info + navigator.gpu, bannière rendu logiciel, préréglages par palier (gpu.ts + 3 tests), chaîne GPU dans Réglages et à côté des FPS, `console.info("[gpu]")`.
- **Fonderie v6 (Philippe)** : table unique `MATERIALS` dans foundry.ts. Tout fond en plastique sauf or, diamant et bois. Communs 8–16:1 (terre 16, pierre 12, argile/ glace 8–10), briques 2:1, raretés 1:1 (cristal, toutes les RARE_MELT qui gardent leur bonus). Bois = carburant (bûche 3 s, planche 1,5 s) ; le plastique de qualité brûle aussi (lingot 6 s, trempé 10 s). Or/diamant refusés avec un message. Plus de Log→Coal. Accumulateur `ratioAcc` déterministe. Texte de l'UI du four mis à jour. 3 tests.
  - **Question ouverte** : Sand→Glass, Clay→Hard, Netherrack→Ash et les minerais métal/gemme gardent leur raffinage (30+ recettes utilisent Glass/Copper/Chrome) ; à trancher avec Philippe avant de les passer en plastique.
- **Quêtes LLM (cœur pur, testé)** : `src/game/llm/prompt.ts` (budget ≤ 600 tokens testé, key=value, top 4 faits par catégorie, ids autorisés + grammaire GBNF, température 0,4, max 160 tokens, arc ≤ 20 mots, nettoyage anti-injection) et `src/game/llm/story.ts` (état d'histoire persistant, règles rep/prime/guilde imposées par les types autorisés, parse → validateQuest → mappage sur le schéma Quest réel, 2 essais puis procédural, timeout, Director avec pré-génération). 6 tests avec un LLM simulé.
- **Pas encore fait** : worker wllama + réglage on/off + indicateur de chargement + branchement dans le dialogue du chef ; pool de workers CPU ; scripts/qa-shots.mjs.
- Vérifs : tsc OK, `node --test src/game/*.test.ts` 188/188, vite build OK. **Pas de merge dans main.**

## 2026-10-31 (suite) — LLM navigateur, workers CPU, qa-shots, fonderie v6b, réparation
- **Modèle NPC** : `src/game/llm/runtime.ts`. wllama 3.8.1 chargé depuis jsDelivr (jamais empaqueté), GGUF depuis Hugging Face (cache OPFS de wllama). Vérifié : le wasm de wllama 3.8.1 contient les noyaux `block_q1_0` (GGML type 41, même id que le fork prism) → **Bonsai 1.7B Q1_0 (248 Mo) en premier**, repli **Qwen2.5-0.5B-Instruct Q4_K_M (398 Mo)** si le chargement échoue. Activé par défaut (réglage « NPC AI quests »), démarre 20 s après le lancement, indicateur « NPC AI xx % » en bas à droite. Repli procédural si deviceMemory < 4 Go, pas de WASM/Worker, échec ou timeout 12 s. Branché sur le chef et les maîtres de guilde : la quête pré-générée est prise si prête, sinon procédurale ; la suivante est pré-générée en arrière-plan. L'arc de l'histoire est sauvegardé (`story` dans la sauvegarde).
- **Pool CPU** : `genPool.ts` + `genWorker.ts`, taille = hardwareConcurrency − 2 (1..6). La génération de chunks part en avance (rayon + 1) dans les workers, buffer Uint16 transféré, adopté seulement s'il manque (octets identiques, testé). Repli : `world.ensure()` sur le thread principal. **Le maillage reste sur le thread principal** (buildChunk lit les voisins, les edits et les briques). Mesures exposées via `__controlsTest.getGenStats()` (chunks adoptés, ms worker, ms de maillage).
- **qa-shots** : `node scripts/qa-shots.mjs --url http://127.0.0.1:5173/ --out qa-shots` (Chrome système, non headless, GPU). Village par biome, chef/garde/maître de guilde/vendeur d'améliorations/bandit/receleur, UI de la fonderie, mobs ; journal GPU dans `qa-log.txt`.
- **Fonderie v6b (Philippe)** : tout fond en plastique sauf l'eau, les minerais rares (or, diamant, émeraude, cristal, saphir, prisme) et le bois. Qualité : fer → bon (lingot trempé), cuivre → moyen (lingot plastique), le reste → bas (granulés), ratios selon l'abondance (8–16:1 communs, 2–6:1 moins communs). Le minerai de saphir et de prisme donne la gemme au minage. Recettes de moulage depuis le plastique pour Glass, Hard, Ash, Tin, Resin, Amber, Copper, Chrome et Ingot. Nouveau test : chaque entrée de recette a une source. La fraction de granulé (`ratioAcc`) est sauvegardée avec le four.
- **Réparation (enclume existante, modèle procédural)** : la durabilité existait déjà (le compte = durabilité). Réparer coûte du plastique de la qualité requise (granulés tier 1, lingot tier 2, trempé tier 3+ ou objet en gemmes), proportionnel à la durabilité manquante × tier. « Récupérer » fond l'objet tenu : 50 % de son coût plastique × durabilité restante (toujours moins que le coût). Les objets en gemmes sont refusés et le bois ne compte pas. `combineDur` est prêt mais **combiner deux exemplaires n'est pas branché**, car le sac ne garde qu'un exemplaire par id.

## 2026-10-31 — Fonderie, règles FINALES de Philippe (remplacent v6b)
- Le craft normal reste le mécanisme PRINCIPAL et n'est pas modifié : `SMELT` est rétabli comme avant (sable → verre, argile → brique dure, bûche → charbon, minerai → lingot). Les recettes de moulage ajoutées en v6b sont retirées et les drops de minerai de saphir et de prisme sont rétablis.
- Le plastique est un mécanisme PARALLÈLE : le four a deux modes, **Normal / Plastique** (boutons dans le panneau, sauvegardés avec le four via `plastic`). En mode Plastique, la table est `PLASTIC` : cuivre → moyen, fer → bon, le reste → bas avec ratios d'abondance ; les rare-melt gardent leurs bonus.
- Exclus de la fonte plastique : bois, feuilles, sable, argile, or, minerais précieux et gemmes, eau. Le bois et les feuilles restent du combustible. Les objets usés se récupèrent à l'enclume (50 % × durabilité).
- Nouveau test « le craft normal n'est pas touché ». Résultat : tsc OK, 198/198 tests, build OK.

## 2026-10-31 — Lave comme combustible et correctifs LLM
- **Lave** : le seau de lave est un combustible longue durée pour le four (`LAVA_BURN` = 20 s). Le seau vide revient à côté du four quand il brûle (`fuelReturn`). Le seau vide ramasse les blocs source de lave ou d'eau et les repose (`bucketFill`/`bucketPour`, désormais utilisés par game.ts). Tests dans `lava.test.ts`.
- **Clone propre** : suppression de `src/game/llm/{client,protocol,llm.worker}.ts`. Aucun import ne les utilisait et ils dépendaient de `@wllama/wllama`, absent de package.json (le runtime charge wllama depuis jsDelivr).
- **Ids `:llm`** : `baseQuestId()` retire le suffixe. `next()`, `accept()`, `claim()`, `done` et le pré-chargement du directeur comparent maintenant les ids de base. Nouveau test dans societyState.test.ts.
- **GPU logiciel** : `gpuLayers()` force `n_gpu_layers = 0` sur SwiftShader, llvmpipe ou un adaptateur logiciel détecté.
- **Délai de pré-génération** : `PREFETCH_TIMEOUT_MS` = 75 s pour la génération en arrière-plan sur CPU. Le délai interactif reste à 12 s.

## 2026-10-31 — Vérification des déploiements (#8, #9, #10)
- studcraft.pages.dev a servi chaque merge environ 13 à 15 min plus tard. GitHub n'a reçu aucun statut Cloudflare, donc la vérification s'est faite dans le chunk `game-*.js` en ligne, avec des marqueurs propres à chaque PR : « Bonsai » et `genWorker` pour #8, « Kiln: PLASTIC » pour #9, `/:llm$/` pour #10 (en ligne à 13 h 51 HP).
- Attention : le site renvoie 200 et index.html pour tout asset inexistant (fallback SPA). Un code 200 ne prouve donc rien, il faut vérifier le contenu.

## 2026-10-31 — Les 3 petites choses (Philippe, t77u)
- **Fusion à l'enclume** : l'enclume a un 2e emplacement (`anvilSpare`, sauvegardé). « Ranger » y met l'outil tenu, ce qui permet d'en fabriquer ou d'en tenir un deuxième. « Fusionner » additionne les durabilités + 10 % du max, plafonné au max (`combineDur`). « Reprendre » rend l'outil rangé.
- **Durabilité des armures** : usure par id (`armorWear`, sauvegardée). Chaque coup reçu use chaque pièce portée de ceil(dégâts / 2). La pièce casse à 0 et est retirée. Max = maxUse s'il existe, sinon 60 + armure × 400. Le bouton « Réparer l'armure portée » de l'enclume répare avec du plastique de qualité adaptée (même `repairCost`). Retirer et remettre une pièce garde l'usure ; une pièce neuve repart à 0.
- **Fonte au four** : en mode Plastique, le bouton « Melt held item » fond l'objet tenu (outil ou armure) selon les mêmes règles que l'enclume : 50 % du coût plastique × durabilité restante, objets en gemmes et en bois refusés.
- Tests : `armor.test.ts` (4 tests).

## B18 — Arbalète tenue façon Lego + caméra de conduite (2026-10-31)
- Arbalète (283) : poignée pistolet sous la crosse, tenue à l'horizontale, pointée vers l'avant, arc horizontal (CROSSBOW_HOLD dans heldPose.ts, testé). Rotation 3e personne ajustée (tpRot).
- Rig Digger : vehView.ts (seatEye, viewBlocked, driverOccluders). En 1re personne, on masque les pièces qui bouchent la vue du conducteur. Obstruction avant → après : fwd 54 %→<25 %, droite 85 %→<25 % (test sur les 4 directions).
- L'objet tenu est masqué quand on est assis dans un véhicule.
- Captures : studcraft-qa/shots/b18-crossbow-fp.png, b18-crossbow-tp.png, b18-drive-{fwd,left,right,rear}.png, b18-drive-montage.png.
- Reste à faire : prise de l'arbalète en 3e personne non vérifiée visuellement (la caméra est derrière le perso).

## B19 — Arbalète Lego refaite : corde + animation de tir (2026-10-31)
- Nouveau modèle procédural (crossbowRig.ts + game.ts) : crosse fine, bloc-poignée sous la crosse pour la main de la figurine, arc horizontal courbé à bouts arrondis, corde tendue des bouts jusqu'à la noix, carreau visible quand c'est chargé. Matériaux skin() (shader SNR quand le plastique est activé). L'icône est refaite.
- Animation synchronisée avec shootHeld() : armée (corde à la noix + carreau) → tir (la corde claque vers l'avant, les bouts de l'arc fléchissent, recul des bras et de l'arbalète, le carreau part comme projectile via launchArrow) → réarmement court (0,55 s). On ne peut pas retirer avant la fin du réarmement. Même pose en 1re et 3e personne (recul sur figHeldGroup).
- La tenue B18 (horizontale, vers l'avant) est conservée. Hooks QA : xbShoot, xbHold.
- Tests : crossbowRig.test.ts (5), 213/213 au total.
- Captures : studcraft-qa/shots/b19-crossbow-{idle,drawn,fire,fire-tp,front-tp}.png.
- Limite : la 3e personne n'est pas vérifiable à l'image (caméra derrière le perso, l'arbalète est cachée par le corps).
## 2026-10-31 — Bonsai 1.7B Q1_0 robuste dans le navigateur (PR grokbot/bonsai-1bit)
- **Diagnostic** : Q1_0 (GGML type 41) est dans llama.cpp upstream depuis la PR #21273 (6 avril 2026), avec les noyaux CPU Metal et CUDA. Le fork PrismML (`PrismML-Eng/llama.cpp`, branche `prism`) n'est plus requis que pour PQ2_0 et PTQ1_0 (Bonsai 2). Le wasm de wllama 3.8.1 contient les noyaux CPU `block_q1_0`, le repack `q1_0 x4/x8` et les shaders WebGPU `MUL_ACC_Q1_0`. Je n'ai donc pas eu besoin d'une build emscripten maison. Elle était de toute façon impossible ici : le disque de la box est plein (128 Go, moins de 700 Mo libres).
- **Preuve headless** (Chrome Playwright, CPU, prompt et grammaire réels du jeu) : JSON de quête valide. Harnais seul, 4 threads, isolé : prompt 6,0 t/s, génération 4,0 t/s (62 s pour 262 + 75 jetons). Avec WebGPU (adaptateur SwiftShader) : 6,9 / 4,6 t/s. Dans le jeu complet (rendu SwiftShader sur CPU, CPU saturé) : JSON valide en 214 s. En natif (llama-server prism-b12128, 4 threads) : prompt 120 t/s, génération 40 t/s, 3 essais valides.
- **Modèle auto-hébergé** : la GGUF d'origine est découpée en octets en 11 morceaux de 24 000 000 octets maximum dans `public/models/bonsai/`, avec `manifest.json` (tailles, sha256 par morceau, sha256 global 3d7c6c90…). gguf-split est inutilisable ici parce que token_embd seul pèse 43,7 Mo. wllama 3.8.1 (JS et wasm de 8,8 Mo) est auto-hébergé dans `public/wllama/`.
- **Chargeur** (`runtime.ts`) : 3 téléchargements en parallèle, reprise par Range, détection des blocages (30 s), sha256 vérifié par morceau, cache OPFS (marqueur `.ok`), sinon Cache API, sinon mémoire. Le Blob est réassemblé puis passé à `wllama.loadModel`. Si le chargement échoue avec une erreur GGUF ou tenseur, le cache est purgé. Une sonde mémoire réserve 1 Gio de wasm. Délais : chargement 180 s, génération 240 s. Un seul appel à la fois : un appel qui arrive pendant une génération est rejeté et la quête devient procédurale. Après un crash ou un timeout, le moteur est fermé et relancé automatiquement (5 s, 20 s, 60 s puis 180 s). Le multi-thread n'est activé que si `crossOriginIsolated`, avec au plus la moitié des cœurs (4 maximum).
- **Bonsai uniquement** : le repli Qwen2.5-0.5B est supprimé et un test interdit tout autre modèle et tout téléchargement depuis HF. Le procédural ne sert que pendant le téléchargement, le chargement ou un redémarrage.
- **Transport** : IPC d'abord (`window.studcraftNative.llm`, pour la future app de bureau), sinon WASM.
- **Build** : `vite.llmAssets.ts` copie `wllama/` et `models/` dans la sortie standalone et écrit le `_headers` Pages (COOP same-origin + COEP credentialless, cache immutable sur /models). En dev, ces dossiers sont servis avec Range et les mêmes en-têtes.
- Hooks QA : `__controlsTest.getLlm()` et `llmGenerate(prompt, grammar)`. `PREFETCH_TIMEOUT_MS` passe à 200 s.
- Rebase sur main (80786b6, #12/#13) : conflits résolus en gardant les deux côtés (hooks QA arbalète + hooks Bonsai, journal).

## 2026-10-31 — Agriculture, décoration, animaux + audit du shader SNR (Grok Bot)
- `farming.ts` (pur, testé) : hydratation (eau ≤ 4 blocs ou pluie), lumière (ciel × jour ou lanterne), chance de pousse (0 sous lumière 9, ×2 si hydraté), stades blé/carotte/patate/betterave/baies, tiges citrouille/melon qui posent le fruit à côté, canne (eau près du sol) et cactus (sable, côtés libres), max 3.
- Boucle de croissance réécrite : terre labourée sèche → terre, villageois qui récoltent et replantent les cultures mûres, cactus ajouté à la boucle de la canne.
- Récoltes : produit + graines (harvestDrops), aussi au cassage ; piétinement à l'atterrissage ; fertilisant (os ou composteur) ; composteur à 4 niveaux.
- Nourriture : sucre (canne), gâteau (blé, lait, œuf, sucre), le four cuit le blé en pain.
- Plastique : la matière végétale n'est jamais du plastique — paille/blé/canne = combustible, légumes refusés (« compost it »).
- Décoration : 22 pièces (ids 500–531, Uint16) avec formes dédiées dans le mesher ; les tuiles sont empruntées (`skinOf`) → zéro nouvelle ligne d'atlas, mémoire texture inchangée ; deux tableaux procéduraux.
- Audit shader : `shaderAudit.test.ts` échoue si un matériau n'utilise pas sirenize/sirenizeWorld/skin sans note `snr-exempt:`. Drapeaux d'illageois → skin(), soudure → sirenize ; 45 exemptions justifiées (ciel, HUD, lignes, halos, replis Lambert).
- Tests : 226/226. Captures : b20-farm.png, b20-decor.png.
## 2026-10-31 — App de bureau (Steam) : Bonsai en natif (PR grokbot/desktop-bonsai)
- Le dépôt n'avait aucun wrapper de bureau (seulement l'APK Android). Ajout de `desktop/` : Electron minimal (`main.cjs` sert dist-game sur `app://game/` parce que les modules ES sont bloqués sur file://), `preload.cjs` (pont IPC `window.studcraftNative.llm`) et `sidecar.cjs` (llama-server du fork PrismML sur 127.0.0.1 avec un port libre, health-check, `-ngl 99`, threads = cœurs/2, redémarrage automatique avec backoff, kill + relance en cas de timeout).
- `scripts/fetch-runtime.mjs` télécharge pendant le build la GGUF depuis HF (taille et sha256 épinglés) et l'asset de la release `prism-b12128-d7b2896` de la plateforme (Windows : `win-vulkan-x64`), vérifié contre le digest GitHub. Rien de 248 Mo n'entre dans git pour le bureau.
- Smoke test sur la box (`scripts/smoke.mjs`, binaire Linux du fork, CPU, 4 threads) : 3/3 quêtes JSON valides via `parseLlm`, prompt 134 t/s et génération 37 à 46 t/s. Après un SIGKILL du serveur, il redémarre automatiquement.
- Compilation du fork depuis les sources impossible sur la box : pas de g++, et apt refuse à cause des paquets bloqués (« held »), que je n'ai pas forcés. J'utilise donc les binaires officiels des releases du fork. La procédure Windows (Vulkan/AMD) et la compilation manuelle sont dans `desktop/README.md`.
- Electron n'est ni installé ni lancé sur la box (disque plein). PR laissée ouverte pour un test sur le PC de Philippe.
- Vérification du web sur main a3ffb67 (serveur de dev, en-têtes identiques) : 11/11 morceaux dans OPFS (248 302 272 octets), moteur wasm prêt en 29 s. Dans le jeu complet, 1re quête JSON valide en 65 s, 2e en 19,8 s grâce au cache du préfixe. studcraft.pages.dev sert toujours #13 à 18 h 03 HP : le déploiement de #14 ne s'est pas fait côté watcher, qui est hors de mon accès.

## t91u — Accessoires minifig (annuaire p.4) + armes à feu à cartouches
- Diff de l'annuaire d'accessoires (p.4) contre le jeu : 60 accessoires manquants ajoutés (ids 540–603) dans `accessories.ts`, piloté par données : modèles SNR procéduraux (tout passe par `skin()`), icônes SVG générées par projection des pièces, prises 1re/3e personne, recettes (ingrédients résolus par nom, tous obtenables).
- Déjà présents donc non dupliqués : pelle, pioche, tonneau, pomme, arc, arbalète, bouclier, casquette.
- Fonctionnels : outils (pioche/hache/épée avec durabilité), nourriture, casques/dos portés (armure), extincteur (éteint le feu), jumelles/loupe (zoom / dureté), mégaphone (repousse les mobs), talkie (radio), instruments (notes), balai (nettoie l'herbe), menottes (mob ralenti 30 s), sabre laser lumineux.
- Armes : `firearms.ts` — chargeur, rechargement (R), cadence auto/semi, recul, flash de bouche procédural, chute de dégâts, consommation de munitions, usure, compteur HUD. Cartouche = douille (cuivre) + poudre Popper + balle ; Carabine 20 coups auto, Fusil 5 coups ; blasters à cellules d'énergie ; baguette sans munitions.
- Tests : accessories.test.ts (63) + firearms.test.ts (6) — 297 tests au vert.
- Captures : studcraft-qa/shots/b20-acc-*.png.
- Mise à jour 18 h 05 HP : PR #15 rebasée sur a3ffb67, tsc + 228/228 tests verts, smoke natif relancé (3/3 valides, génération 40,9 à 44 t/s, redémarrage après SIGKILL OK). Fusionnée : b3e0d8e.
## 2026-10-31 — B21 : QA systématique et corrections (branche grokbot/qa-b21)
- Checklist : `/workspace/studcraft-qa/bugs-b21.md`, captures dans `/workspace/studcraft-qa/b21-shots/`. Harnais Playwright (SwiftShader) hors dépôt + crochets QA inertes : `enterVehicleQa`, `leaveVehicleQa`, `getDriveView`, `setThirdQa`, `talkQa`, `contractsQa`, `claimQa`, `storyQa`.
- Véhicules : le regard du conducteur est maintenant aligné sur l'avant du véhicule à l'entrée (on conduisait en regardant par la fenêtre latérale) et tourne avec lui. La caméra 3e personne en conduite est une caméra de poursuite placée hors de la machine (avant, elle était dans la carrosserie). Le stationnement en pente soulève la construction au lieu de refuser. Le garage TEKS livre au sol, avec la même ancre que le catalogue ; avant, les roues étaient toujours dans le terrain et on avait « No room ».
- LLM : le Director sérialise les pré-générations, car le modèle refusait la 2e et la remplaçait par une quête procédurale. Les issues des contrats (réussite ou échec) alimentent enfin le contexte de l'histoire : `outcome()` n'était jamais appelé. Test de bout en bout avec Bonsai (wasm, SwiftShader) : chef → quête procédurale, quête LLM pré-générée en 117 s (« Chicken in the Village », kill ×3), acceptée, contrat « have » réclamé, issue enregistrée.

## t92u — Phase B : modèles d'armes dédiés (catalogue v2)
- Le PDF v2 (4 p.) reprend le même répertoire CAT-06 que celui livré en #17 (60 accessoires) : rien de manquant côté liste.
- Nouveau `weaponModels.ts` : 12 armes construites sur mesure (profils extrudés biseautés, canons tournés, poignées gainées, lames à vrai tranchant) — carabine (rail, viseur point rouge, chargeur courbe, crosse squelette, pastilles tenon LEGO orange), fusil (lunette, verrou à boule, crosse bois d'un seul tenant, cartouches laiton visibles), revolver (barillet cannelé 6 chambres), pistolet à silex et mousquet (platine, chien en S, silex, baguette, baïonnette), épée courte (lame feuille), épée longue (garde arquée, gemmes lumineuses), katana (tsuba à 4 lobes, habaki, sori, hamon), sabre d'abordage (coquille laiton), hallebarde (croissant, crochet, pompon), hache de pompier, sabre laser (poignée chromée, lame à cœur blanc).
- Toutes les matières passent par skin() (chemin SNR) avec finitions métal/bleui/or/bois/caoutchouc/verre/lumineux.
- Tests : weaponModels.test.ts (12) — 309 tests au vert. Captures b21-minifig-*.png.

## B21 — véhicules armés + cockpits (t92u, voie « vehicles », clone /workspace/studcraft-vehicles) — 31 oct. 2026 (PDT)
Plan (phases, une PR par phase, merge quand tsc + node --test + vite build sont verts) :
1. Phase A — données et logique pure : 9 pièces Teks procédurales (canon plastique, canon or, laser émeraude, lance-roquettes, tourelle ; siège ouvert, cabine vitrée, arceau buggy, cabine mech), 3 munitions, recettes (plastique / or / émeraude / verre), garage + vendeur d'améliorations, vehArms.ts (munitions, énergie, chauffe, dégâts, règles de crime), cockpits.ts (œil, tableau de bord, vitres), vehBuild.ts (validation : cockpit + source d'énergie), prefabs équipés, tests.
2. Phase B — intégration game.ts : œil du conducteur au cockpit, bascule 1re/3e personne (touche V), vitres en verre SNR, tir à la souris en conduisant (tourelle = visée libre, sinon verrouillé vers l'avant), projectiles et effets procéduraux, dégâts mobs/blocs avec réputation, HUD tableau de bord.
3. Phase C — garage : validation à l'entrée dans le véhicule et à la sauvegarde du modèle, captures QA b21-veh-*.
- ~18:25 Clone neuf (sparse, sans public/models ni PDF, disque plein) depuis main 35b6109 ; node_modules = lien vers studcraft-structures. Base : tsc 0, 297/297 tests.
- ~18:50 Phase A codée : IDs 640-651 (plage réservée pour ne pas croiser la voie minifig 604+), specs teks.ts, vehArms.ts, cockpits.ts, vehBuild.ts, recettes B21 (pas de fonte plastique automatique pour ces pièces), offres mécanicien/vendeur, rôles weapon/turret/cockpit dans vehicle.ts. Buggy de départ : arceau + canon ; Rig Digger : cabine mech (positions trouvées par la loi de placement). 10 tests vehArms : 307/307, tsc 0, vite build OK.
## t92u — Phase C : tenues minifig pour PNJ, gardes, chefs et guildes
- `OUTFITS` + `wearOutfit()` (game.ts) : coiffes sur mesure (casque de chantier à lampe, casque spatial à visière dorée et antenne, heaume de chevalier à visière, fentes et plumet, casquette, bicorne à cocarde, capuche à yeux luisants), dos/épaules (sac à dos avec sac de couchage, bouteilles d'air, carquois fléché, cape à col et fermoirs, cuirasse à épaulières) et objets tenus (armes dédiées ou accessoires du catalogue).
- Gardes : heaume + cuirasse + hallebarde + bouclier triangulaire ; chef : bicorne + cape + calice ; receleur : bicorne + cape + sabre ; marchand-équipementier : casquette + sac + valise (ces deux rôles tombaient avant sur la tenue de mécanicien).
- 13 guildes habillées (techno, guerriers, marchands, envoyés, voleurs, rôdeurs, mécanos, alchimistes, mineurs, explorateurs, bâtisseurs, forgerons, assassins) ; les sorciers gardent leur tenue de mage.
- Crochet QA `spawnOutfit`. Tests : outfits.test.ts (3) — 315 au vert. Captures b21-minifig-outfits-1..4.png.

### B21 véhicules — Phase B + C (2026-10-31, Grok Bot)
- **Phase B (game.ts)** : l'œil du pilote vient du cockpit (`cockpitEye`, repli `computeSeatEye`) ; le cockpit n'est jamais masqué comme occultant (`driverOccluders`) ; vitres du cockpit = boîtes procédurales en `skin()` transparent (SNR, audit OK) qui suivent la matrice du cockpit.
- Touche **V** en conduite : bascule 1re / 3e personne (F5 marche toujours).
- **Tir en conduite** : clic gauche (bouton ✸ tactile, gâchette RT) = tir de toutes les armes ; tourelle → visée souris, sinon verrouillé vers l'avant. Munitions prises dans l'inventaire (∞ en créatif), énergie = batterie du véhicule.
  - canon plastique : boulet balistique, écaille 5 pièces du bloc touché ; canon en or / roquettes : explosion (`explode`, sans blesser le pilote) + dégâts de zone aux mobs ; laser émeraude : rayon instantané, brûle mobs et blocs (temps selon dureté), chaleur/surchauffe.
  - Crime/réputation : `societyCrimeAt(..., "break")` par impact, `addRep` négatif sur villageois/golems (mêmes règles que les balles).
  - Effets : flash + fumée à la bouche, recul, secousse, étincelles d'impact, rayon vert.
- Tableau de bord HUD : vitesse, énergie, arme(s) + munitions/chaleur.
- **Phase C** : validation du garage à l'entrée (cockpit + hub requis, sinon message) et à la sauvegarde catalogue (sauvegardé quand même, avec l'état « Build OK / not ready »).
- Hooks QA : `vehFireQa`, `getVehArmsQa`. Tests : +3 (muzzles/pod, cockpit non masqué, câblage game.ts) → 325/325. tsc 0, vite build OK.
- Captures (SwiftShader) : /workspace/studcraft-qa/shots/b21-veh-*.png.
- B21 lot 2 : contrats de récolte nommant l'objet et titres propres aux guildes ; ancrage des modèles sur le vrai sol (surfaceBelow) au lieu de la hauteur du générateur ; les servos gardent leur angle au relâchement. Ouvert : le godet du Rig Digger n'atteint pas le sol.

## t100u — Exe Windows StudCraft + Bonsai 1.7B Q1_0 embarqué (2026-10-31, Grok Bot)
- Correctif : `desktop/` embarque aussi le llama-server CPU (`resources/llama-cpu`, release PrismML `win-cpu-x64`) en repli matériel ; le sidecar bascule une fois sur le CPU (`-ngl 0`, même modèle) si le binaire Vulkan ne devient jamais sain. `STUDCRAFT_CPU=1` force le CPU. `status()` expose `backend`.
- Construit sur DESKTOP-DR74Q85 (Ryzen 5 5500U, Radeon intégrée, pilote 31.0.21921.1000) : `--list-devices` → `Vulkan0: AMD Radeon(TM) Graphics`.
- Smoke (prompt + grammaire réels du jeu) : Vulkan 3/3 quêtes valides, tg ≈ 20–21 t/s ; CPU 3/3, tg ≈ 20–24 t/s ; redémarrage après kill OK.
- llama-bench : Vulkan pp128 131 t/s / tg64 22.8 t/s ; CPU (6 threads) pp128 45 t/s / tg64 25.8 t/s.
- `electron-builder --win dir` → `win-unpacked` 740 Mo, modèle sha256 vérifié dans `resources/models`. L'exe démarre, lance llama-server Vulkan (`-ngl 99`), écran titre affiché.
### B21 lot 3 — Rig Digger qui creuse + vue cockpit de la Starter Buggy (2026-10-31, Grok Bot)
- **Bug #12 (Rig Digger)** : cause = canaux liés dans l'ordre des pièces, donc la tourelle (axe vertical) tombait sur B et le premier canal essayé faisait pivoter la flèche sur le côté ; en plus, le godet traversait le terrain comme un fantôme jusque sous la machine.
  - `ModelPart.ch` (optionnel) : le Rig Digger lie ses articulations par rôle — **B = flèche** (S l'enfonce dans le sol), **C = balancier + godet** (W ressort la charge), **D = tourelle**. Message de chargement explicite.
  - Le sol que le godet ne peut pas prendre (godet plein, trop dur) **arrête le bras** ; un mouvement qui le remonte reste toujours permis.
  - Vérifié en headless sur un plateau plat : B/S → le godet mord à ~7 blocs devant la machine, 4 blocs de terre ramassés (capacité 4), C/W ressort la charge, D tourne la tourelle. Test : catalogue.test « Rig Digger: B lowers the boom… ».
- **Vue 1re personne Starter Buggy** : tableau de bord et volant noirs remplacés par un tableau bas et fin gris clair + petit volant gris ; œil du cockpit-cage avancé et relevé (eye 5.0 / −0.3). **FOV par cockpit branché** (`cockpitFov` : FOV du cockpit décalé de la préférence joueur, 3e personne inchangée). Test vehView.test.
- Hook QA : `getBucket().pos`, `getDriveView().fov`. tsc 0, 333 tests verts, vite build OK. Captures : /workspace/studcraft-fix2-shots/p12-*.png, p2-buggy-fp-before/after.png.

## B21 lot 4 — QA société (headless Playwright)
- Quête de chasse : 4 kills → n=4, réclamation = 3 émeraudes. OK.
- Bug corrigé : les contrats de guilde avaient des ids `guild:<hall>:<epoch>:<slot>` sans la guilde ; dans une desertCity à deux halls, accepter le contrat d'une guilde affichait « Already taken » chez l'autre et une réclamation complétait les deux (et les guildes hors-la-loi entraient en collision avec les contrats du boss bandit). Les ids portent maintenant `@<guilde>`.
- Bug corrigé : une guilde hors-la-loi ne passait jamais à l'époque suivante (clé `bandit:` au lieu de `guild:` lue par game.ts).
- Bug corrigé : la quête d'entrée de guilde pouvait être une chasse au boss ; elle prend désormais la première mission non-boss.
- Hooks QA : `sayLogQa`, `claimQuestQa`.
- Migration des sauvegardes 8 bits → Uint16 : couverte par chunk16.test.ts, code relu, OK.
- Non testé dans ce lot : prison/réputation/argent, fonderie, enclume, agriculture, animaux, butin, shader SNR, z-fighting, armes de véhicule.

## B21 lot 5 — QA étape 3 (société, fonderie, armes de véhicule, visuel, sauvegarde)

Corrigé :
- Réputation commerciale : les villages hors spawn utilisaient une clé arrondie à la position → la réputation était oubliée au pas suivant. Clé désormais par village (`villageAround`).
- Frapper un villageois (mêlée ou véhicule) n'était jamais un crime : `reportCrime(..., "assault")` ajouté.
- Projectiles : sous-pas balayés (arrêt au premier bloc / mob / joueur) → plus de tunnelling à bas FPS.
- `groundY(x, z, fromY)` : mobs et véhicules ne traversent plus les planchers construits > 8 blocs au-dessus du terrain.
- Armes fixes (Starter Buggy) : plage de tangage -0.5..0.25 (avant -0.1..0.25 ×0.3, impossible de toucher les mobs au sol) ; tourelles -0.5..0.9. Test ajouté.
- Sauvegarde : un inventaire mal formé (objet au lieu de paires) rendait le monde impossible à ouvrir ; `normalizeSave` le convertit/filtre. Test ajouté.
- Hooks QA : crimeQa, giveQa, standingQa, furnaceModeQa, vehArmQa, vehMobHpQa, mobsToGroundQa, snrAuditQa.

Testé OK : prison (prime, amende, prison 24 h + confiscation), argent, fonderie normale, butin de 10 mobs, laser/roquette (dégâts + explosion), shader SNR (mode réaliste : tout est siren sauf ciel/particules/FX), migration Uint16 d'une vieille sauvegarde v1 (blocs id ≤ 255, inventaire, position).
Reste : mode plastique sans sortie visible pendant le test (ratio accumulé ; pellets non acceptés, voulu) ; canon/canon doré parfois 0 dégât au tir en roulant (recul) ; enclume et agriculture vérifiées par revue de code et tests unitaires seulement.

## t106u — Gâchettes adaptatives DualSense dans l'exe Electron

État avant : un support WebHID partiel existait (src/game/dualsense.ts, v4.18), mais il était désactivé par défaut, sans autorisation HID dans Electron (aucun sélecteur → jamais connecté dans l'exe), avec un rapport USB trop court (47 octets au lieu de 62) et une trame Bluetooth 0x31 erronée (pas d'octet tag 0x10, mauvaise taille, CRC mal placé, mode « simple » BT jamais quitté).

Fait :
- desktop/hid.cjs (+ test) : setPermissionCheckHandler / setDevicePermissionHandler / select-hid-device n'autorisent que 054c:0ce6 et 054c:0df2, depuis l'origine app://game ; réinitialisation des gâchettes à la fermeture de la fenêtre et en perdant le focus. Ajouté à « files » du package desktop.
- dualsense.ts réécrit : constructeurs purs de rapports (USB 0x02 62 octets, BT 0x31 77 octets avec seq/tag et CRC32 seedé 0xA2 0x31), détection USB/BT par le descripteur, lecture du rapport de fonction 0x05 en BT, modes par zones 0x21 / 0x25 / 0x26, reconnexion automatique (connect/focus).
- triggerFx.ts (pur) : arc = tension croissante, arbalète = verrou qui casse (relâché pendant le réarmement), armes à feu = point de rupture + recul plein à chaque tir, vibration à la cadence en mode auto, rien en rechargement ; véhicule = accélérateur R2 (non armé) plus dur avec la vitesse, frein L2 ; canon / canon doré = mur + coup à chaque tir, laser = vibration, roquettes.
- Contrôles : en véhicule, L2 analogique = frein/marche arrière, R2 analogique = accélérateur si aucune arme montée.
- Option Settings activée par défaut ; reset en pause, perte de focus, onglet caché, pagehide/beforeunload.
- Tests : dualsense.test.ts (CRC, encodage, rapports USB/BT, sélection d'effets), desktop/hid.test.cjs. Sonde Playwright avec un faux navigator.hid : rapports 0x31 de 77 octets, effets arc/arbalète/armes, remise à zéro en pause.
Non testé sur une vraie manette (pas d'accès au PC de Philippe).
## 2026-10-31 20:40 (Vancouver) — Arbres beiges / « en pierre » (atlas)
- Cause : `buildAtlas` peignait aussi les blocs alias `skinOf` (déco de la ferme, PR #16 a3ffb67) sur la tuile de leur cible, avec leurs propres couleurs (#c4924a). Le dernier alias gagnait : Tabouret → tuile Bois, Plante suspendue → tuile Feuilles, tapis → laines, lampadaire → fer, etc. Tous les arbres sortaient beiges, en jeu comme dans le décor du menu, quel que soit le GPU.
- Bisection : dernier bon bb0b547, premier mauvais a3ffb67.
- Correctif : `paintsOwnTile()` (blocks.ts), un alias ne peint jamais. Les 5 boucles de textures.ts l'utilisent.
- Test : src/game/atlasPaint.test.ts (une tuile = un seul peintre, son propriétaire ; herbe, bois, feuilles, pierre, sable).
- Reste à voir : 1267 tuiles pour 832 places dans l'atlas (16×52), donc les tuiles au-delà de la rangée 52 ne sont jamais peintes.

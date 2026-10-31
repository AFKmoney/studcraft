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

## PR 3 — structures de biomes (branche grokbot/biome-structures, empilée sur grokbot/biomes-bosses / PR #5) — 31 oct. 2026 (PDT)
- ~11:13 Clone neuf dans /workspace/studcraft-structures, branche grokbot/biome-structures créée depuis grokbot/biomes-bosses. npm ci ; base : 127/127 tests.
- ~11:16 Audit : hamletOrigin/hamletAt (grille REGION 192, hash2 + salt), siteAt/siteBricks (grille 96, bricks purs relatifs à l'origine), landmarkAt (grille 256), paintHamlet/paintSites (force() par chunk), zoneAt/zoneFor (biomes.ts), stockChest (loot.ts), ouverture de coffre game.ts (pool par proximité).
- ~11:25 Nouveau fichier src/game/structures.ts (mêmes règles : 1 candidat par cellule de 128, tout tiré de hash2(cellule, seed+sel), motifs de briques purs ; seules les variables changent via THEMES par zone). Types : village thématique par zone (cottage/adobe/tour/igloo/pilotis/bunker), Cité du désert (grille 3×3 de rues, immeubles 2–4 étages, palais à dôme, marché), sanctuaires, méchas abandonnés en pièces (mode « posé au sol »), points d'intérêt par zone, caveaux cachés enterrés.
- ~11:27 Exclusions : rayon de 112 autour du hameau de départ et de l'origine, hameaux, sites, landmarks ; chaque structure reste dans sa cellule (aucun chevauchement) ; pente max, pas d'eau (sauf village sur pilotis des îles).
- ~11:28 Intégrations minimales : world.ts (1 import + 1 appel paintStructures après paintSites), loot.ts (pools sanctum/mecha/vault), blocks.ts (2 pièces rares non posables : Sanctum stud 480, Mecha core 481), game.ts (pool du coffre si dans une structure + hook QA findStructureQa) — aucun code de mob touché.
- ~11:33 Tests src/game/structures.test.ts (déterminisme, densité, spawn dégagé, plans par zone avec coffre, régénération de chunk identique, loot) : 134/134 ; tsc 0 erreur.
- ~11:50 Placement ajusté : îlots (le pad comble les hauts-fonds) pour toutes les structures des Îles, pente tolérée +6 dans les zones accidentées (arctique, volcan, montagne, canyon), hauteur du pad bornée par la hauteur dégagée. tsc/tests/build OK.

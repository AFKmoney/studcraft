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

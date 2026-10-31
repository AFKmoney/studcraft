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

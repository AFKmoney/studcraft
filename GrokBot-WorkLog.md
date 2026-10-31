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

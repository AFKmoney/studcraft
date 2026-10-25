# AUDIT 1:1 — Studcraft vs Minecraft (Java 1.21)

*2026-10-24, Muse, à la demande de Philippe (« lance l'audit complet des écarts »).*
*Méthode : inventaire tiré du CODE de Studcraft (defs, types, worldgen, systèmes), pas des
impressions. Les chiffres Minecraft sont des ordres de grandeur publics (~), ceux de Studcraft
sont comptés dans le repo.*

## Les chiffres d'abord

| | Studcraft | Minecraft Java |
|---|---|---|
| Définitions (blocs + items) | **250** (ids 0–249) | ~800 blocs / ~1 200 items |
| Créatures | **22** (+ bateau et wagonnet) | ~75 (+ variantes) |
| Biomes / zones nommées | **13** | ~64 |
| Hauteur du monde | **72** | 384 (−64 à 320) |
| Dimensions | 3 (Overworld, Nether, End) | 3 |
| Recettes de craft | **119** | ~1 000 (craft + four + métiers…) |
| Enchantements | **1 action** (voir plus bas) | ~40 |
| Potions | **3** (Heal, Speed, Strength) | ~40 variantes, ~30 effets |
| Modes de jeu | Survival, Creative | + Adventure, Spectator, Hardcore |
| Multijoueur | **aucun** (0 ligne réseau dans le code jeu) | LAN, serveurs, Realms |

## Système par système

### ✅ Fermé ou presque (le squelette est 1:1)
- **Dimensions** : Overworld / Nether / End, portails, retour après la fin (`won`). Le combat du
  dragon inclut les cristaux (les PV du dragon augmentent avec les cristaux restants).
- **Redstone de base** : dust (+ états On), repeaters, comparators, pistons directionnels,
  hoppers, dispenser (logique comp présente), plaques de pression, leviers, note block, TNT.
- **Stations** : établi, four, coffre, table d'enchantement, enclume (réparation « mend »),
  alchimie (stand présent, voir potions), métiers via hamlets.
- **Agriculture** : blé, carotte, pomme de terre, betterave, citrouille, melon, canne, cactus,
  champignons, baies, miel, farmland + croissance par stades.
- **Équipement** : 4 paliers MC (bois→diamant) + paliers originaux (bronze, chrome, prism…),
  armures complètes, bouclier, arc, canne à pêche, cisailles, seaux (eau/lave/lait), selle,
  laisse, totem, boussole, horloge, carte, bannière, élytra **fonctionnel** (« Glide shell » :
  plané implémenté dans la physique), bateau + wagonnet/rails comme entités.
- **Structures** : hamlets avec rôles (Clerk, Mason, Smith…), 10 types de sites (ruine, outpost,
  tombe, camp, sanctuaire, cairn, mine, récif, épave, parcelle), temple jungle, End cities.
- **Original Studcraft (au-delà de MC)** : arbre de skills + sorts/mana, ranks (Builder levels),
  quêtes, métaux originaux (étain→bronze, ambre, chrome, saphir, résine, prisme, Master Brick),
  mobs originaux (crab, wisp), biomes « LEGO » (Brick plains, Ash ridge, Baseplate).

### 🟡 Présent mais mince (le vrai écart = la profondeur)
- **Enchantements — le plus mince des systèmes.** L'action « enchant » actuelle : coûte 3
  Builder levels, pose un flag « sharp » sur l'épée, affiche au hasard « Fire aspect » ou
  « Sharpness », et rafraîchit la durabilité des outils de la hotbar. Aucun enchantement
  par item, aucun niveau I–V, pas de livres, pas de lapis, pas de combinaison à l'enclume,
  pas de grindstone. MC : ~40 enchantements exclusifs/combinables.
- **Potions** : 3 potions fixes. MC : effets (~30), durées/niveaux, splash/lingering, flèches
  tippées, chaudron, ingrédients chaînés (l'item Wart existe, la chaîne d'alchimie non).
- **Villageois** : des rôles + quêtes + un écran d'échange simple. MC : 13 professions,
  métiers à paliers avec stock/refresh, réputation, rabais après cure, raids.
- **Mobs** : 22 créatures avec IA par paliers. Manquent des piliers MC : **Enderman** (absent!),
  Blaze (item seulement), Witch, Shulker, Guardian, les Illagers + raids, abeilles, chèvres,
  axolotl, chats, perroquets, chauve-souris, calmars… et presque toutes les variantes
  (Drowned, Husk, Stray, Zombified Piglin).
- **Biomes** : 13 zones contre ~64. Il manque surtout les variantes (forêts, taïgas, savanes,
  marais à mangrove, cerisiers…) et les 5 biomes du Nether (le Nether de Studcraft = 1 zone).
- **Génération du monde** : hauteur 72 (MC 384), minerais en poches hash bloc-par-bloc —
  **aucun réseau de caves procédurales** dans le code de génération (pas de carve/tunnel),
  pas de filons, pas de lacs de lave souterrains, pas de géodes.
- **Blocs de construction** : **pas de dalles, pas d'escaliers, pas de panneaux (signs)**,
  une seule essence de bois (Log/Planks), pas de trappes variantes, pas de portes variantes.
  Pour un jeu de briques c'est LE manque visible côté build.
- **Redstone avancée** : l'Observer existe comme bloc mais sa logique n'apparaît pas dans le
  système de comps; pas de quasi-connectivity, pas de lectures comparator sur conteneurs,
  pas de daylight sensor, pas de sculk.
- **Survie** : la faim existe; les niveaux sont les Builder levels (ranks), pas l'XP de MC
  (pas d'orbes, pas de coût d'enclume en XP). Pas de Hardcore, pas de Spectator.

### 🔴 Absent
- **Multijoueur** — zéro code réseau. C'est le seul écart « catégorie entière ».
- Raids et Illagers; Warden et cités anciennes; monuments océaniques; manoirs; trial chambers;
  forteresses du Nether structurées + bastions (le Nether a le décor, pas les structures habitées
  — les Piglins existent comme mobs, le bartering n'est pas vérifié).
- Beacon, conduit, shulker box, feux d'artifice, arbalète, trident, livres enchantés,
  étiquettes (name tags), armures de cheval, cadres/paintings, jukebox à disques.
- Avancements (achievements) au sens MC — partiellement couverts par quêtes + ranks.
- Commandes / cheats, statistiques, écran de debug.

## Ordre de bataille proposé (impact joueur ÷ effort)

1. **Dalles + escaliers + panneaux** — petit effort (mesher + defs), énorme gain pour builder.
2. **Enchantements vrais** — par item, niveaux, table à livres, anvil combine : transforme la
   progression. Effort moyen.
3. **Enderman + 6–8 mobs piliers** (Blaze mob, Witch, abeille, chat, calmar, chauve-souris,
   Drowned) — le bestiaire se remplit vite, le système d'IA existe déjà.
4. **Caves** — carve 3D dans le worldgen + filons : change l'exploration et le minage.
5. **Alchimie complète** — effets + splash + chaîne d'ingrédients.
6. **Biomes** — variantes par bruit existant (le système biomeOf s'étend bien) + Nether en 3–4
   zones.
7. **Professions de villageois** — métiers à paliers sur l'écran trade existant.
8. **Multijoueur** — le chantier séparé : architecture client-serveur, synchro de chunks,
   casse le « 100 % offline ». À décider comme un produit, pas comme un patch.

*Verdict de l'audit : la checklist « features » de Minecraft est fermée à ~85 %. Ce qui sépare
Studcraft du 1:1 maintenant : 1 catégorie absente (multi), 3 systèmes minces (enchants,
potions, villageois), le contenu (mobs/biomes/caves), et les blocs de construction fins.*

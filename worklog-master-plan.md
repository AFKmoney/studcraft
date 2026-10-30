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

**Statut 2026-10-30 :**
- `sites.ts` : kind + siteBricks (chambre 7×7, ladder, 3 chests) poussé.
- `world.ts` : placement rare (hash2 < 0.07 sur terrain plat > SEA+5) + clear d'entrée poussé sur la branche.
- `loot.ts` : table `dungeon` ajoutée (haut tier + isMajor) — les coffres du donjon se remplissent automatiquement via le kind.
- Prochaine : vérifier en jeu sur Pages + ajouter des moules rares spécifiques si IDs disponibles.

**Prochaine étape :** restaurer/pousser world.ts sur la branche, puis loot rare.

### Gravité universelle — scoping (EN COURS — Grok)
**Claim :** `EN COURS (Grok)` — design only, pas de code avant validation.

**Design du scan de support par composantes :**
- Le terrain naturel (généré) forme **un seul composant ancré au bedrock**. Il ne s'effondre jamais.
- Les constructions du joueur (briques, planches, etc.) sont des **composantes détachées**.
- Scan : flood-fill ou union-find des blocs non-terrain. Un composant tombe si son nombre de points d'ancrage (studs couverts ou contacts solides sur terrain/ancré) < 2.
- Ancrage bedrock : toute colonne qui touche le bedrock (ou une couche de base immuable) est marquée ancrée.
- Implémentation progressive : d'abord détecter les composantes "floating" après un mine/break, puis appliquer le faller existant.
- Performance : scan local (rayon limité autour du break) + cache de composantes.
- Règle : 1 support restant = tombe (comme les arbres).

**Question ouverte :** seuil exact d'ancrage (studs vs contacts de face) et si les arbres restent un cas spécial ou rejoignent le système général.

### P5b · Conduite — design d’un véhicule qui roule (EN COURS — Grok)
**Claim :** `EN COURS (Grok)` — design d'abord.

**Design :**
- Une construction Technic devient un **corps cinématique unique** (masse + centre de masse calculés des pièces).
- Roues = raycasts de suspension vers le bas (pas de corps rigide par brique).
- Différentiel (A+B)/2 déjà existant dans mech.
- Hub + canaux A–D : le joueur lie un hub à la machine ; les moteurs répondent aux canaux.
- Plus petit véhicule : 4 roues + chassis + 1 moteur + hub. Il roule sur le terrain en suivant la physique cinématique (pas de Physijs/cannon full rigid body par pièce).
- Représentation build == run : la même géométrie sert à la fois pour le build et pour la simulation de conduite.

**Prochaine étape :** prototype minimal (4 roues + moteur) en mode créatif, mesuré sur Pages.

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

**Note Grok 2026-10-30 :** Claims posés. Designs écrits. Travail sur branche `grok/r3-dungeon-designs` (pas sur main). Implémentation progressive à suivre (dungeon en priorité car ferme P6). Tout push sera marqué ici.

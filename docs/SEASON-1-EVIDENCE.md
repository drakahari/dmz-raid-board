# Season 1 acquisition research

Checked 2026-11-06. This evidence supplements the existing DMZ Raid Board catalog; it does not replace owner-confirmed quantities or change their verification scope.

## Target and coverage

The repository targets **Call of Duty: Modern Warfare 4 DMZ**, not the 2022 DMZ beta. The [Season 1 patch notes](https://www.callofduty.com/patchnotes/2026/11/call-of-duty-modern-warfare-4-season-1-patch-notes) and [announcement](https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-warzone-season-1-announcement) establish X01, new Orders and FOB changes. The newly disclosed station does not establish any particular material recipe.

The external acquisition dataset contains **109 records**:

| Kind | Count | Scope |
|---|---:|---|
| Weapon Manual/unlock | 34 | 32 launch firearm/launcher Manuals listed by the community index, plus two official seasonal base-weapon Manual grants. |
| Weapon build blueprint | 59 | 35 Season 1 Battle Pass/BlackCell entries including variants, 17 announced Store entries, seven preseason Vault/Beta/preorder entries. |
| X01 loot item | 16 | Gear, keys and valuables with individual community source pages. |

The existing **120 printer/upgrade records** are derived separately into the library. A manual review of the current [95-recipe index](https://dmzcodex.com/recipes/) against the local 95 non-upgrade records found the same set, after normalizing Control Units, NVGs and Stun naming. All compared quantities match except the Detonators conflict below. This comparison does not prove every currently available in-game recipe is published.

## Unlock categories

The [official FOB guide](https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-dmz-how-to-play-forward-operating-base-guide?pubDate=20261018) separates finding/extracting a reusable Printer Recipe from finding/extracting a Weapon Manual, and separates both from physical equipment. Gunsmith access begins at DMZ Level 10; Vendor access begins at Level 5. Vendor stock rotates. Weapon ownership, recipe eligibility and sufficient resources remain different facts.

The [canonical Season 1 Battle Pass article](https://www.callofduty.com/blog/2026/11/call-of-duty-modern-warfare-4-season-1-battle-pass-blackcell-store-bundles), dated November 5, supplies the seasonal names and tiers. A base Manual is granted for each earned BlackCell Blueprint, each free seasonal base-weapon unlock, and matching purchased Store/Vault blueprints. Ordinary blueprint ownership and discounted build replacement remain separate. The localized `/au/en/` article omitted some newer footnote details, so the canonical page controls those routes. No current universal purchase price or replacement discount percentage is established.

The [launch weapon roster](https://www.callofduty.com/patchnotes/2026/10/call-of-duty-modern-warfare-4-launch-patch-notes) has 33 weapons including a knife. The acquisition dataset has **no invented knife Manual**: the [current community item index](https://dmzcodex.com/items/) explicitly lists 32 firearm/launcher Manuals. Per-weapon guaranteed loot spawns and universal Manual requirements are not established. The [Gunsmith guide](https://dmzcodex.com/guides/dmz-gunsmith-weapons-guide/) identifies differing official descriptions of cross-mode access; players must check their displayed eligibility.

The seven preseason build records come from the [edition guide](https://www.callofduty.com/blog/2026/05/call-of-duty-modern-warfare-4-preorder-benefits-game-editions-details?pubDate=20261018), FOB guide and [blueprint acquisition guide](https://dmzcodex.com/guides/dmz-weapon-blueprints-guide/). Expired Beta/preorder offers are marked as past offers. BlackCell suffixes distinguish variants in the app; exact menu spelling is not independently verified for every variant. The official heading spells one Kastov blueprint “Guardian Best”; that spelling is retained pending menu evidence.

## New items and unknown recipes

The [current item index](https://dmzcodex.com/items/) added individual X01 item pages. They support community-reported names for 16 gear/key/valuable entries; those records link their own pages. The index and guide can update at different times, so a stale guide is not evidence a newly indexed item does not exist.

No new item in this batch is relabeled as a printer ingredient without a verified use. In particular, **R-4 Bio-Compound** and **Weapons Grade Isotope** are currently categorized as valuables. There are no confirmed material quantities for the 3.5-Plate Armor Vest or Encoder transformations. Unknown costs are `null`, and none are represented as zero-cost recipes. The [X01 guide](https://dmzcodex.com/guides/x01-map-guide/) also describes unverified Deep Vault key consumption and alternate routes. Its 406 reporting is not conflated with the independently indexed 301 key. Acquisition locations are investigatory leads where the source says the exact pickup route is unknown.

## Recipe guidance overlay and conflict

`printer-overrides.json` contains 14 **unlock-only** updates, with their own source check date. Those dates must not overwrite existing ingredient verification dates. More specific Orders guidance covers C4, Flash, DDoS, Decoy, Large Backpack, Recon Drone and standard NVGs. Six starting recipes are clarified as Level 2 Printer access. Radiation Blockers no longer needs the obsolete unresolved-cost warning in its unlock field; its owner-confirmed cost stays intact.

**Unresolved Detonators printing conflict:** [DMZ Codex Detonators](https://dmzcodex.com/recipes/detonators/) reports 20 Electronics and 20 Metals; [COD Central](https://codcentral.net/blog/mw4-dmz-3d-printer-recipes/), updated November 3, reports 20 Electronics and 20 Chemicals. The existing catalog matches COD Central. Preserve it and expose the conflict until a current game card settles it. No owner evidence was found for this ingredient-printing card.

## Images and exclusions

No new game artwork was downloaded or generated. Item-page footers attribute game imagery to Activision; crawling permission is not redistribution permission. No affirmative grant for new item/blueprint assets was established in the reviewed sources. Use labeled placeholders for these records and preserve the repository’s existing asset handling and notices. No image hotlinks or background network fetching are introduced.

Restricted DMZTracker/DMZHub collections and Destructoid/OGHub bulk content were not copied. Research stores normalized names, counts, source references and original brief guidance rather than third-party article descriptions or site layouts.

## Remaining coverage gaps

- Full current cosmetic blueprint total, historical Store rotations, later seasonal events and prestige rewards are not established by the reviewed sources.
- The 17 announced Store build entries are seasonal announcements; individual live sale dates and prices are unverified.
- Exact new printer ingredient names, all new X01 recipes, Encoder inputs/output quantities, vendor offers and account-specific prices still need current menu evidence.
- New gear/keys/valuables are community reports, not owner-confirmed item cards; drop guarantees and some locations remain unknown.
- Image rights and exact art remain unresolved for new entries.

Catalog coverage is therefore comprehensive against the explicit compared sets above, **not a claim of every current/future game item or blueprint**.


## Credited Windows image update

The initial no-new-art decision above is historical. At the owner's subsequent explicit request, candidate 0.1.9-season1.2 includes 44 unmodified source images mapped to 94 new records, with full credits and unresolved-rights disclosure. No license finding changed. Fifteen X01 entries still have no verified source picture. See IMAGE-UPDATE-2026-11-06.md and the exact per-file/per-entry IMAGE-SOURCES-2026-11-06.json.

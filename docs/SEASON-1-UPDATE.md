# Season 1 Windows test build

Version `0.1.9-season1.2`, researched 6 November 2026 for Modern Warfare 4 DMZ Season 1. This is a Windows test build prepared for a clearly labeled prerelease.

## Using the library

Open **Blueprint & item library**. Search by name, ingredient, unlock or location; combine category, type, season, acquisition method, progress and wanted filters. The library pages through 20 records at a time.

- **Your unlock record** is a manual record of what you found/acquired or unlocked in game. It never changes from picking up loot or planning a craft.
- **Want this** keeps a separate list of goals.
- **Add to raid plan** selects one acquisition route and quantity. Existing printer selections are shared with the original planner, so adding the same recipe through either view never doubles its requirements. Permanent tiers still replace another tier in the same family.
- **Add item to raid** adds a physical Manual, key, gear or valuable as a manual extra. This targets the item itself, not an unverified recipe.
- A route with unknown requirements cannot be used to create a crafting plan. Its name, evidence and unlock guidance remain searchable. Picking up a Manual is separate from successfully extracting it; record its unlock yourself.

## Coverage and limits

The library has 229 records: 120 existing printer recipes/upgrade tiers, 34 Weapon Manual records, 59 cosmetic weapon blueprints, and 16 X01 items. There are 70 Season 1 records and 90 supported checklist names including legacy currency compatibility (currency remains omitted from raid targets). The 59 cosmetic entries include 35 seasonal Battle Pass/BlackCell records, 17 announced Store entries whose live availability is unverified, and seven preseason Vault/Beta/preorder entries.

The research compared all 95 published non-upgrade printer recipes and added 14 more specific unlock guides. It does not establish a complete current in-game blueprint inventory, Store rotation, vendor stock, new printer catalog or every account-specific unlock. See [research and sources](SEASON-1-EVIDENCE.md) and [printer comparison](season1-printer-audit.json).

No new ingredient names or quantities were established with sufficient evidence to import as recipes. R-4 Bio-Compound and Weapons Grade Isotope are listed as valuables pending evidence of crafting use. The new named X01 gear/keys/valuables can be tracked as loot, with their recipes explicitly unresolved. Existing Detonators printing retains 20 Electronics + 20 Chemicals because current references disagree; its card shows the alternative Metals report and asks for in-game verification. Existing owner-confirmed requirements and all other material quantities are preserved.

## Images

The existing 130 optional local artwork files are preserved, including owner screenshot crops. The user-requested credited Windows test build adds 44 unmodified source files: shared Manual/key icons and official promotional panels. These cover 94 new catalog records (all 34 Manuals, all 59 cosmetic blueprints and one key); 15 X01 entries retain labeled placeholders because no verified source picture was established. The library labels shared icons and whole promotional panels and provides an enlarged local preview with credit/source/rights details. All 120 original printer entries retain their mapped files. No affirmative redistribution grant was established; artwork remains outside the MIT code license, with no downstream reuse rights asserted. No runtime image hotlinks or network requests were added. See IMAGE-UPDATE-2026-11-06.md and IMAGE-SOURCES-2026-11-06.json.

## Saves and rollback

Back up using Settings before moving to a new portable folder. The new app exports version-3 backups containing blueprint progress, wanted entries and one acquisition plan per item in addition to prior fields. Version-1 and version-2 backups remain importable. Version-2 selections, adjustments, extras, picked counts, checks and hide-completed preference retain their values. Version-1 positive-target migration keeps the existing rules; stale zero overrides are dropped with a notice.

The new storage key is `dmz-raid-board-state-v3`. On automatic migration, old v1/v2 text stays at its original key and is also retained in a before-migration snapshot. The original old app can still read its original board. Older app versions cannot import v3 exports. The old portable folder and its data are not modified by using a candidate extracted into a separate folder; export/import transfers your board. Theme remains separate.

**New raid** clears only pickup counts and checks. **Clear entire list** clears plans and raid data but keeps blueprint progress, wanted items and theme; its recovery snapshot restores the plan while keeping your latest library progress. Import replaces the complete board only after confirmation and saves a recovery copy.

## Maintenance and validation

Maintain factual additions in `src/renderer/acquisition-data.mts`, keeping stable IDs, dated sources and explicit `null` for unknown requirements. Printer unlock overlays have their own date; do not relabel old cost verification as newly verified. Existing printer data remains in `catalog-data.mts`. Add images only after verifying their source and usage terms. Do not remove IDs from the catalog without a compatible saved-data migration.

Run `npm test` for core, catalog, migration, theme, storage, version and legacy requirement checks. Run `npm run test:ui` for the real Electron acceptance suite with an isolated synthetic profile. `npm run package:candidate` builds a private artwork candidate in a new versioned local folder with publishing disabled; `npm run package:public` builds without game art. Existing release folders are preserved. Native macOS and Linux packaging remains available through `platform-candidates.cjs`; new binaries for those platforms have not been built or launched on FM-16.

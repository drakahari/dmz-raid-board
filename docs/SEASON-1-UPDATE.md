# Season 1 Windows test

Version `0.1.10-field-upgrades.1`, researched 6 November 2026 for Modern Warfare 4 DMZ Season 1. This is a Windows-only test revision; see FIELD-UPGRADES-UPDATE.md for its new data and separate Raid sections.

## Using the library

Open **Blueprint & item library**. Search and combine category, type, season and item-status filters. The library pages through 20 records at a time. Choose **Have it**, **Want it** or **Neither** for each entry. Want it places that named library target in the separate Raid requests section; it does not add its ingredients. Have it or Neither removes its wanted request. These are manual choices, not an in-game inventory or unlock detector.

**Select all matches as wanted** applies across every filtered page and skips Have it entries. **Unselect wanted matches** clears only wanted choices in that same scope after confirmation, preserving Have it. Counts and scope stay visible. Reset filters to apply to the entire library. **Undo last bulk change** is available during the session and preserves later individual changes. See [complete workflow and recovery rules](SIMPLE-WANTED-UPDATE.md).

Recipe quantities and ingredient planning remain in **Plan your raid**. Library status choices preserve those plans and pickup counts. A wanted recipe matching a physical material uses a separate labeled request card. Physical loot counts/checks and library Have/Remove request actions are independent. Old acquisition plans and unlock notes remain in saved data; the simplified library does not show recipe controls or infer Have it from those notes.

## Coverage and limits

The library now has 234 records: 125 printer recipes/upgrade tiers, 34 Weapon Manual records, 59 cosmetic weapon blueprints, and 16 other items. The five added Field Upgrades include four unresolved bills and the cross-checked Survivor Box recipe; see FIELD-UPGRADES-UPDATE.md. There are 74 Season 1 records and 96 supported checklist names including legacy currency compatibility (currency remains omitted from raid targets). The 59 cosmetic entries include 35 seasonal Battle Pass/BlackCell records, 17 announced Store entries whose live availability is unverified, and seven preseason Vault/Beta/preorder entries.

The research compared all 95 published non-upgrade printer recipes and added 14 more specific unlock guides. It does not establish a complete current in-game blueprint inventory, Store rotation, vendor stock, new printer catalog or every account-specific unlock. See [research and sources](SEASON-1-EVIDENCE.md) and [printer comparison](season1-printer-audit.json).

The initial Season 1 research did not establish new recipe quantities. This Field Upgrades revision additionally corroborates Survivor Box and its SR-16 Bio Agent Sample requirement; see FIELD-UPGRADES-UPDATE.md. R-4 Bio-Compound and Weapons Grade Isotope are listed as valuables pending evidence of crafting use. The new named X01 gear/keys/valuables can be tracked as loot, with their recipes explicitly unresolved. Existing Detonators printing retains 20 Electronics + 20 Chemicals because current references disagree; its card shows the alternative Metals report and asks for in-game verification. Existing owner-confirmed requirements and all other material quantities are preserved.

## Images

The existing 130 optional local artwork files are preserved, including owner screenshot crops. The user-requested credited Windows test build adds 44 unmodified source files: shared Manual/key icons and official promotional panels. These cover 94 new catalog records (all 34 Manuals, all 59 cosmetic blueprints and one key); 15 X01 entries retain labeled placeholders because no verified source picture was established. The library labels shared icons and whole promotional panels and provides an enlarged local preview with credit/source/rights details. All 120 original printer entries retain their mapped files. The Field Upgrades revision adds one unchanged owner screenshot with five clipped icon views, for 175 local image files total. No affirmative redistribution grant was established; artwork remains outside the MIT code license, with no downstream reuse rights asserted. No runtime image hotlinks or network requests were added. See IMAGE-UPDATE-2026-11-06.md and IMAGE-SOURCES-2026-11-06.json.

## Saves and rollback

Export a backup in Settings before updating and extract into a fresh writable folder. Version-4 backups add an owned list, mutually exclusive with wanted items. Versions 1–3 remain importable. Existing printer goals, route plans, extras, adjustments, counts, checks and preferences carry forward. Version-3 wants now appear directly in Raid checklist. Legacy found/unlocked notes are retained but do not establish ownership of a finished item.

The new storage key is `dmz-raid-board-state-v4`. Earlier original save text and before-migration copies remain available for recovery. A corrupt v4 save opens recovery instead of silently substituting an older board. Older apps cannot import v4 exports; keep the old app and backup. Theme remains separate.

**New raid** clears counts and checks, retaining plans and Have/Want choices. **Clear entire list** clears wants, plans and raid progress after confirmation and a recovery copy; it preserves Have it, legacy notes and theme. Restore keeps current Have it choices when reconciling restored wants. Import replaces the board after confirmation and saves a recovery copy. See [detailed recovery behavior](SIMPLE-WANTED-UPDATE.md).

## Maintenance and validation

Maintain factual additions in `src/renderer/acquisition-data.mts`, keeping stable IDs, dated sources and explicit `null` for unknown requirements. Printer unlock overlays have their own date; do not relabel old cost verification as newly verified. Existing printer data remains in `catalog-data.mts`. Add images only after verifying their source and usage terms. Do not remove IDs from the catalog without a compatible saved-data migration.

Run `npm test` for core, catalog, migration, theme, storage, version and legacy requirement checks. Run `npm run test:ui` for the real Electron acceptance suite with an isolated synthetic profile. `npm run package:candidate` builds a private artwork candidate in a new versioned local folder with publishing disabled; `npm run package:public` builds without game art. Existing release folders are preserved. Native macOS and Linux packaging remains available through `platform-candidates.cjs`; new binaries for those platforms have not been built or launched on FM-16.

# Simpler three-step Windows test

Version 0.1.11-simple-flow.1, 10 November 2026. This is an unsigned Windows x64 test prerelease, not a stable release.

## Quick start

1. **Plan your raid:** choose what you want to make or upgrade. The app adds and combines its ingredients. Add extra loot if needed. Use recipes already unlocked in your game.
2. **Blueprint Item Recipes:** search for a recipe, blueprint, manual or item. Choose **Want it** to add that entry itself to the checklist, **Have it** if you already have it, or **Not tracking** to leave it off. Wanting a recipe does not add its ingredients. You can use either planning step or both.
3. **Raid Checklist:** use **+** and **-** to track loot. Use **Have it** for a recipe or item request. Physical loot and requests stay separate, including same-name entries. A check can mark physical loot complete without changing pickup counts.

## Less to learn at once

The navigation now follows that order, with Blueprint Item Recipes second and Raid Checklist last. Plain-language guidance and direct next-step links explain each view. Search, Category and Show are visible; Type/Season filters and bulk actions are in optional panels. Hidden active filters remain counted, and Reset filters clears all of them.

Plan keeps the Need this raid quantity visible. Detailed recipe amounts, changes, extras and reset actions are behind Quantity details. Removal is tucked behind Remove from list. Add extra loot remains directly available. Unresolved recipes, conflicts and prerequisites stay visible; source and verification details remain available on demand. Reset raid progress clearly describes the existing new-raid action.

## Existing data and functionality

Save format stays version 4 with unchanged storage keys. No catalog, recipe quantities, artwork or game mechanics are changed. Existing goals, acquisition plans, manual extras, adjustments, pickup counts, checks, Have it/Want it choices, legacy notes, themes and prior releases remain supported. Version 1, 2 and 3 imports are retained. Not tracking is the clearer label for the existing neither state, not a new state.

Bulk selection still covers all filtered matches across every page and preserves Have it choices. Session undo, clear-list recovery, image previews/credits, quantity editing and separate physical-loot/request actions remain available. The app is offline and does not read the game, infer ownership, confirm extraction or grant unlocks.

## Updating safely

Export a backup from the old app. Extract the **entire ZIP** into a fresh writable folder. Run DMZ Raid Board.exe there, then use Settings > Import backup. Keep the previous app and backup until you confirm your board. Portable Windows data is kept beside the executable. This package is unsigned. Windows 10 is not separately tested in this revision; native tests run on the available Framework Windows machine. macOS/Linux are not built for this test.

## Validation

Use npm test for the 64 unit/type checks. Use npm run test:ui for the three native suites, covering simple-flow usability, existing Have/Want/migration/recovery workflows, and Field Upgrades/same-name separation. Tests use fresh synthetic profiles, never the owner's board. Packaged release checks and artifact hashes are in the attached BUILD-CHECKS.json and SHA256SUMS.txt.

## Artwork

The existing 175-image payload is unchanged. Third-party artwork remains copyright Activision/respective rights holders, with existing source credits including DMZ Codex. It is excluded from the MIT source license. Attribution is not permission or endorsement; no downstream artwork reuse rights are granted. See THIRD-PARTY-ARTWORK.md and ARTWORK-SOURCES.json. No new artwork is added.

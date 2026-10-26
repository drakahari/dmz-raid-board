# Target planning and migration in 0.1.6

A fresh board starts empty. Selecting a recipe adds its required loot ingredients immediately to Plan and the raid checklist. Multiple recipes sum shared ingredients once. Requirements are the required side of an in-game owned/required display; the app never imports owned inventory from screenshots.

Each Plan card shows **Recipe baseline**, signed **Adjustment**, **Extra** and editable **Need this raid**. Editing a recipe item's target records a difference from the baseline. That difference follows the ingredient while any selected recipe still needs it; it is discarded when no selected recipe needs the ingredient. Selecting a new goal that brings back an omitted ingredient gives it a fresh baseline. Explicit extras are additive and remain until removed. Ingredient printing still offsets only explicitly planned outputs, once; no unlock or production is credited.

**Remove item** or a zero target omits an item in both views. Omitted recipe items can be restored under **Add manual extras or reset recipe adjustments**. Removing a manual extra removes it entirely. New raid resets picked-up counts and manual completion only: it preserves the current selections, adjustments, extras and explicit removals. Real picked-up counts are retained when goals change; stale manual completion checks are removed when their target changes. If all targets are hidden as completed, the UI says so and retains the target count; it does not claim the raid has no targets.

**Settings → Clear entire list** requires confirmation, saves a recoverable snapshot before replacement, then empties goals, adjustments, extras, pickup counts, completion and hide-completed state. It keeps the theme. Cancel/Escape leave the board untouched. **Restore cleared list** confirms replacement and saves the current board first. A recovery/storage-write failure blocks destructive replacement. A second clear on an already empty board is disabled.

## Older boards and backups

Version-1 boards used permanent absolute overrides, including zeros that silently masked selected requirements and unrelated zero-value cards. Version-2 separates recipe adjustments from extras. On migration:

- Old zero overrides are dropped, restoring selected recipe baselines and removing unrelated zero clutter. Completion checks for restored zero targets are dropped. This change is disclosed in the migration/import message.
- Positive old targets for a currently required ingredient become signed differences from its baseline, preserving their initial displayed amount. Positive targets outside the selected recipes become labeled manual extras. The old format does not record intent, so the app cannot tell a deliberate extra from an old positive override; users can review/remove extras explicitly.
- Selections, picked-up counts and hide-completed preference are preserved. Zero-valued selection keys are normalized away. No actual unlock, stash, production, extraction or purchase is inferred.
- The legacy storage key is read-only. A new version-2 storage key is used, and the original pre-migration JSON is retained as a recovery copy. Imported JSON files are never modified; a copy of the original imported JSON is also retained. A failed snapshot write prevents autosaving migration.
- Version-1 and version-2 backups can be imported by this version. New exports use version 2 and cannot be imported into older app versions; keep an old backup and the old app for rollback. Theme remains a separate per-device setting.

Tests use isolated synthetic profiles, including the reported zero-overrides scenario. No owner board is read or changed during verification.

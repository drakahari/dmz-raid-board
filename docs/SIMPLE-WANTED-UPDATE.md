# Have / Want Windows release

Version `0.1.10-field-upgrades.1` simplifies the blueprint and item library. Each entry has one choice: **Have it**, **Want it**, or **Neither**. Selecting Want it puts that named item itself in the Raid checklist. For example, wanting the 3-Plate Ballistic Gel Vest recipe shows a Recipe-labeled request there, without adding Experimental Compounds or other crafting ingredients. Have it removes the wanted choice; Neither clears both choices. All choices save locally and can be changed again.

The library no longer offers recipe ingredient lists, crafting quantities, acquisition-route planning or a second found/unlocked control. The existing printer browser under Plan your raid still works with its original ingredient requirements, quantities, extras, adjustments and pickup controls. Choosing Have/Want in the library does not change those plans or counts. Physical loot targets and wanted library targets now have separate labeled sections and independent cards, including when names match. Recipe requests say Recipe: before the name and use Have/Remove request actions; physical loot uses pickup counts and manual checks. Hide completed affects physical loot only. Marking a recipe Have removes its request while retaining independently planned physical quantities. Jump buttons keep both sections easy to access.

## Bulk controls

**Select all matches as wanted** applies to all filtered matches across every result page, not only the current page. It skips entries already marked Have it. **Unselect wanted matches** clears only the wanted choices in the same filtered scope, after a confirmation showing the count. It also preserves Have it. The visible scope text and button counts explain what will change. Reset filters first to apply these actions to the whole library.

**Undo last bulk change** is available in the current session. It restores the affected prior choices while preserving later individual edits, including a later Have it choice. Bulk choices persist after closing the app; the session undo history does not. Individual status buttons remain reversible at any time.

## Saves and recovery

Version-4 backups add a separate owned list and keep wanted choices exclusive from it. Version-1, version-2 and version-3 backups remain importable. Existing version-3 wants carry forward to the Raid checklist. Earlier found/unlocked notes are retained as legacy data and in the original save, but are not treated as proof that the finished item is owned. Previously selected printer goals, route plans, manual extras, adjustments, pickup counts, checks and preferences are preserved. Old plans are not silently removed; review them in Plan your raid if no longer needed.

The new save key is `dmz-raid-board-state-v4`. Earlier save text remains under its original key and is copied before migration. A corrupt v4 save shows recovery instead of silently opening an older board. Theme preference remains separate. New raid clears pickup counts and checks while keeping Have/Want choices and printer plans.

Clear entire list clears wanted items together with plans and raid progress, after saving a recovery copy. Have it choices, legacy unlock notes and theme are kept. Restore cleared list restores the earlier plan and wants, while keeping current Have it choices and omitting conflicting restored wants. The prior v3/v2 clear-recovery snapshot is also supported. Import replaces the complete board only after confirmation and retains a recovery copy.

Back up from the old app, extract the complete new Windows ZIP into a fresh writable folder, and import through Settings. Keep the old app and old backup: earlier app versions cannot read version-4 exports. The Field Upgrades revision adds five named boxes, one unchanged owner screenshot with five icon-only SVG views, and an SR-16 ingredient placeholder. The same source credits and artwork rights limitations apply. This is a Windows-only release.

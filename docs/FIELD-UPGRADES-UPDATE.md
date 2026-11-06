# Field Upgrades and separate Raid targets - Windows test

Version `0.1.10-field-upgrades.1` adds the five clear labels in the owner's November 6 screenshot: **Consumable Box, Medical Box, Hazmat Box, Utility Box and Survivor Box**. Each appears once under Field Upgrades, in the searchable library and as an independently selectable Have/Want record. Revive Pistol and Fulton Drop Marker already existed; their records, requirements and images are unchanged. This is a Windows-only test revision.

## Verified data and unresolved requirements

- Consumable Box and Medical Box: recipe rewards from X01 Orders page 2. Full required quantities and exact printing station remain unverified.
- Hazmat Box: recipe reward from X01 Orders page 3. Full required quantities and exact printing station remain unverified.
- Utility Box: name/icon verified in the owner's menu; full recipe, unlock and introduction season remain unknown. An incomplete PCB reference is not treated as a complete bill.
- Survivor Box: two community references agree on **SR-16 Bio Agent Sample x1, Ballistic Fabric x2, High-Tenacity Fibers x3**. COD Central places it at the X01 3D Printer, Production Assembly E5 on the Data Center floor, rather than the FOB printer. These quantities are cross-checked community data; the owner's image verifies the name/icon only.

The four unknown bills remain `null`, with **Requirements unresolved** in the printer browser. They cannot add invented ingredient totals. To seek a recipe, choose Want it in the library. To seek a physical box, add its name and quantity through **Manual extras**; all five boxes are available there independently. Survivor Box supports explicit repeat crafting quantities and aggregates its three verified ingredients; ingredient-print recipes still expand only when explicitly selected. The SR-16 Bio Agent Sample is available as a physical target, with a labeled image placeholder until an exact picture is verified. It is not silently substituted with the different R-4 Bio-Compound item.

Sources checked November 6, 2026:

- [COD Central Orders](https://codcentral.net/blog/mw4-dmz-orders/) - X01 page 2 and 3 recipe rewards.
- [COD Central printer guide](https://codcentral.net/blog/mw4-dmz-3d-printer-recipes/) - Survivor quantities and X01-only printer location.
- [DMZMap printer guide](https://dmzmap.com/3d-printer) - independent Survivor quantities, page updated October 27.
- [GG Ranked PCB reference](https://ggranked.com/games/call-of-duty-modern-warfare-4/modes/dmz/database/items/printed-circuit-board) - incomplete Utility reference; not used to enable crafting.

## Raid: physical loot versus library requests

Raid now has two separately labeled sections with live counts and keyboard-accessible jump buttons. **Physical loot targets** retain pickup +/- counts, manual completion checks, adjustments, quantities and Hide completed. **Wanted library targets** have prominent Recipe, Blueprint, Upgrade, Weapon Manual or Wanted item labels and independent Have it / Remove request actions. A wanted recipe named Comms Module has its own **Recipe: Comms Module** card, separate from the physical **Comms Module** collection card.

Have it updates only the chosen library record and clears that request. It does not collect physical copies, change a printer plan or unlock anything in game. Removing or completing a physical target does not acquire or remove its library request. Hide completed applies to physical loot only. Different stable catalog IDs remain independent even when names match. Physical progress totals exclude library requests. Bulk library selection/unselection keeps its existing filter scope, Have protection and session undo.

## Saves and update instructions

Save format remains version 4; all existing field values and stable IDs are retained. Existing requests are displayed separately without inferring any new ownership or unlock. Old version-1 to version-4 imports remain supported. New raid still resets pickup counts/checks, and existing clear/recovery/theme behavior remains intact. A backup containing these new catalog IDs needs this revision or a newer compatible catalog; older app builds can reject IDs they do not know.

Export a backup first. Extract the complete test ZIP into a fresh writable folder and import your board through Settings. Keep the older app and its backup. The candidate does not modify the old portable folder. This Windows build is unsigned.

## Images

One unchanged owner-provided gameplay screenshot is added alongside the existing 174 images, for 175 local image files. Five SVG viewports display only the matching box icons in printer rows, selected goals, library cards, wanted cards and enlarged previews. Explicit SVG clipping excludes adjacent rows, locks, labels and inventory counters from the visible image. The source PNG is byte-identical to the owner's attachment; no generated or guessed icon is used.

Game artwork belongs to Activision/respective rights holders and is outside the MIT application-code license. Attribution does not establish a reuse or redistribution license or endorsement. Source credits, screenshot hash and viewport coordinates are recorded in the test build's notices and source metadata. The original screenshot is not committed to the public source repository.

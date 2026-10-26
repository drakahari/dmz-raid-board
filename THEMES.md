# Theme sources and adaptation

The original Raid Board theme remains the default. The other 26 choices adapt the confirmed DLMS collection: Dark, Light, Purple & Gold, Maroon & Gold, Ethereal, and 21 additional Omarchy palettes. Ethereal appears once, matching DLMS. These are color adaptations for DMZ, not copies of DLMS layout, typography or application code.

DLMS source: [dlms/themes.py at 608c06252b788dcf8e02f58cb06893eaadcb5299](https://github.com/drakahari/DLMS_next/blob/608c06252b788dcf8e02f58cb06893eaadcb5299/dlms/themes.py). Its MIT notice, copyright Mike Buchanan, is retained in `theme-notices/LICENSE.DLMS`.

Omarchy palette source: DLMS's [pinned v4.0.4 manifest](https://github.com/drakahari/DLMS_next/blob/608c06252b788dcf8e02f58cb06893eaadcb5299/dlms/theme_sources/omarchy-v4.0.4.json), recording upstream [omacom/omarchy](https://github.com/omacom/omarchy) commit `c668141e9c42b13c80c9ca4ea108e11708c5e8a5`. Its MIT notice, copyright David Heinemeier Hansson, is retained in `theme-notices/LICENSE.OMARCHY`. Individual immutable palette URLs remain in `src/renderer/theme-data.mts`.

Only static color values and required license notices were reused. No DLMS checkout was changed or executed. No wallpapers, fonts, executable Omarchy configurations or runtime network dependencies were added.

DMZ derives opaque surfaces, selected states and controls from the source colors. It adjusts text and accent lightness for contrast across those surfaces while keeping the palette character. Main text targets 7:1, muted text 5:1, accent text 4.5:1, and control boundaries 3:1. Button text uses black or white with the stronger contrast. Game images remain unchanged on a dark neutral picture surface, including in light themes. The original theme retains the accepted board styling.

The theme preference is a validated local scalar separate from board state. Existing version-1 board JSON backups are unchanged and import without migration. Moving to a different portable folder requires reselecting a theme once; board backups transfer board data, not device appearance preferences.

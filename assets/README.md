# Optional local artwork

The individual game-image collection is not committed to the source tree. Documentation previews may contain game artwork and remain outside the code license. The app runs with labeled placeholders when artwork is absent; it never fetches images from the internet.

For your own private build, place only images you are entitled to use in this directory, matching the filenames in `src/renderer/image-catalog.mts`. The original private sample recognizes `cpu.png`, `detonators.png`, `nylon-cloth.png`, `power-regulator.png` and `reactive-metals.png`. Keep provenance and permission records with your private copy. Recipe outputs and upgrade-family icons are optional too; the mappings contain no image data or runtime downloads.

These files, runtime bundles and private profiles are excluded from Git. Attribution alone does not grant redistribution rights. The source-code license does not license game names, images or third-party materials.

The artwork-inclusive prerelease is built with `npm run package:artwork` using the existing local images and provenance manifest. It validates their hashes and emits a sanitized source inventory and third-party notices. It does not download images. This is a packaging mechanism, not a grant of artwork rights.

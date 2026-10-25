# DMZ Raid Board

An offline Windows raid planner and manual checklist built with TypeScript, HTML/CSS and Electron. Choose goals, aggregate shared ingredients, edit raid targets, and track picked-up counts using a simple picture-first layout.

This is an unofficial community prototype, not affiliated with Activision. The public repository contains original application source and no game artwork or private runtime data. No binary release is published here.

## Run from source

Use Node 24 or a compatible maintained Node release. The pinned development dependencies are Electron 45.0.0, TypeScript 7.0.2, electron-builder 26.18.0 and Playwright 1.64.1.

```sh
npm ci
npx install-electron
npm start
```

The app works with labeled placeholders when artwork is absent. See [optional artwork setup](assets/README.md). It does not fetch art, fonts, scripts or game data at runtime.

## Features

- Ten printer category views, recipe search and shared-ingredient totals.
- Repeatable craft quantities and fixed permanent upgrade tiers.
- Editable raid targets separate from recipe totals and picked-up counts.
- Raid +/- controls, completion checks, hide completed and confirmed new-raid reset.
- Local persistence, validated versioned JSON backups and corrupt-data recovery.
- A sandboxed renderer with context isolation, no Node/IPC bridge and blocked remote content.

Picking up is not extracting. The app does not track stash or actual extracted loot, infer unlocked recipes, purchase upgrades, or connect to game processes.

## Catalog status

The initial source catalog is partial: 38 provisional entries, 25 with community-reported costs and 13 disabled pending verification. Ingredient printing and remaining equipment/tier coverage are being completed. Category structure alone does not mean complete recipe coverage. See [catalog evidence](CATALOG.md).

## Checks and packaging

```sh
npm test
npm run test:ui
npm run package
```

The UI test drives a real Electron process and uses an isolated local profile. The packaging command builds an unsigned Windows x64 ZIP candidate. It does not install the app or publish a release. Packaged builds keep data beside the executable in a `data` folder, so extract into a writable folder and retain the accompanying files.

## License

MIT for original application code. Game names, trademarks, artwork and other third-party materials remain their owners' property and are outside that license. Do not publish private art or builds containing it without the necessary rights.

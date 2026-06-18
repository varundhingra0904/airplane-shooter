# Airplane Shooter (Web)

A simple browser arcade game. Your plane sits near the bottom and **fires
automatically** — **drag** left/right (touch or mouse), or use the **← →** /
**A D** keys, to line up the falling red planes. Shoot them before they reach
you; if one hits you, the round resets. Your score is the number of planes
destroyed.

Plays on iPhone Safari, Android Chrome, and desktop browsers. No installs, no
accounts, no dependencies.

## Play it
- **Live:** https://varundhingra0904.github.io/airplane-shooter/
- **Locally:** just open `index.html` in any browser (double-click it).

## Files
- `index.html` — page + canvas
- `style.css` — full-screen responsive layout
- `game.js` — game loop, input, entities, collisions (vanilla JavaScript)

## Hosting (GitHub Pages, free)
This repo is public and served by GitHub Pages from the `main` branch root.
To re-deploy after changes, push to `main`; Pages rebuilds automatically.

## Tuning
Gameplay constants live in the `CFG` object at the top of `game.js`
(`bulletInterval`, `bulletSpeed`, `enemyInterval`, `enemySpeed`, `enemyDrift`).

## Credits
Ported from the SpriteKit iOS version of the same game.

# Runway Rush — TypeScript Endless Runner

A standalone **Subway Surfers-style 3-lane endless runner** built with **TypeScript + HTML Canvas + CSS**.

> This is an original mini-game inspired by the endless-runner genre. It does not use Subway Surfers assets, characters, or code.

## Features

- 3-lane endless running
- Lane switching
- Jump and slide actions
- Coins
- Barriers and crates
- Increasing difficulty/speed
- Score and best score
- Game-over and restart flow
- Pause/resume
- Keyboard controls
- Mobile swipe controls
- On-screen mobile buttons
- Sound toggle
- LocalStorage save system
- No backend, database, login, or external API required
- Responsive UI

## Controls

### Desktop

- `←` / `A` — move left
- `→` / `D` — move right
- `↑` / `W` / `Space` — jump
- `↓` / `S` — slide
- `P` / `Esc` — pause

### Mobile

Swipe:
- Left/right → change lane
- Up → jump
- Down → slide

Or use the four on-screen buttons.

## Local Storage

The game stores:

- Best score
- Total collected coins
- Number of games
- Sound preference

Storage key:

`runway-rush-save-v1`

No information is sent to a server.

## Run locally

Install Node.js first.

```bash
npm install
npm run dev
```

Then open the local Vite URL shown in the terminal.

## Production build

```bash
npm run build
```

The production files will be generated in:

```text
dist/
```

Preview the production build:

```bash
npm run preview
```

## Project structure

```text
runway-rush-typescript/
├── index.html
├── package.json
├── tsconfig.json
├── README.md
└── src/
    ├── main.ts
    └── style.css
```

## Tech stack

- TypeScript
- Vite
- HTML5 Canvas
- CSS
- Browser LocalStorage
- Vanilla DOM APIs

## Future backend-ready direction

The project is intentionally local-only for now. A backend can later be added without changing the core game loop.

Possible future additions:

- Account/login
- Cloud profile
- Global leaderboard
- Friends
- Achievements
- Daily challenges
- Skins
- Missions
- Server-side anti-cheat validation
- Cloud save

## License

Use and modify this project for your own learning/projects. Replace or add a license if you plan to distribute it publicly.

# Smart Nudge Prototype

Prototype for an internal behavioral invoice nudge bot for a corporate media team. It uses a local JSON database, a Node.js HTTP server, and a static dashboard with Chat and Manager views.

## Run locally

```bash
npm start
```

Open `http://localhost:3000`.

No package install is required because the prototype uses only built-in Node.js modules.

## Reset the mock database

The Chat view actions update `data/db.json`. To restore the original sample data:

```bash
npm run seed
```

You can also use the `Reset Demo Data` button in the dashboard.

## Project structure

- `data/db.json` is the mock database.
- `src/seed-data.js` contains the resettable sample data.
- `src/logic.js` contains the tiering, nudge templates, rankings, and action handling.
- `server.js` serves the API and dashboard.
- `public/` contains the HTML, CSS, and browser JavaScript.

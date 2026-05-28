# daily-budget

Simple web-app to figure out how much you can spend per day given your current balance, fixed expenses and the next income day.

Data is stored in the browser's `localStorage`. Optional sync with **Dropbox** keeps the same data across devices (desktop + mobile).

## Run locally

The app is a static page, but Dropbox OAuth requires a real HTTP origin (it won't work from `file://`). Serve the folder over HTTP on port 8000:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

Any other static server works too (`npx serve`, `php -S localhost:8000`, etc.) — just keep port 8000, because that URL is registered as an OAuth redirect in the Dropbox app.

## Hosting

The repo is published to GitHub Pages at `https://varzin.github.io/daily-budget/`. Pushing to `main` updates the live site.

## Dropbox sync setup (already done for this repo)

If you fork this project, you need your own Dropbox app:

1. Create an app at <https://www.dropbox.com/developers/apps/create> — **Scoped access**, **App folder**, any name.
2. On the **Permissions** tab, enable `files.content.read` and `files.content.write`. Submit.
3. On **Settings**:
   - Set **Allow public clients (PKCE)** to `Allow`.
   - Add redirect URIs: `http://localhost:8000/` and your hosted URL (e.g. `https://<user>.github.io/<repo>/`).
4. Copy the **App key** and replace `DROPBOX_APP_KEY` at the top of `js/sync.js`.

The app secret is not used (PKCE flow); the App key is a public client ID and is safe to ship in the source.

## Project structure

```
index.html         entry point
styles/            css (tokens, base, layout, components, responsive)
js/
  app.js           wiring, tab switching, event listeners
  state.js         state shape, localStorage persistence, import/export
  sync.js          Dropbox OAuth (PKCE) + pull/push
  dashboard.js     daily-spend metrics
  categories.js    fixed expenses
  savings.js       month-end savings table
  chart.js         savings chart
  math.js          shared calculations
  utils.js         helpers
```

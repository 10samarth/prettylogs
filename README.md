# PrettyLogs

PrettyLogs is a terminal-first wrapper for noisy dev commands. It runs an existing command after `--`, captures `stdout` and `stderr`, classifies output into structured log events, and renders a cleaner interactive terminal UI with Ink.

![PrettyLogs hero](/prettylogs.webp)

## Install

For a one-off local run inside the repo:

```bash
npm install
npm run build
node dist/cli.js -- npm run dev
```

To install the `prettylogs` command globally from this repo and use it from anywhere:

```bash
cd /prettylogs
npm install
npm install -g .
prettylogs -- npm run dev
```

For active development, link the local repo instead of reinstalling after every change:

```bash
cd /prettylogs
npm install
npm link
prettylogs -- npm run dev
```

To remove the global install later:

```bash
npm uninstall -g prettylogs
```

Optional preset selection:

```bash
prettylogs --preset nextjs -- npm run dev
prettylogs --preset vite -- npm run dev
```

## MVP features

- Commander-based CLI entrypoint
- `child_process.spawn` process runner
- Buffered line splitting for `stdout` and `stderr`
- Generic parser plus lightweight Next.js and Vite presets
- In-memory event store with error/warning counters
- Ink terminal UI with:
  - top status bar
  - scrollable log list
  - color-coded log kinds
  - repeated error grouping
  - collapsible stack traces
  - filters for all/errors/warnings/requests
  - inline search mode

## Keyboard shortcuts

- `a`: all logs
- `e`: errors only
- `w`: warnings only
- `r`: requests only
- `/`: search
- `j` / `k`: move selection
- `x` or `enter`: expand/collapse stack traces on the selected event
- `q`: quit

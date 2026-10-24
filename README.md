# Right-Click Rights

A userscript that gives back right-click, text selection and copy on sites
that block them.

- Overrides CSS `user-select: none`.
- Stops page handlers that cancel `contextmenu`, `selectstart` and `copy`.

## Install

1. Install a userscript manager such as [Tampermonkey](https://www.tampermonkey.net/)
   or [Violentmonkey](https://violentmonkey.github.io/).
2. Open [right-click-rights.user.js](https://raw.githubusercontent.com/oooooooo/right-click-rights.user.js/main/right-click-rights.user.js)
   and install it.

## Usage

The script is on for every site by default.

To turn it off for the current site, press `Alt+S` or use the userscript
menu. The script remembers the site and keeps it off on later visits.
Turning it back on forgets the site.

## Development

```sh
pnpm install
pnpm test
pnpm lint
```

## License

[MIT](LICENSE)

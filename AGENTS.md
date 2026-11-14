# reb-bot development

reb-bot is a TypeScript Discord bot using Eve, deployed to Vercel on Node.js 24.

- `agent/`: Eve configuration, channels, tools, and instructions.
- `bot/`: Discord slash commands and interaction handling.
- `gateway/`: Discord Gateway daemon.
- `scripts/`: repo lint checks.
- `tests/`: Node test runner tests.

Use `npm ci` to install dependencies. Verify changes with `npm run lint`,
`npm test`, `npm run typecheck`, and `npm run build`. Eve's API documentation is
bundled in `node_modules/eve/docs`; check it before changing framework
integrations.

Start every function body with a blank line. `npm run lint` fails otherwise and
`npm run lint:fix` rewrites the files, so run it before committing.

Follow existing TypeScript conventions and `.js` import suffixes. Add meaningful
regression tests for bug fixes and authorization changes. Execute untrusted code
only in the remote sandbox. Never commit environment files or credentials.

For self-improvement, branch from latest `origin/main` using `reb/<description>`,
open a draft PR, and include verification results. Continue the existing branch
when addressing review feedback. Do not merge or push directly to main.

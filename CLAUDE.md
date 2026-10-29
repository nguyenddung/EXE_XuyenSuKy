# Project workflow

Read and follow `AGENTS.md` for this repository's standing delivery instructions.
After completing an authorized coding task and passing relevant checks, commit its changes and push to origin. Report the GitHub Actions and Vercel deployment status.
Do not add Claude or other AI attribution, co-author trailers, generated-by footers, or session links to commits or pull requests.

## No AI co-author

- Never add a `Co-Authored-By: Claude ...` (or any Anthropic/AI assistant) trailer, a "Generated with Claude Code" footer, or a claude.ai session link to commit messages, PR titles or PR descriptions. Commits are authored only by the configured human Git identity.
- `.claude/settings.json` disables Claude Code attribution (`attribution.commit`, `attribution.pr`, `sessionUrl`, `includeCoAuthoredBy`). Keep those values off.
- `.githooks/commit-msg` strips any such lines that still slip into a commit message. It is active once `git config core.hooksPath .githooks` has been run in the clone; run that command if `git config core.hooksPath` is empty. Do not bypass it with `--no-verify`.
- The hook cannot reach PR text, so check PR titles and bodies by hand before creating them.

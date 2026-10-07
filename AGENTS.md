# Repository workflow

The owner requests automatic delivery for completed coding tasks in this repository.

- After finishing a requested change, run the relevant tests and `npm run build`, then commit the task changes and push the current branch to origin without asking again. This is standing authorization from the repository owner.
- On `main`, pushing triggers `.github/workflows/deploy-vercel.yml`: tests and build must pass before the Vercel production deployment. Check the workflow result and report the commit and deployment status.
- Never push a failing change, force-push, rewrite existing history, or include secrets, `.env` files, build output, or unrelated changes. Preserve other pending work; stage only changes belonging to the task unless the owner requests their inclusion.
- Do not add AI attribution, `Co-Authored-By` trailers for Claude or other assistants, generated-by footers, or session links to commits or PRs. Use the configured human Git identity.

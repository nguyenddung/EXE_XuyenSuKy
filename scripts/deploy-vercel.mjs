import { appendFileSync } from 'node:fs'

const { VERCEL_DEPLOY_HOOK, GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_SHA, GITHUB_STEP_SUMMARY } = process.env
if (!VERCEL_DEPLOY_HOOK || !GITHUB_TOKEN || !GITHUB_REPOSITORY || !GITHUB_SHA) {
  console.error('Missing deploy hook or GitHub workflow credentials.')
  process.exit(1)
}

async function github(path) {
  const response = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}/${path}`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error(`GitHub API returned HTTP ${response.status}.`)
  return response.json()
}

async function deploy() {
  const main = await github('git/ref/heads/main')
  if (main.object.sha !== GITHUB_SHA) {
    console.log('A newer commit is on main. Its workflow will deploy the latest version.')
    return
  }

  const startedAt = Date.now()
  const response = await fetch(VERCEL_DEPLOY_HOOK.trim(), {
    method: 'POST',
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error(`Vercel deploy hook returned HTTP ${response.status}.`)
  const result = await response.json()
  if (!result.job?.id) throw new Error('Vercel did not accept the deployment job.')
  console.log(`Vercel accepted deployment job ${result.job.id}. Waiting for production deployment...`)

  const deadline = Date.now() + 10 * 60_000
  while (Date.now() < deadline) {
    const statuses = await github(`commits/${GITHUB_SHA}/statuses?per_page=100`)
    const status = statuses.find((item) =>
      item.context.toLowerCase() === 'vercel' && Date.parse(item.created_at) >= startedAt - 5_000,
    )
    if (status?.state === 'success') {
      console.log(`Production deployment succeeded for ${GITHUB_SHA}.`)
      if (GITHUB_STEP_SUMMARY) {
        appendFileSync(GITHUB_STEP_SUMMARY,
          `Production deployed: [Xuyen Su Ky](https://xuyen-su-ky.vercel.app)\n\nCommit: ${GITHUB_SHA}\n\n[Vercel deployment](${status.target_url})\n`,
        )
      }
      return
    }
    if (status && ['error', 'failure'].includes(status.state)) {
      throw new Error(`Vercel deployment failed. ${status.description ?? 'Check the Vercel dashboard.'}`)
    }
    console.log(`Deployment status: ${status?.state ?? 'waiting for Vercel status'}`)
    await new Promise((resolve) => setTimeout(resolve, 10_000))
  }
  throw new Error('Timed out waiting for Vercel to confirm the deployment. Check the Vercel dashboard.')
}

deploy().catch((error) => {
  // Do not print fetch errors: they can contain the secret hook URL.
  const safeMessages = ['GitHub API returned', 'Vercel deploy hook returned', 'Vercel did not accept', 'Vercel deployment failed.', 'Timed out waiting']
  console.error(safeMessages.some((prefix) => error.message.startsWith(prefix)) ? error.message : 'Deployment request failed. Check network access and Vercel settings.')
  process.exitCode = 1
})

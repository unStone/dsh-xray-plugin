import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'dsh-xray'
export const inject = ['tools']

const DATA_URL = 'https://unstone.github.io/dsh-xray/data.json'
const SITE = 'https://unstone.github.io/dsh-xray'
const TTL_MS = 6 * 60 * 60 * 1000

/** One plugin's capability card, as published by the daily scan. */
interface Card {
  repo: string
  stars: number
  description: string
  level: number
  type: string
  status: string
  flags: { id: string; evidence: string }[]
  injects: string[]
  hooks: string[]
  domains: string[]
  env: string[]
  tool_regs: number
}

const FLAG_TEXT: Record<string, string> = {
  runtime_patch: 'patches the dsh runtime itself (manifest.bundle.patch)',
  prompt_surface: 'can rewrite the system prompt',
  api_intercept: 'can intercept API traffic',
  subprocess_service: 'can spawn subprocesses',
  tool_gate: 'gates tool execution',
  exec: 'executes system commands',
  eval: 'uses eval / new Function',
  base64_decode: 'decodes base64 payloads',
  net_server: 'starts a network server',
  token_env: 'reads credential-class environment variables',
  install_script: 'runs code at install time',
  no_manifest: 'ships no manifest',
}

const LEVEL_TEXT: Record<number, string> = {
  3: 'C3 — powerful capability combined with sensitive behaviour',
  2: 'C2 — one powerful capability or sensitive behaviour',
  1: 'C1 — ordinary capability surface',
  0: 'C0 — no notable capability surface',
}

/**
 * Levels describe capability surface, not risk of harm. Every rendering path
 * repeats that, because a bare "C3" reads as a verdict and it is not one.
 */
const DISCLAIMER =
  'Levels measure capability surface and transparency, not maliciousness. ' +
  'A C3 plugin can be entirely legitimate — a desktop shell genuinely needs subprocesses. ' +
  'Findings come from static analysis of shipped code; nothing is executed, and intent cannot be established.'

let cache: { at: number; cards: Map<string, Card> } | undefined

async function loadCards(signal?: AbortSignal): Promise<Map<string, Card>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.cards
  const res = await fetch(DATA_URL, { signal })
  if (!res.ok) throw new Error(`could not fetch capability data (HTTP ${res.status})`)
  const data = (await res.json()) as { plugins: Card[] }
  const cards = new Map<string, Card>()
  for (const card of data.plugins) cards.set(card.repo.toLowerCase(), card)
  cache = { at: Date.now(), cards }
  return cards
}

/** Accepts `owner/repo`, a GitHub URL, or a bare plugin name. */
function resolve(query: string, cards: Map<string, Card>): Card | undefined {
  const q = query.trim().toLowerCase()
  const direct = cards.get(q) ?? cards.get(q.replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, ''))
  if (direct) return direct
  const byName = [...cards.values()].filter((c) => c.repo.split('/')[1].toLowerCase() === q)
  if (byName.length) return byName.sort((a, b) => b.stars - a.stars)[0]
  const partial = [...cards.values()].filter((c) => c.repo.toLowerCase().includes(q))
  return partial.sort((a, b) => b.stars - a.stars)[0]
}

function describe(card: Card): string {
  const lines: string[] = []
  lines.push(`${card.repo} — ${LEVEL_TEXT[card.level] ?? 'not scanned'}`)
  if (card.description) lines.push(card.description)
  lines.push('')

  if (card.status !== 'ok') {
    lines.push(`This repository has no capability card yet (${card.status}).`)
  } else if (card.flags.length) {
    lines.push('What it can do:')
    for (const f of card.flags) {
      lines.push(`  - ${FLAG_TEXT[f.id] ?? f.id} — ${f.evidence}`)
    }
  } else {
    lines.push('No notable capability flags were found in shipped code.')
  }

  const powerful = card.injects.filter((s) =>
    ['subprocess', 'apiProxy', 'systemPrompt', 'sandbox', 'webServer', 'approval'].includes(s))
  if (powerful.length) lines.push('', `Powerful services injected: ${powerful.join(', ')}`)
  if (card.env.length) lines.push(`Environment variables read: ${card.env.join(', ')}`)
  if (card.domains.length) lines.push(`Outbound domains: ${card.domains.join(', ')}`)

  lines.push('', DISCLAIMER)
  lines.push(`Full card: ${SITE}/p/${card.repo.replace('/', '__')}.html`)
  return lines.join('\n')
}

export function apply(ctx: Context) {
  ctx.tools.register(defineTool({
    name: 'dsh_xray_check',
    description:
      'Look up the capability card for a DeepSeek Harness plugin: which runtime services it ' +
      'injects, which hooks it attaches, whether it patches the runtime, which credential-class ' +
      'environment variables it reads, and whether it runs code at install time. Levels (C0-C3) ' +
      'describe capability surface and transparency, not maliciousness or risk of harm. Use this ' +
      'when asked what a plugin can do, or before installing one.',
    parameters: {
      plugin: {
        type: 'string',
        required: true,
        description: 'Plugin as owner/repo, a GitHub URL, or a bare plugin name.',
      },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args, exec) {
      const cards = await loadCards(exec.signal)
      const card = resolve(args.plugin, cards)
      if (!card) {
        return (
          `No capability card found for "${args.plugin}".\n\n` +
          `The registry covers repositories carrying the GitHub topic "dsh-plugin". ` +
          `If this plugin is published elsewhere, or was created very recently, it may not be ` +
          `scanned yet.\n\nSearch the registry: ${SITE}/registry.html`
        )
      }
      return describe(card)
    },
  }))

  ctx.tools.register(defineTool({
    name: 'dsh_xray_audit',
    description:
      'Summarise the capability surface across a list of DeepSeek Harness plugins — for example ' +
      'the ones currently installed. Reports how many carry powerful capability, which patch the ' +
      'runtime, and which read credentials. Levels describe capability surface, not maliciousness.',
    parameters: {
      plugins: {
        type: 'array',
        required: true,
        description: 'Plugins to audit, each as owner/repo, a GitHub URL, or a bare plugin name.',
      },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args, exec) {
      const cards = await loadCards(exec.signal)
      const found: Card[] = []
      const missing: string[] = []
      for (const q of args.plugins) {
        const card = resolve(String(q), cards)
        if (card && card.status === 'ok') found.push(card)
        else missing.push(String(q))
      }
      if (!found.length) {
        return `None of the ${args.plugins.length} plugin(s) given have a capability card yet.`
      }

      const has = (id: string) => found.filter((c) => c.flags.some((f) => f.id === id))
      const strong = found.filter((c) => c.level >= 2)
      const lines: string[] = []
      lines.push(`Audited ${found.length} plugin(s) with capability cards.`)
      lines.push('')
      lines.push(`  ${strong.length} carry a powerful capability surface (C2 or C3)`)
      for (const [id, label] of [
        ['runtime_patch', 'patch the dsh runtime itself'],
        ['prompt_surface', 'can rewrite the system prompt'],
        ['api_intercept', 'can intercept API traffic'],
        ['token_env', 'read credential-class environment variables'],
        ['install_script', 'run code at install time'],
      ] as const) {
        const hits = has(id)
        if (hits.length) lines.push(`  ${hits.length} ${label}: ${hits.map((c) => c.repo).join(', ')}`)
      }
      lines.push('')
      for (const c of [...found].sort((a, b) => b.level - a.level)) {
        lines.push(`  C${c.level}  ${c.repo}  ${SITE}/p/${c.repo.replace('/', '__')}.html`)
      }
      if (missing.length) {
        lines.push('', `No card yet for: ${missing.join(', ')}`)
      }
      lines.push('', DISCLAIMER)
      return lines.join('\n')
    },
  }))
}

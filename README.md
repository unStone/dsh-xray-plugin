# dsh-xray-plugin

**Ask what a dsh plugin can actually do — without leaving your agent.**

在 dsh 里直接查一个插件到底能做什么。

Companion plugin for [dsh-xray](https://github.com/unStone/dsh-xray), which statically scans every repository under the `dsh-plugin` topic and publishes a capability card for each.

## Why

A dsh plugin is arbitrary code inside your agent runtime. It can rewrite your system prompt, intercept API traffic, spawn subprocesses, read `GITHUB_TOKEN` from your environment, or patch the runtime itself — and nothing in the install path tells you which. dsh has no plugin-level permission declaration, so there is nothing to read even if you look.

This plugin puts the answer where the question comes up: in the agent, at the moment you are deciding.

## Tools

| Tool | What it does |
|---|---|
| `dsh_xray_check` | Capability card for one plugin: injected services, hooks, runtime patches, credential-class env reads, install-time scripts — each with `file:line` evidence. |
| `dsh_xray_audit` | Summary across several plugins, e.g. the ones you have installed: how many carry powerful capability, which patch the runtime, which read credentials. |

Ask your agent naturally:

> Is `tt-a1i/archify` safe to install?

> Audit the plugins I have installed.

## Capability levels

**C0** no notable surface · **C1** ordinary · **C2** one powerful capability or sensitive behaviour · **C3** both.

Levels measure **capability surface and transparency, not maliciousness**. A C3 plugin can be entirely legitimate — a desktop shell genuinely needs subprocesses, and several of the highest-scoring projects in the ecosystem are among its best-engineered. The distinction that matters is between a plugin that *needs* strong capability and one that *has* it without anyone noticing.

This is not malware detection. Static analysis cannot establish intent, and a determined bad actor evades it easily. The gap it addresses is that nobody knows what ordinary plugins do.

## Install

```sh
dsh plugin add unStone/dsh-xray-plugin
```

## Data

Cards are fetched from [`data.json`](https://unstone.github.io/dsh-xray/data.json), refreshed by a daily scan of the whole ecosystem, and cached for six hours. No telemetry: the plugin sends nothing about you or your setup — it fetches a static file and reads it locally.

Browse the same data on the web: [registry](https://unstone.github.io/dsh-xray/registry.html) · [levels explained](https://unstone.github.io/dsh-xray/levels.html) · [ecosystem report](https://unstone.github.io/dsh-xray/report.html)

## False positives

Every flag cites the file and line it came from, so disputes are checkable. [Open an issue](https://github.com/unStone/dsh-xray/issues) — rules are fixed in public and the next daily scan picks up the correction.

## Build

```sh
npm install
npm run build
```

Apache-2.0

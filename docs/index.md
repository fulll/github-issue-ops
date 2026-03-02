---
layout: home

hero:
  name: "github-issue-ops"
  text: "Industrialize GitHub issue campaigns"
  tagline: From code-search results to EPIC issues and per-repo sub-issues in seconds.
  actions:
    - theme: brand
      text: Get started
      link: /getting-started/
    - theme: alt
      text: View on GitHub
      link: https://github.com/fulll/github-issue-ops

features:
  - title: Issue create
    icon:
      src: /icons/epic.svg
    details: Pipe <a href="https://fulll.github.io/github-code-search/">github-code-search</a> output to create a fully structured EPIC issue with a checklist, summary and embedded metadata.
    link: /reference/create
    linkText: Reference
  - title: Issue refresh
    icon:
      src: /icons/sync.svg
    details: Re-run the search and refresh the checklist automatically — new repos added, removed repos checked off.
    link: /reference/refresh
    linkText: Reference
  - title: Issue dispatch
    icon:
      src: /icons/dispatch.svg
    details: Split an EPIC into one sub-issue per repository with automatic assignee resolution via teams, CODEOWNERS or a JSON mapping.
    link: /reference/dispatch
    linkText: Reference
---

<div class="home-section use-cases-section">

## Use cases

<div class="use-cases-grid">
  <div class="use-case-card">
    <div class="uc-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg></div>
    <div class="uc-body">
      <strong>Tech-debt campaign</strong>
      <p>Search for deprecated API usages → <code>issue create</code> → assign to teams → <code>issue dispatch</code></p>
    </div>
  </div>
  <div class="use-case-card">
    <div class="uc-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg></div>
    <div class="uc-body">
      <strong>Security patch rollout</strong>
      <p>Search for vulnerable dependency → <code>issue create</code> → update weekly with <code>issue refresh</code> → <code>issue dispatch</code></p>
    </div>
  </div>
  <div class="use-case-card">
    <div class="uc-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><polyline points="9 12 11 14 15 10"/></svg></div>
    <div class="uc-body">
      <strong>Compliance enforcement</strong>
      <p>Search for missing licence headers → <code>issue create</code> → track progress via EPIC checklist</p>
    </div>
  </div>
  <div class="use-case-card">
    <div class="uc-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 8 16 13"/><line x1="8" y1="8" x2="21" y2="8"/><polyline points="8 21 3 16 8 11"/><line x1="3" y1="16" x2="16" y2="16"/></svg></div>
    <div class="uc-body">
      <strong>Framework migration</strong>
      <p>Search for legacy import patterns → <code>issue create</code> → <code>issue dispatch</code> per team</p>
    </div>
  </div>
</div>

Works with any tool that produces Markdown or JSON: [github-code-search](https://fulll.github.io/github-code-search/), custom scripts, or AI-generated reports.

</div>

<div class="home-section agentic-section">

## Why github-issue-ops in the agentic AI age?

<div class="agentic-lead">
AI coding agents generate code at unprecedented speed — and with it, new technical debt, security gaps, and compliance issues land across dozens of repositories simultaneously.
</div>

<div class="agentic-problem">
Traditional issue triage <strong>doesn't scale</strong>: an agent can introduce a problem in 50 repos in the time it takes a human to open a single ticket.
</div>

`github-issue-ops` closes this loop. It turns a structured search result — produced by a human, a CI check, or an AI agent itself — into a traceable GitHub issue campaign:

<div class="agentic-pillars">
  <div class="pillar">
    <span class="pillar-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg></span>
    <span class="pillar-label"><strong>Systematic</strong></span>
    <span class="pillar-desc">Every affected repository gets its own sub-issue — no repo is missed.</span>
  </div>
  <div class="pillar">
    <span class="pillar-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg></span>
    <span class="pillar-label"><strong>Idempotent</strong></span>
    <span class="pillar-desc">Run the same command twice — the campaign is not duplicated.</span>
  </div>
  <div class="pillar">
    <span class="pillar-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/></svg></span>
    <span class="pillar-label"><strong>Refreshable</strong></span>
    <span class="pillar-desc">As the agent fixes repos, <code>issue refresh</code> updates the EPIC in real time.</span>
  </div>
  <div class="pillar">
    <span class="pillar-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></span>
    <span class="pillar-label"><strong>Auditable</strong></span>
    <span class="pillar-desc">Metadata is embedded in the issue body; the full replay command is always one click away.</span>
  </div>
</div>

<div class="agentic-quote">
In an agentic world, <strong>github-issue-ops</strong> is the missing link between <em>"AI found a problem at scale"</em> and <em>"every team knows about it, owns it, and can close it"</em>.
</div>

</div>

<div class="home-section production-section">

## Used in production?

`github-issue-ops` is developed and used internally at [fulll](https://github.com/fulll) to drive organisation-wide refactoring and compliance campaigns across hundreds of repositories.

Using it at your organisation? Share your experience in [GitHub Discussions](https://github.com/fulll/github-issue-ops/discussions).

</div>

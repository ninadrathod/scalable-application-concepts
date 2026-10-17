# ScaleCraft — Concepts for Scalable Applications

A deep-dive, self-paced masterclass (≈ 5–6 hours of material) on the concepts that let websites scale in production: latency and throughput, queueing theory, load balancing, caching, database scaling, asynchronous processing, containers, observability and resilience.

It is a static site with no build step: plain HTML, Tailwind CSS (via CDN) and vanilla JavaScript.

```
.
├── index.html   # Layout, styling tokens and all lesson content (modules as <article> blocks)
├── script.js    # Module registry, quiz bank + engine, navigation, progress, interactive widgets
├── CNAME        # Custom domain for GitHub Pages: scalecraft.meverse.in
└── README.md
```

## Curriculum

All 13 modules are complete. Each one has lessons, inline SVG diagrams, a hands-on lab and its own quiz (392 questions in total).

| # | Module | Interactive widgets |
|---|--------|---------------------|
| 00 | Prerequisites & Environment Setup | Latency-numbers chart, OS-specific install tabs |
| 01 | Foundations of Scale | Little's Law calculator, availability calculator, architecture-evolution stepper |
| 02 | Load Balancing & Reverse Proxies | Load-balancing algorithm simulator |
| 03 | Caching at Every Layer | Hit-ratio calculator |
| 04 | Scaling the Database | Shard-key distribution simulator |
| 05 | Asynchronous Processing: Queues & Streams | Queue backlog / load-leveling simulator |
| 06 | Service Architecture & APIs | Call-chain latency & availability calculator |
| 07 | Frontend Performance at Scale | Critical-rendering-path waterfall |
| 08 | Containers, Orchestration & Autoscaling | HPA calculator |
| 09 | Observability: Logs, Metrics & Traces | Error-budget burn-rate calculator |
| 10 | Resilience Engineering | Token-bucket rate-limiter simulator |
| 11 | Security at Scale | — |
| 12 | Capstone: Designing a Production System | Waiting-room estimator |

The labs build on one Docker Compose project (`scale-lab`: Express, PostgreSQL, Redis and Nginx), which grows module by module.

## Features

- **Netflix-inspired UI**: dark `#141414` canvas, signature red `#E50914`, Bebas Neue display type, a billboard hero, and a "Top 10" style module row.
- **Responsive layout**: on desktop, a sticky, scrollable sidebar with a table of contents and progress tracker; on mobile, a sticky top bar and a slide-out navigation drawer.
- **Inline SVG diagrams**: request lifecycle, latency histograms, the utilization "hockey stick", scaling-law curves, and stateful vs stateless architectures.
- **Interactive widgets**: an OS-specific install guide, a latency-numbers chart, a Little's Law calculator, an availability calculator, and a step-through of how an architecture evolves as it grows.
- **Data-driven quizzes**: every module has its own quiz, rendered from `QUIZ_BANK` in `script.js`. Correct answers are spread evenly across A–D, and each question has an accordion with the answer and an explanation.
- **Progress tracking**: sections you've read and quiz answers are saved in your browser's `localStorage`. Nothing is sent to a server.

## Run locally

Any static file server works:

```bash
# Python 3
python3 -m http.server 8000

# or Node.js
npx serve .
```

Then open <http://localhost:8000>. You can also open `index.html` directly, but a server is closer to how GitHub Pages behaves.

## Adding a new module

1. In `script.js`, add an entry to `COURSE_MODULES` (e.g. `{ id: 'm13', number: '13', …, status: 'ready' }`). An entry with `status: 'soon'` renders automatically as a "Coming soon" placeholder.
2. In `index.html`, copy an existing `<article id="m1" …>` block, change the ids (`m13`, `m13-s1`, `m13-s2`, …, `m13-quiz`) and write the content. Every `<section data-subsection data-title="…">` shows up in the sidebar and counts toward progress automatically.
3. In `script.js`, add a `m13: [ … ]` entry to `QUIZ_BANK`. Each question looks like this:

   ```js
   {
     q: 'Question text (HTML allowed)',
     answer: 'The correct option',
     distractors: ['Wrong option 1', 'Wrong option 2', 'Wrong option 3'],
     explain: 'Why the answer is correct (HTML allowed)'
   }
   ```

   Don't set an answer position. The engine places correct answers evenly across A–D, using a seeded shuffle so the order stays the same between page loads. If a question doesn't have exactly three distractors that are all different from each other and from the answer, the browser console shows a warning.

Modules still marked `soon` appear automatically as "Coming soon" placeholders.

---

## Hosting on GitHub Pages

### ⚠️ First: this repository is private

Whether GitHub Pages works for a **private** repository depends on your GitHub plan:

| Plan | Pages from a private repo? | Who can see the published site? |
|------|----------------------------|---------------------------------|
| **GitHub Free** (personal) | ❌ No — Pages is only available for **public** repositories | — |
| **GitHub Pro** (personal) | ✅ Yes | **Everyone on the internet**: the site is public even though the code stays private |
| **GitHub Team** (organization) | ✅ Yes | **Everyone on the internet** |
| **GitHub Enterprise Cloud** | ✅ Yes | Public, **or** limited to organization members ("private Pages" with access control) |

Key implications:

- **On a Free account you have two choices.** Upgrade to GitHub Pro, or make the repository public (steps below).
- **A private repo does not make a private site.** On Pro and Team, the source stays private but the deployed website is public. Only Enterprise Cloud can restrict who sees the site.
- If you later **downgrade from Pro to Free** while the repo is still private, the Pages site is unpublished.

Check your current plan at **Settings → Billing and plans** (your personal settings, not the repository's).

### Option A — Keep the repo private (GitHub Pro / Team / Enterprise)

1. Push the code to `main`:
   ```bash
   git add index.html script.js README.md CNAME
   git commit -m "Add ScaleCraft course site"
   git push origin main
   ```
2. In the repository, go to **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Under **Branch**, choose `main` and the folder `/ (root)`, then click **Save**.
5. Wait 1–2 minutes. Progress shows under the **Actions** tab ("pages build and deployment"), and the URL appears at the top of the Pages settings page:
   `https://<your-username>.github.io/scalable-application-concepts/`
6. **Enterprise Cloud only:** under **Visibility**, choose **Private** if the site should only be visible to organization members.

### Option B — Make the repo public first (GitHub Free)

Making a repository public is easy, but **anyone can then read the entire commit history**, and anything that has been public may already have been cloned, forked or cached. Do this checklist **before** you flip the switch:

1. **Look for secrets in the whole history**, not just the current files:
   ```bash
   # Quick manual search through every commit
   git log -p | grep -iE "password|secret|api[_-]?key|token|BEGIN (RSA|OPENSSH) PRIVATE KEY"

   # More thorough: run a dedicated scanner (both are open source)
   gitleaks detect --source . -v
   # or: trufflehog git file://. --only-verified
   ```
   If you find a real secret, **revoke or rotate it at the provider first**. Deleting it from the code is not enough, because it is still in the history. Remove it from history with `git filter-repo` (or BFG) only if you need to; that rewrites history and requires a force-push.
2. Check that there are no private notes, customer data or internal URLs in issues, pull requests, the wiki or commit messages.
3. Add a `LICENSE` file if you want others to be allowed to reuse the content. Without one, the default is "all rights reserved".
4. Change the visibility:
   - Go to **Settings → General**.
   - Scroll to the **Danger Zone** and click **Change visibility**.
   - Choose **Change to public**, read the warnings, type the repository name to confirm, and complete any 2FA prompt.
5. Turn on Pages as in **Option A, steps 2–5**.

> **Changing it back later?** Switching a public repo back to private permanently removes its stars and watchers, and GitHub Pages turns off unless your plan supports private-repo Pages. Copies that others cloned while it was public stay with them.

### Using a custom domain (the `CNAME` file)

The `CNAME` file contains this site's domain: **`scalecraft.meverse.in`**. GitHub Pages reads it when it publishes, and the `github.io` URL redirects there.

To set it up (or to switch to a different domain):

1. Make sure `CNAME` holds the domain (one line, no `https://`), then commit and push.
2. At your DNS provider:
   - **Subdomain** (like `scalecraft.meverse.in`): add a `CNAME` record for `scalecraft` in the `meverse.in` zone, pointing to `ninadrathod.github.io`.
   - **Apex domain** (e.g. `example.com`): add `A` records for
     `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
     and, optionally, `AAAA` records for
     `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`.
3. In **Settings → Pages → Custom domain**, enter the same domain and click **Save**. Wait for the DNS check to pass.
4. Turn on **Enforce HTTPS**. Certificate provisioning can take up to about an hour after DNS resolves.
5. Recommended: **verify the domain** for your account (**Settings → Pages → Add a domain** in your *profile* settings). This stops anyone else from claiming it for their own Pages site if your DNS records are ever left dangling.

Check DNS from your terminal:

```bash
dig +noall +answer scalecraft.meverse.in
```

### Troubleshooting

| Symptom | Fix |
|---------|-----|
| 404 right after enabling Pages | Wait a few minutes and check the **Actions** tab for the deployment run |
| Site redirects to `scalecraft.meverse.in` but doesn't load | The DNS `CNAME` record for `scalecraft` is missing or still propagating. Check it with `dig` |
| "Enforce HTTPS" is greyed out | DNS hasn't propagated yet or is wrong. Re-check the records and wait |
| Styles missing | Make sure the CDN hosts (`cdn.tailwindcss.com`, `cdnjs.cloudflare.com`, `fonts.googleapis.com`) aren't blocked on your network |
| Progress doesn't persist | The browser blocks `localStorage` (e.g. a strict private mode). The course still works, but progress resets on reload |

## Production note on Tailwind

This project uses the Tailwind **Play CDN** to keep it build-free and easy to edit. That's fine for a course site, but Tailwind recommends a compiled stylesheet for production. If you want faster first paint later, install the Tailwind CLI, compile only the classes the site uses into one small CSS file, and replace the CDN `<script>` with a `<link>` to that file.

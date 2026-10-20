# Contributing

Thanks for your interest in improving the **Medusa + Next.js E-commerce Kit**!
Issues, feature ideas, and pull/merge requests are all welcome.

This project is mirrored to two hosts — contribute wherever you're comfortable:

- **GitHub:** https://github.com/floating-astronaut/medusa-nextjs-ecom-kit
- **GitLab:** https://gitlab.com/nuraveda-lab/nuraveda-lab-medusa-nextjs-ecom-kit

By participating, you agree to abide by our
[Code of Conduct](./CODE_OF_CONDUCT.md).

---

## Ways to contribute

- 🐛 **Report a bug** — open an issue with steps to reproduce, what you expected,
  and what happened (include OS, Node version, and relevant logs).
- 💡 **Suggest a feature** — open an issue describing the use case before
  building, so we can agree on scope.
- 📝 **Improve docs** — typos, clarifications, and better examples are great
  first contributions.
- 🔧 **Fix or build** — grab an open issue (or file one), then send a PR/MR.

---

## Development setup

Follow the [Quick start](./README.md#quick-start) in the README to run the
Medusa backend and the Next.js storefront locally. In short:

```bash
# Backend
cd medusa && cp .env.template .env && npm install && npx medusa db:migrate && npm run seed && npm run dev

# Storefront (second terminal, from repo root)
cp .env.example .env.local && npm install && npm run dev
```

See [Project structure](./README.md#project-structure) for where things live.

---

## Coding standards

- **TypeScript everywhere.** Keep the type check clean:

  ```bash
  npx tsc --noEmit
  ```

- **Lint before you push:**

  ```bash
  npm run lint
  ```

- **Match the surrounding code** — naming, formatting, and file layout. Don't
  introduce a new pattern where an existing one already fits.
- **Keep changes focused.** One logical change per PR/MR makes review easier.
- **Never commit secrets.** Use `.env` files (already git-ignored); only
  `.env.example` / `.env.template` belong in the repo.

---

## Commit messages

Use short, imperative summaries, optionally with a conventional prefix:

```
feat: add saved-address support to checkout
fix: guard empty cart on the order route
docs: clarify Medusa region setup
```

Keep the subject line under ~72 characters and add a body when the "why" isn't
obvious from the diff.

---

## Pull / merge request process

1. **Fork** the repo and create a branch from `main`
   (e.g. `feat/wishlist`, `fix/checkout-total`).
2. Make your change, then run `npx tsc --noEmit` and `npm run lint` — both must
   pass.
3. Update docs (README, comments) if you changed behavior or configuration.
4. Open a PR (GitHub) or MR (GitLab) against `main` with a clear description of
   **what** changed and **why**. Link any related issue.
5. Be responsive to review feedback — small follow-up commits are fine.

---

## Reporting security issues

Please **do not** open a public issue for security vulnerabilities. Report them
privately to the maintainers so a fix can ship before disclosure.

---

## License

By contributing, you agree that your contributions will be licensed under the
[MIT License](./LICENSE) that covers this project.

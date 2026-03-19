---
name: git-commit-push
description: >-
  Commit and push changes to git, working around the --trailer incompatibility
  with older git versions. Bumps cache-busting versions in index.html before
  each push. Use when the user asks to commit, push, or save changes to git.
---

# Git Commit & Push

## Problem

Cursor's shell environment injects `--trailer` into `git commit` commands. On
git < 2.32 (e.g. git 2.25.1) this flag is unrecognized, causing every commit
to fail with `error: unknown option 'trailer'`.

## Workaround

Write the commit message to a temp file and commit with `-F` combined with
the `-c commit.trailer=""` override to suppress the injected trailer:

```bash
echo "Your commit message" > /tmp/commitmsg.txt
git add <files>
/usr/bin/git -c commit.trailer="" commit -F /tmp/commitmsg.txt
```

For multi-line messages:

```bash
cat > /tmp/commitmsg.txt << 'EOF'
Short summary line

Longer description body.
EOF
git add <files>
/usr/bin/git -c commit.trailer="" commit -F /tmp/commitmsg.txt
```

## Cache Version Bump

`index.html` uses `?v=N` query params on asset URLs (e.g. `styles.css?v=11`,
`game.js?v=12`) for cache busting. **Before every commit**, increment each
`?v=` number in `index.html` by 1 so the bump is included in the same commit
as the code changes.

### How to bump

1. Read `index.html` and find all `?v=N` occurrences.
2. For each match, replace `?v=N` with `?v=N+1` using the StrReplace tool.
3. Stage `index.html` alongside the other changed files (see workflow below).

## Full Commit & Push Workflow

1. **Check status and diff** (run in parallel):
   - `git status`
   - `git diff` (staged + unstaged)
   - `git log --oneline -5` (for commit message style)

2. **Bump cache version** — follow the "Cache Version Bump" section above
   to increment all `?v=N` params in `index.html`.

3. **Stage files** (include `index.html` with the version bump):
   - `git add <relevant files> index.html`
   - Never stage `.env`, credentials, or secrets

4. **Commit** using the workaround:
   ```bash
   echo "fix: description of the change" > /tmp/commitmsg.txt
   /usr/bin/git -c commit.trailer="" commit -F /tmp/commitmsg.txt
   ```

5. **Push** (only when the user explicitly asks):
   ```bash
   git push
   ```

6. **Verify**:
   - `git status` after commit to confirm success

## Important

- Always read/diff before committing to understand what's being committed
- Follow the repo's existing commit message style (check `git log`)
- Never force-push to main/master without explicit user request
- Never skip hooks unless the user asks
- Always bump cache versions before committing (see "Cache Version Bump" above)
- Clean up: the temp file at `/tmp/commitmsg.txt` is overwritten each time

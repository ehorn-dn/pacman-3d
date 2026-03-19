---
name: git-commit-push
description: >-
  Commit and push changes to git, working around the --trailer incompatibility
  with older git versions. Use when the user asks to commit, push, or save
  changes to git.
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

## Full Commit & Push Workflow

1. **Check status and diff** (run in parallel):
   - `git status`
   - `git diff` (staged + unstaged)
   - `git log --oneline -5` (for commit message style)

2. **Stage files**:
   - `git add <relevant files>`
   - Never stage `.env`, credentials, or secrets

3. **Commit** using the workaround:
   ```bash
   echo "fix: description of the change" > /tmp/commitmsg.txt
   /usr/bin/git -c commit.trailer="" commit -F /tmp/commitmsg.txt
   ```

4. **Push** (only when the user explicitly asks):
   ```bash
   git push
   ```

5. **Verify**:
   - `git status` after commit to confirm success

## Important

- Always read/diff before committing to understand what's being committed
- Follow the repo's existing commit message style (check `git log`)
- Never force-push to main/master without explicit user request
- Never skip hooks unless the user asks
- Clean up: the temp file at `/tmp/commitmsg.txt` is overwritten each time

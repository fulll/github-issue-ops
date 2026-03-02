# Prerequisites

The only runtime prerequisite is a GitHub personal access token. The pre-compiled binary is self-contained — you do not need Bun to run it.

::: tip Building from source?
If you want to build `github-issue-ops` from source, you will additionally need [Bun](https://bun.sh/) ≥ 1.0. See the [Installation guide](/getting-started/installation#from-source).
:::

## GitHub token

A GitHub personal access token (PAT) is required to call the GitHub API.

### Required scopes

| Scope      | Purpose                                             |
| ---------- | --------------------------------------------------- |
| `repo`     | Creating and reading issues in private repositories |
| `read:org` | Resolving team ownership (`--team-prefix`)          |

::: details Classic vs fine-grained tokens
Both token types work. Classic tokens are simpler to configure for org-wide operations. Fine-grained tokens require explicit repository access per repo, which is impractical for org-wide campaigns.
:::

### Set the token

```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

Add this to your shell profile (`~/.zshrc`, `~/.bashrc`, `~/.config/fish/config.fish`, …) to make it permanent.

::: warning Token security
Never commit your token to version control. Use environment variables or a secrets manager.
:::

## Next step

→ [Install github-issue-ops](/getting-started/installation)

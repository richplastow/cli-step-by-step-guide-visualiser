# CLI Step-by-Step Guide Visualiser

**Transforms a markdown step-by-step guide into an interactive UI**

- Version: 0.0.1
- Created: 7th June 2025 by Rich Plastow
- Updated: 7th June 2025 by Rich Plastow
- Repo: <https://github.com/richplastow/cli-step-by-step-guide-visualiser>
- Demo: <https://richplastow.com/cli-step-by-step-guide-visualiser/>

---

## Overview

Given a markdown file docs/guides/how-to-use-my-command.md like this:

````md
# How to use `my-command`

This is just an example step-by-step guide.

## Step 1: Check that `my-command` is installed

```bash
# The `--version` or `-v` flag will makes my-command exit without doing anything.
my-command --version
# v1.2.3
```
````

Running `node ./visualise.js docs/guides/how-to-use-my-command.md` generates
a docs/guides/how-to-use-my-command.html file - a much more user-friendly way to
work with the step-by-step guide:

<!-- TODO animated gif of the output -->

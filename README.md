# CLI Step-by-Step Guide Visualiser

**Transforms a markdown step-by-step guide into an interactive UI**

- Version: 0.0.1
- Created: 7th June 2025 by Rich Plastow
- Updated: 8th June 2025 by Rich Plastow
- Repo: <https://github.com/richplastow/cli-step-by-step-guide-visualiser>
- Demo: <https://richplastow.com/cli-step-by-step-guide-visualiser/>

---

## Overview

Given a markdown file docs/guides/how-to-use-some-command.md like this:

````md
# How to use `some-command`

This is just an example step-by-step guide.

## Step 1: Check that `some-command` is installed

```bash
# The `--version` or `-v` flag makes some-command exit without doing anything.
some-command --version
# v1.2.3
```
````

Running `node ./visualise.js docs/guides/how-to-use-some-command.md`
generates a docs/guides/how-to-use-some-command.html file - a much more
user-friendly way to work with the step-by-step guide.

Run `open docs/guides/how-to-use-some-command.html` to view in your browser.

<!-- TODO animated gif of the output -->

## Install dependencies and Test

After cloning the repo, run the following commands to build and test:

```bash
# Install dependencies from NPM.
npm install
# added 8 packages, and audited 9 packages in 834ms
# 
# found 0 vulnerabilities

# Run the unit and integration tests.
npm test
# > cli-step-by-step-guide-visualiser@0.0.1 test
# > node test.mjs
# 
# 
# ✅ All tests passed
```

<!-- node_modules/ is 6,980,695 bytes (11.4 MB on disk) for 1,716 items -->

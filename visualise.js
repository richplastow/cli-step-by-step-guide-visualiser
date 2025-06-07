/**
 * @fileoverview Main entry point for the cli-step-by-step-guide-visualiser
 * 
 * @usage
 * 
 * Given a markdown file docs/guides/how-to-use-my-command.md like this:
 * 
 * ````md
 * # How to use `my-command`
 * 
 * This is just an example step-by-step guide.
 * 
 * ## Step 1: Check that `my-command` is installed
 * 
 * ```bash
 * # The `--version` or `-v` flag will makes my-command exit without doing anything.
 * my-command --version
 * # v1.2.3
 * ```
 * ````
 * 
 * Running `node ./visualise.js docs/guides/how-to-use-my-command.md` generates
 * a docs/guides/how-to-use-my-command.html file - a much more user-friendly way
 * to work with the step-by-step guide:
 */

import { readFileSync, writeFileSync } from 'fs';
import hljs from 'highlight.js';
import { Marked } from 'marked';
import { markedHighlight } from "marked-highlight";

// Read the markdown file from the command line argument.
const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node visualise.js <path-to-markdown-file>');
  process.exit(1);
}
if (filePath.slice(-3) !== '.md') {
  console.error('Error: The provided file must be a markdown file with a .md extension.');
  process.exit(1);
}
const fileContent = readFileSync(filePath, 'utf-8');

// Get the title from the first heading in the markdown file.
// @TODO detect H1 underlined with `======`, and probably other cases too.
let title = 'Untitled Step-by-Step Guide';
if (fileContent.startsWith('# ')) {
  const firstLineEnd = fileContent.indexOf('\n');
  title = fileContent.slice(2, firstLineEnd).trim();
} else {
   const firstH1Pos = fileContent.indexOf('\n# ');
   if (firstH1Pos !== -1) {
     const firstH1End = fileContent.indexOf('\n', firstH1Pos + 2);
     title = fileContent.slice(firstH1Pos + 2, firstH1End).trim();
   }
}

// Read the CSS file for styling the HTML output.
const cssFilePath = './node_modules/highlight.js/styles/vs.css';
const cssContent = readFileSync(cssFilePath, 'utf-8');

// Transform the markdown content into HTML, and highlighting code blocks.
const marked = new Marked(
  markedHighlight({
	emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight(code, lang, info) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    }
  })
);
const bodyContent = marked.parse(fileContent);

// Wrap the HTML content in a basic HTML structure.
const htmlContent = `
<!DOCTYPE HTML>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
${cssContent}
</style>
</head>
<body>
${bodyContent}
</body>
</html>
`;

// Write the HTML content to a new file next to the markdown file.
const outputFilePath = filePath.slice(0, -3) + '.html';
writeFileSync(outputFilePath, htmlContent);

// Completed successfully!
console.log(`Visualised guide saved to ${outputFilePath}`);

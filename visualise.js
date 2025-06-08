/**
 * @fileoverview Main entry point for the cli-step-by-step-guide-visualiser
 * 
 * @usage
 * 
 * Given a markdown file docs/guides/how-to-use-some-command.md like this:
 * 
 * ````md
 * # How to use `some-command`
 * 
 * This is just an example step-by-step guide.
 * 
 * ## Step 1: Check that `some-command` is installed
 * 
 * ```bash
 * # The `--version` or `-v` flag makes some-command exit without doing anything.
 * some-command --version
 * # v1.2.3
 * ```
 * ````
 * 
 * Running `node ./visualise.js docs/guides/how-to-use-some-command.md`
 * generates a docs/guides/how-to-use-some-command.html file - a much more
 * user-friendly way to work with the step-by-step guide.
 * 
 * Run `open docs/guides/how-to-use-some-command.html` to view in your browser.
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

// Read the CSS file for highlighting code in dark and light modes.
const cssDarkFilePath = './node_modules/highlight.js/styles/stackoverflow-dark.css';
const cssDarkRaw = readFileSync(cssDarkFilePath, 'utf-8');
const cssDarkPrefixed = cssDarkRaw.replace(/\n\.hljs/g, '\n.CSbSGV-dark .hljs');
const cssLightFilePath = './node_modules/highlight.js/styles/stackoverflow-light.css';
const cssLightRaw = readFileSync(cssLightFilePath, 'utf-8');

// Transform the markdown content into HTML, and highlighting code blocks.
const marked = new Marked(
  markedHighlight({
	emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight(code, lang, info) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      const modifiedCode = 'if fi ' + code;
      return hljs.highlight(modifiedCode, { language }).value;
    }
  })
);
const bodyContent = marked.parse(fileContent);

// TODO - use the lexer and parser directly to get the tokens, or delete this.
// const markedOptions = {
//   ...marked.getDefaults(),
//   ...markedHighlight({
// 	emptyLangClass: 'hljs',
//     langPrefix: 'hljs language-',
//     highlight(code, lang, info) {
//       const language = hljs.getLanguage(lang) ? lang : 'plaintext';
//       return hljs.highlight(code, { language }).value;
//     }
//   }),
// };
// const lexer = new marked.Lexer(markedOptions);
// const tokens = lexer.lex(fileContent);
// // ...or...
// const tokens = marked.lexer(fileContent, markedOptions);
// console.log(tokens);
// const bodyContent = marked.parser(tokens);
// console.log(bodyContent);

// Wrap the HTML content in a basic HTML structure.
const htmlContent = `
<!DOCTYPE HTML>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
body {
  font-family: Arial, sans-serif;
  line-height: 1.6;
  margin: 0;
  padding: 20px;
  background-color: #ccc;
  color: #333;
}
body.CSbSGV-dark {
  background-color: #333;
  color: #ccc;
}
${cssLightRaw}
${cssDarkPrefixed}
</style>
</head>
<body>
<script>
// Based on https://ultimatecourses.com/blog/detecting-dark-mode-in-javascript
if (window.matchMedia) { // browser supports matchMedia  
    const fn = isDark => document.body.classList[isDark ? 'add' : 'remove']('CSbSGV-dark');
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    fn(query.matches);
    query.addEventListener('change', event => fn(event.matches));
}
</script>
${bodyContent}
</body>
</html>
`;

// Write the HTML content to a new file next to the markdown file.
const outputFilePath = filePath.slice(0, -3) + '.html';
writeFileSync(outputFilePath, htmlContent);

// Completed successfully!
console.log(`Visualised guide saved to ${outputFilePath}`);

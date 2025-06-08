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
import fm from 'front-matter';
import hljs from 'highlight.js';
import { Marked } from 'marked';
import { markedHighlight } from "marked-highlight";
import { parseShellCodeBlock } from './lib/parse-shell-code-block.mjs';
import { log } from 'console';

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
      // TODO exhaustive list of shell-like languages
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      if (!new Set(['bash', 'console', 'fish', 'shell', 'sh', 'zsh']).has(language)) {
        return hljs.highlight(code, { language }).value;
      }
      const tokens = parseShellCodeBlock(code);
      console.log(tokens);
      const html = tokens.map((token, tokenIndex) => {
        const groupIndex = Math.floor(tokenIndex / 3);
        const dataAttribs = [
          `data-CSbSGV-kind="${token.kind}"`,
          `data-CSbSGV-group="${groupIndex}"`,
          `data-CSbSGV-token="${tokenIndex}"`,
        ].join(' ');
        switch (token.kind) {
          case 'description':
            return token.lines.map((line, lineIndex) =>
              `<span class="hljs-section" ${dataAttribs} data-CSbSGV-line="${lineIndex}">${line}</span>`).join('\n');;
          case 'command':
            return token.lines.map((line, lineIndex) =>
              `<span ${dataAttribs} data-CSbSGV-line="${lineIndex}">${hljs.highlight(line, { language }).value}</span>`);
          case 'output':
            return token.lines.map((line, lineIndex) =>
              `<span class="hljs-string" ${dataAttribs} data-CSbSGV-line="${lineIndex}">${line}</span>`).join('\n');
          default:
            throw new Error(`visualise.js: Unknown token kind: ${token.kind}`);
        }
      });
      return html.join('\n');
    }
  })
);

// Define an override for Marked's preprocess() function, which removes any
// frontmatter, and converts it to a JavaScript object.
let actualFrontmatter = {};
const frontmatter = {};
function preprocess(markdown) {
  const { attributes, body } = fm(markdown);
  for (const prop in attributes) {
    if (prop in this.options) {
      this.options[prop] = attributes[prop];
    }
  }
  actualFrontmatter = attributes;
  return body;
}
marked.use({ hooks: { preprocess } });

// Parse the markdown content into HTML.
const bodyContent = marked.parse(fileContent);

// Validate frontmatter, and fall back to defaults.
console.log(actualFrontmatter);
const icon = {
    type: 'string',
    validator: /^asset\/[-_/a-z0-9]+\.(png|webp)$/,
};
const image = {
    type: 'string',
    validator: /^asset\/[-_/a-z0-9]+\.(jpg|jpeg|png|webp)$/,
};
const frontmatterSchema = [
  ['desktopIconAppMusic', 'asset/desktop-icon-app-music-default.png', icon],
  ['desktopIconAppTerminal', 'asset/desktop-icon-app-terminal-default.png', icon],
  ['desktopIconDiskFloppy', 'asset/desktop-icon-disk-floppy-default.png', icon],
  ['desktopIconDocument', 'asset/desktop-icon-document-default.png', icon],
  ['desktopIconFolder', 'asset/desktop-icon-folder-default.png', icon],
  ['desktopIconTrash', 'asset/desktop-icon-trash-default.png', icon],
  ['wallpaperLandscape', 'asset/wallpaper-landscape-default.jpg', image],
].map(([identifier, fallback, { type, validator }]) => ({
  identifier,
  type,
  fallback,
  validator: validator || null,
}));
frontmatterSchema
frontmatterSchema.forEach(({ identifier, type, fallback, validator }) => {
  if (!(identifier in actualFrontmatter))
    return frontmatter[identifier] = fallback;
  const value = actualFrontmatter[identifier];
  if (typeof value !== type)
    throw new Error(`visualise.js: Frontmatter property "${identifier}" must be of type ${type}, got ${typeof value}`);
  if (validator && !validator.test(value))
    throw new Error(`visualise.js: Frontmatter property "${identifier}" fails ${validator}, got "${value}"`);
  frontmatter[identifier] = value;
});
console.log(`visualise.js: Frontmatter: ${JSON.stringify(frontmatter, null, 2)}`);

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

// Build the imaginary OS HTML content.
const imaginaryOs = `
<div
  class="CSbSGV-imaginary-os CSbSGV-landscape"
  style="background-image: url('${frontmatter.wallpaperLandscape}');"
>
<img src="${frontmatter.desktopIconTrash}" alt="Trash Icon" class="CSbSGV-desktop-icon" style="bottom: 52px;">
<img src="${frontmatter.desktopIconAppTerminal}" alt="Terminal App Icon" class="CSbSGV-desktop-icon" style="bottom: 96px;">
<img src="${frontmatter.desktopIconDiskFloppy}" alt="Disk Floppy Icon" class="CSbSGV-desktop-icon" style="bottom: 140px;">
<img src="${frontmatter.desktopIconDocument}" alt="Document Icon" class="CSbSGV-desktop-icon" style="bottom: 184px;">
<img src="${frontmatter.desktopIconFolder}" alt="Folder Icon" class="CSbSGV-desktop-icon" style="bottom: 228px;">
<img src="${frontmatter.desktopIconAppMusic}" alt="Music App Icon" class="CSbSGV-desktop-icon" style="bottom: 272px;">
</div>`;

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
.CSbSGV-imaginary-os.CSbSGV-landscape {
  position: fixed;
  bottom: 20px;
  left: 20px;
  width: 576px;
  height: 324px;
  background-size: cover;
  background-position: center;
  z-index: -1;
}
.CSbSGV-desktop-icon {
  position: fixed;
  left: 550px;
  width: 32px;
  height: 32px;
  cursor: pointer;
  transition: filter 0.2s ease-in-out;
}
.CSbSGV-desktop-icon:hover {
  position: fixed;
  filter: brightness(0.7);
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
${imaginaryOs}
</body>
</html>
`;

// Write the HTML content to a new file next to the markdown file.
const outputFilePath = filePath.slice(0, -3) + '.html';
writeFileSync(outputFilePath, htmlContent);

// Completed successfully!
console.log(`Visualised guide saved to ${outputFilePath}`);

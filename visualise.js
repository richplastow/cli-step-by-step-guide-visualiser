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
const icon = {
    type: 'string',
    validator: /^asset\/[-_/a-z0-9]+\.(png|webp)$/,
};
const image = {
    type: 'string',
    validator: /^asset\/[-_/a-z0-9]+\.(jpg|jpeg|png|webp)$/,
};
const frontmatterSchema = [
  ['desktopCursorArrowLight', 'asset/desktop-icon-arrow-light-default.png', icon],
  ['desktopCursorPointerDownLight', 'asset/desktop-icon-pointer-down-light-default.png', icon],
  ['desktopCursorPointerUpLight', 'asset/desktop-icon-pointer-up-light-default.png', icon],
  ['desktopCursorWaitLight', 'asset/desktop-icon-wait-light-default.png', icon],
  ['desktopIconAppBrowserLight', 'asset/desktop-icon-app-browser-light-default.png', icon],
  ['desktopIconAppMusicLight', 'asset/desktop-icon-app-music-light-default.png', icon],
  ['desktopIconAppTbdLight', 'asset/desktop-icon-app-tbd-light-default.png', icon],
  ['desktopIconAppVideoChatLight', 'asset/desktop-icon-app-video-chat-light-default.png', icon],
  ['desktopIconFileAudioLight', 'asset/desktop-icon-file-audio-light-default.png', icon],
  ['desktopIconFileGenericLight', 'asset/desktop-icon-file-generic-light-default.png', icon],
  ['desktopIconFileHtmlLight', 'asset/desktop-icon-file-html-light-default.png', icon],
  ['desktopIconFileImageLight', 'asset/desktop-icon-file-image-light-default.png', icon],
  ['desktopIconFileScriptLight', 'asset/desktop-icon-file-script-light-default.png', icon],
  ['desktopIconFileTbdLight', 'asset/desktop-icon-file-tbd-light-default.png', icon],
  ['desktopIconFileTextLight', 'asset/desktop-icon-file-text-light-default.png', icon],
  ['desktopIconFileVideoLight', 'asset/desktop-icon-file-video-light-default.png', icon],
  ['desktopIconLocationFloppyDiskLight', 'asset/desktop-icon-location-floppy-disk-light-default.png', icon],
  ['desktopIconLocationFolderLight', 'asset/desktop-icon-location-folder-light-default.png', icon],
  ['desktopIconLocationHardDriveLight', 'asset/desktop-icon-location-hard-drive-light-default.png', icon],
  ['desktopIconLocationTrashLight', 'asset/desktop-icon-location-trash-light-default.png', icon],
  ['desktopIconUtilityMediaViewerLight', 'asset/desktop-icon-utility-media-viewer-light-default.png', icon],
  ['desktopIconUtilitySettingsLight', 'asset/desktop-icon-utility-settings-light-default.png', icon],
  ['desktopIconUtilityTbdLight', 'asset/desktop-icon-utility-tbd-light-default.png', icon],
  ['desktopIconUtilityTerminalLight', 'asset/desktop-icon-utility-terminal-light-default.png', icon],
  ['desktopUiScrollbarDownLight', 'asset/desktop-ui-scrollbar-down-light-default.png', icon],
  ['desktopUiScrollbarLeftLight', 'asset/desktop-ui-scrollbar-left-light-default.png', icon],
  ['desktopUiScrollbarRightLight', 'asset/desktop-ui-scrollbar-right-light-default.png', icon],
  ['desktopUiScrollbarUpLight', 'asset/desktop-ui-scrollbar-up-light-default.png', icon],
  ['desktopUiThumbBodyHorizontalLight', 'asset/desktop-ui-thumb-body-horizontal-light-default.png', icon],
  ['desktopUiThumbBodyVerticalLight', 'asset/desktop-ui-thumb-body-vertical-light-default.png', icon],
  ['desktopUiThumbBottomLight', 'asset/desktop-ui-thumb-bottom-light-default.png', icon],
  ['desktopUiThumbLeftLight', 'asset/desktop-ui-thumb-left-light-default.png', icon],
  ['desktopUiThumbRightLight', 'asset/desktop-ui-thumb-right-light-default.png', icon],
  ['desktopUiThumbTopLight', 'asset/desktop-ui-thumb-top-light-default.png', icon],
  ['desktopUiThumbTrackHorizontalLight', 'asset/desktop-ui-thumb-track-horizontal-light-default.png', icon],
  ['desktopUiThumbTrackVerticalLight', 'asset/desktop-ui-thumb-track-vertical-light-default.png', icon],
  ['desktopUiWindowDismissLight', 'asset/desktop-ui-window-dismiss-light-default.png', icon],
  ['desktopUiWindowMaxLight', 'asset/desktop-ui-window-max-light-default.png', icon],
  ['desktopUiWindowMinLight', 'asset/desktop-ui-window-min-light-default.png', icon],
  ['desktopUiWindowResizeLight', 'asset/desktop-ui-window-resize-light-default.png', icon],
  ['desktopWallpaperLight', 'asset/desktop-wallpaper-light-default.jpg', image],
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
  style="background-image: url('${frontmatter.desktopWallpaperLight}');"
>
<img src="${frontmatter.desktopIconLocationTrashLight}" alt="Trash Icon" class="CSbSGV-desktop-icon" style="bottom: 52px;">
<img src="${frontmatter.desktopIconUtilityTerminalLight}" alt="Terminal App Icon" class="CSbSGV-desktop-icon" style="bottom: 96px;">
<img src="${frontmatter.desktopIconLocationFloppyDiskLight}" alt="Floppy Disk Icon" class="CSbSGV-desktop-icon" style="bottom: 140px;">
<img src="${frontmatter.desktopIconFileTextLight}" alt="Text File Icon" class="CSbSGV-desktop-icon" style="bottom: 184px;">
<img src="${frontmatter.desktopIconLocationFolderLight}" alt="Folder Icon" class="CSbSGV-desktop-icon" style="bottom: 228px;">
<img src="${frontmatter.desktopIconAppMusicLight}" alt="Music App Icon" class="CSbSGV-desktop-icon" style="bottom: 272px;">
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

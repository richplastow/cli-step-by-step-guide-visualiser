// import fm from 'front-matter';
import { marked } from 'marked';

const BR = { kind: 'br' }; // A special token to represent line breaks in paragraphs.
const markedDefaultOptions = marked.getDefaults();

/** ### Parses markdown content
 * 
 * Markdown content in a step-by-step guide must follow this format:
 * 
 * TODO describe the format
 * 
 * Note that this function defers parsing frontmatter and shell code blocks to:
 * - [parseMarkdownFrontmatter()](./parse-markdown-frontmatter.mjs)
 * - [parseMarkdownContent()](./parse-shell-code-block.mjs)
 *
 * @param {string} rawMarkdown - The unprocessed content of a markdown file, to parse.
 * @returns {[]} - An array of tokens (plain objects) representing the parsed markdown file.
 * @throws {Error} - If the code block is not formatted correctly.
 *
 * @example
 * const rawMarkdown = '# Heading\n\n> This is a blockquote.\n\n## Subheading\n\nSome  \ntext\nhere.\n';
 * const parsed = parseMarkdownContent(rawMarkdown);
 * console.log(JSON.stringify(parsed, null, 2));
 * // Output:
 * // [
 * //   { kind: 'heading', level: 1, lines: ['Heading'] },
 * //   { kind: 'blockquote', lines: ['This is a blockquote.'] },
 * //   { kind: 'heading', level: 2, lines: ['Subheading'] },
 * //   { kind: 'paragraph', lines: ['Some', { kind: 'br' }, 'text\nhere.'] }
 * // ]
 */
export function parseMarkdownContent(codeBlock) {
  const pfx = 'parseMarkdownContent():';

  const lexer = new marked.Lexer(markedDefaultOptions); // TODO maybe reuse same lexer
  const tokens = lexer.lex(codeBlock);
  // ...or...
  // const tokens = marked.lexer(codeBlock, markedDefaultOptions);
  // console.log(tokens);

  return tokens.map(({ type: kind, depth: level, text, tokens }) => {
    switch (kind) {
      case 'heading':
        return { kind, level, lines: [text] };
      case 'code':
        return { kind, language: tokens[0].lang, lines: tokens[0].text.split('\n') };
      case 'space':
        return null; // Ignore spaces
      case 'blockquote':
      case 'paragraph':
      case 'list':
        // return { kind, lines: tokens.map(t => {console.log(t); return t.text}) };
        return { kind, lines: tokens.map(t => t.type === 'br' ? BR : t.text) };
      default:
        throw new Error(`${pfx} Unsupported token type "${kind}"`);
    }
  }).filter(Boolean); // Remove null values (spaces)
}

export function testParseMarkdownContent(eq, throws) {
  const pfx = 'parseMarkdownContent():';
  const fn = parseMarkdownContent;

  // Can return an empty array.
  eq(fn(''), [], 'Empty markdown should return an empty array');
  eq(fn('  \n\t\r\n\n'), [], 'Markdown with only whitespace should return an empty array');

  // Test the example from the function JSDocs.
  eq(
    fn('# Heading\n\n> This is a blockquote.\n\n## Subheading\n\nSome  \ntext\nhere.\n'),
    [
      { kind: 'heading', level: 1, lines: ['Heading'] },
      { kind: 'blockquote', lines: ['This is a blockquote.'] },
      { kind: 'heading', level: 2, lines: ['Subheading'] },
      { kind: 'paragraph', lines: ['Some', BR, 'text\nhere.'] }
    ],
    "Should parse the example from the function JSDocs correctly",
  )
}

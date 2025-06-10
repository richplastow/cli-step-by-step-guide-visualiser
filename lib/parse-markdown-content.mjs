// import fm from 'front-matter';
import { marked } from 'marked';

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
 * @returns {[]} - An array of nodes (plain objects) representing the parsed markdown file.
 * @throws {Error} - If the code block is not formatted correctly.
 *
 * @example
 * const rawMarkdown = '# Heading\n\n> This is a *blockquote.*\n\n## Subheading\n\nSome  \ntext\nhere.\n';
 * console.log(parseMarkdownContent(rawMarkdown));
 * // Output:
 * // [
 * //   { kind: 'heading', level: 1, subnodes: ['Heading'] },
 * //   { kind: 'blockquote', subnodes: [{
 * //     kind: 'paragraph', subnodes: [
 * //       'This is a ', { kind: 'em', subnodes: ['blockquote.'] },
 * //     ]}
 * //   ]},
 * //   { kind: 'blockquote', subnodes: ['This is a blockquote.'] },
 * //   { kind: 'heading', level: 2, subnodes: ['Subheading'] },
 * //   { kind: 'paragraph', subnodes: ['Some', { kind: 'br' }, 'text\nhere.'] },
 * // ]
 */
export function parseMarkdownContent(codeBlock) {
  const pfx = 'parseMarkdownContent():';

  const lexer = new marked.Lexer(markedDefaultOptions); // TODO maybe reuse same lexer
  const tokens = lexer.lex(codeBlock);
  // ...or...
  // const tokens = marked.lexer(codeBlock, markedDefaultOptions);
  // console.log(tokens);

  return tokens
    .map(tokenToNode)
    .filter(Boolean); // Remove null values (spaces)
}

/** ### Recursively transforms a `marked` token to a node
 * 
 */
function tokenToNode(token) {
  const { type: kind, depth: level, text, tokens } = token;
  if (kind === 'text') return text; // Return plain text directly
  switch (kind) {
    case 'br':
      return { kind: 'br' };
    case 'code':
      return { kind, language: tokens[0].lang, subnodes: tokens[0].text.split('\n') };
    case 'heading':
      return { kind, level, subnodes: [text] };
    case 'space':
      return null; // Ignore spaces
    case 'blockquote':
    case 'em':
    case 'list':
    case 'paragraph':
      return { kind, subnodes: tokens.map(tokenToNode).filter(Boolean) };
    default:
      throw new Error(`Unsupported token type "${kind}"`);
  }
}

export function testParseMarkdownContent(eq, throws) {
  const pfx = 'parseMarkdownContent():';
  const fn = parseMarkdownContent;

  // Can return an empty array.
  eq(fn(''), [], 'Empty markdown should return an empty array');
  eq(fn('  \n\t\r\n\n'), [], 'Markdown with only whitespace should return an empty array');

  // Test the example from the function JSDocs.
  eq(
    fn('# Heading\n\n> This is a *blockquote.*\n\n## Subheading\n\nSome  \ntext\nhere.\n'),
    [
      { kind: 'heading', level: 1, subnodes: ['Heading'] },
      { kind: 'blockquote', subnodes: [{
        kind: 'paragraph', subnodes: [
          'This is a ', { kind: 'em', subnodes: ['blockquote.'] },
        ]}
      ]},
      { kind: 'heading', level: 2, subnodes: ['Subheading'] },
      { kind: 'paragraph', subnodes: ['Some', { kind: 'br' }, 'text\nhere.'] },
    ],
    'Should parse the example from the function JSDocs correctly',
  )
}

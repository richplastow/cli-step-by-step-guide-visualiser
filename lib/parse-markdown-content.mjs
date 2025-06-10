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
 * const rawMarkdown = '# Heading\n\n> This is a quote.\n\n## Subheading\n\nSome  \ntext.\n';
 * const parsed = parseMarkdownContent(rawMarkdown);
 * console.log(JSON.stringify(parsed, null, 2));
 * // Output:
 * // [
 * //   { kind: 'heading', level: 1, lines: ['Heading'] },
 * //   { kind: 'quote', lines: ['This is a quote.'] },
 * //   { kind: 'heading', level: 2, lines: ['Subheading'] },
 * //   { kind: 'paragraph', lines: ['Some', 'text.'] }
 * // ]
 */
export function parseMarkdownContent(codeBlock) {
  const pfx = 'parseMarkdownContent():';

  return [];
}

export function testParseMarkdownContent(eq, throws) {
  const pfx = 'parseMarkdownContent():';
  const fn = parseMarkdownContent;

  // Can return an empty array.
  eq(fn(''), [], 'Empty markdown should return an empty array');
  eq(fn('  \n\t\r\n\n'), [], 'Markdown with only whitespace should return an empty array');

}

// import fm from 'front-matter';
import hljs from 'highlight.js';
import { marked } from 'marked';
import { parseShellCodeBlock } from './parse-shell-code-block.mjs';

const markedDefaultOptions = marked.getDefaults();

const afterHighlightHandler = (result) => {
  const pfx = 'afterHighlightHandler():';
  const children = result?._emitter?.rootNode?.children;
  if (!Array.isArray(children)) throw Error(
    `${pfx} _emitter.rootNode.children is type "${typeof children}" not an array`);
  // console.log('afterHighlightHandler', result._emitter.rootNode.children);
  result.value = children.map(highlightJsChildToNode);
;
}

/** ### Recursively transforms a highlight.js child to a node */
function highlightJsChildToNode(child) {
  if (typeof child === 'string') return child; // Return plain text directly
  const {
    children, // sub-nodes for nested structures
    scope: kind, // the type of the child, e.g. 'string', 'variable.language', etc.
  } = child;
  return { kind, subnodes: children.map(highlightJsChildToNode) };
}

hljs.addPlugin({
  'after:highlight': afterHighlightHandler,
});

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
  const {
    type: kind, // the type of the token, e.g. 'paragraph', 'heading', etc.
    depth: level, // the depth of a heading (1-6)
    items, // items in a list
    lang, // language, if a fenced code block
    ordered, // whether a list is ordered or unordered
    text, // the text content of the token
    tokens, // sub-tokens for nested structures
  } = token;
  if (kind === 'text') return text; // Return plain text directly
  switch (kind) {
    case 'br':
      return { kind: 'br' };
    case 'code':
      const language = lang || 'plaintext';
      if (!new Set(['bash', 'console', 'fish', 'shell', 'sh', 'zsh']).has(language)) {
        const { value } = hljs.highlight(text, { language });
        return { kind, language: lang, subnodes: value };
      }
      const subnodes = parseShellCodeBlock(text)
        .map((subnode) => {
          const { kind, lines } = subnode;
          if (kind !== 'command') return subnode;
          // console.log(hljs.highlight(lines.join('\n'), { language }).value);          
          return {
            kind,
            subnodes: hljs.highlight(lines.join('\n'), { language }).value
          };
        })
      ;
      return { kind, language: lang, subnodes };
    case 'heading':
      return { kind, level, subnodes: [text] };
    case 'space':
      return null; // Ignore spaces
    case 'list':
      return { kind, ordered, subnodes: items.map(tokenToNode).filter(Boolean) };
    case 'blockquote':
    case 'em':
    case 'list_item':
    case 'paragraph':
    case 'strong':
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

  // Can parse code blocks.
  eq(fn('```js\nconsole.log("Hello, world!");\n```'),
    [{ kind: 'code', language: 'js', subnodes:  [
      { kind: 'variable.language', subnodes: ['console'] },
      '.',
      { kind: 'title.function', subnodes: ['log'] },
      '(',
      { kind: 'string', subnodes: ['"Hello, world!"'] },
      ')',
      ';'
    ]}],
    'Should parse a code block with JavaScript language');
  eq(fn('```sh\n# List pwd\nls -la\n# total 123\n# ...\n```'),
    [{ kind: 'code', language: 'sh', subnodes: [
      { kind: 'description', lines: ['List pwd'] },
      { kind: 'command', subnodes: [ { kind: 'built_in', subnodes: [ 'ls' ] }, ' -la' ] },
      { kind: 'output', lines: ['total 123', '...'] },
    ]}],
    'Should parse a shell code block with parseShellCodeBlock()');

  // Can parse headings with different levels.
  eq(fn('# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6'),
    [1,2,3,4,5,6].map(level => ({
      kind: 'heading', level, subnodes: [`H${level}`],
    })), 'Should parse headings with different levels correctly');

  // Can parse non-nested nodes inside a paragraph.
  eq(fn('Hello'), [{ kind: 'paragraph', subnodes: ['Hello'] }],
    'Single text node should return a paragraph');
  eq(fn('One  \nTwo'), [{ kind: 'paragraph', subnodes: ['One', { kind: 'br' }, 'Two'] }],
    'Two spaces signifies a line break');
  eq(fn('> block...\n> ...quote'),
    [{ kind: 'blockquote', subnodes: [{kind: 'paragraph', subnodes: ['block...\n...quote'],}]}],
    'Should parse blockquotes correctly');
  eq(fn('*asterisk*_underscore_'),
    [{kind: 'paragraph', subnodes: [
      { kind: 'em', subnodes: ['asterisk'] }, { kind: 'em', subnodes: ['underscore'] }
    ]}],
    'Should parse emphasis (italic) correctly');
  eq(fn('__underscore__**asterisk**'),
    [{kind: 'paragraph', subnodes: [
      { kind: 'strong', subnodes: ['underscore'] }, { kind: 'strong', subnodes: ['asterisk'] }
    ]}],
    'Should parse strong (bold) correctly');

  // Can parse lists.
  eq(fn('1. One\n2. Two'),
    [{ kind: 'list', ordered: true, subnodes: [
      { kind: 'list_item', subnodes: ['One'] }, { kind: 'list_item', subnodes: ['Two'] },
    ]}],
    'Should parse simple ordered lists correctly');
  eq(fn('- One\n- Two'),
    [{ kind: 'list', ordered: false, subnodes: [
      { kind: 'list_item', subnodes: ['One'] }, { kind: 'list_item', subnodes: ['Two'] },
    ]}],
    'Should parse simple unordered lists correctly');

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

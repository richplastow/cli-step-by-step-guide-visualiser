/** Marked tokens from node_modules/marked/lib/marked.d.ts converted from
 * interfaces to types. */
export declare namespace Marked {
    type Token = (
      | Blockquote
      | Br
      | Code
      | Codespan
      | Del
      | Em
      | Heading
      | Hr
      | HTML
      | Image
      | Link
      | List
      | ListItem
      | Paragraph
      | Strong
      | Table
      | Text
    );
    type Blockquote = {
        type: "blockquote";
        raw: string;
        text: string;
        tokens: Token[];
    }
    type Br = {
        type: "br";
        raw: string;
    }
    type Code = {
        type: "code";
        raw: string;
        codeBlockStyle?: "indented";
        lang?: string;
        text: string;
        escaped?: boolean;
    }
    type Codespan = {
        type: "codespan";
        raw: string;
        text: string;
    }
    type Del = {
        type: "del";
        raw: string;
        text: string;
        tokens: Token[];
    }
    type Em = {
        type: "em";
        raw: string;
        text: string;
        tokens: Token[];
    }
    type Heading = {
        type: "heading";
        raw: string;
        depth: number;
        text: string;
        tokens: Token[];
    }
    type Hr = {
        type: "hr";
        raw: string;
    }
    type HTML = {
        type: "html";
        raw: string;
        pre: boolean;
        text: string;
        block: boolean;
    }
    type Image = {
        type: "image";
        raw: string;
        href: string;
        title: string | null;
        text: string;
        tokens: Token[];
    }
    type Link = {
        type: "link";
        raw: string;
        href: string;
        title?: string | null;
        text: string;
        tokens: Token[];
    }
    type List = {
        type: "list";
        raw: string;
        ordered: boolean;
        start: number | "";
        loose: boolean;
        items: ListItem[];
    }
    type ListItem = {
        type: "list_item";
        raw: string;
        task: boolean;
        checked?: boolean;
        loose: boolean;
        text: string;
        tokens: Token[];
    }
    type Paragraph = {
        type: "paragraph";
        raw: string;
        pre?: boolean;
        text: string;
        tokens: Token[];
    }
    type Strong = {
        type: "strong";
        raw: string;
        text: string;
        tokens: Token[];
    }
    type Table = {
        type: "table";
        raw: string;
        align: Array<"center" | "left" | "right" | null>;
        header: TableCell[];
        rows: TableCell[][];
    }
    type TableCell = {
        text: string;
        tokens: Token[];
        header: boolean;
        align: "center" | "left" | "right" | null;
    }
    type TableRow = {
        text: string;
    }
}
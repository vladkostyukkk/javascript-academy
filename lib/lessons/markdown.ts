import { fromMarkdown } from "mdast-util-from-markdown";
import type { Nodes } from "mdast";

export const allowedMarkdownElements = [
  "p",
  "h2",
  "h3",
  "h4",
  "strong",
  "em",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "code",
  "a",
  "br",
  "hr",
];
const allowedNodes = new Set([
  "root",
  "paragraph",
  "heading",
  "text",
  "strong",
  "emphasis",
  "list",
  "listItem",
  "blockquote",
  "code",
  "inlineCode",
  "link",
  "break",
  "thematicBreak",
]);

export function safeMarkdownUrl(url: string) {
  if (!/^https:\/\//i.test(url) || /[\s\\\u0000-\u001f]/.test(url)) return "";
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password
      ? url
      : "";
  } catch {
    return "";
  }
}

export function validateMarkdown(source: string) {
  if (!source.trim() || new TextEncoder().encode(source).length > 32_768)
    throw new Error("Markdown має бути непорожнім і не перевищувати 32 KiB.");
  const tree = fromMarkdown(source);
  function visit(node: Nodes, depth: number) {
    if (depth > 12 || !allowedNodes.has(node.type))
      throw new Error(
        `Недозволений елемент Markdown: ${node.type}. HTML/MDX та зображення не підтримуються.`,
      );
    if (node.type === "heading" && (node.depth < 2 || node.depth > 4))
      throw new Error("Заголовки матеріалу мають рівні 2–4.");
    if (node.type === "link" && !safeMarkdownUrl(node.url))
      throw new Error("У матеріалах дозволені лише безпечні HTTPS-посилання.");
    if (
      node.type === "code" &&
      (node.meta ||
        (node.lang &&
          !["js", "javascript", "html", "css", "json", "text"].includes(
            node.lang,
          )))
    )
      throw new Error("Непідтримуваний формат прикладу коду.");
    if ("children" in node)
      node.children.forEach((child) => visit(child, depth + 1));
  }
  visit(tree, 0);
  return source;
}

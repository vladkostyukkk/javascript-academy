import Markdown from "react-markdown";
import {
  allowedMarkdownElements,
  safeMarkdownUrl,
  validateMarkdown,
} from "@/lib/lessons/markdown";

export function TheoryMarkdown({ source }: { source: string }) {
  return (
    <div className="lesson-markdown">
      <Markdown
        allowedElements={allowedMarkdownElements}
        skipHtml
        urlTransform={safeMarkdownUrl}
      >
        {validateMarkdown(source)}
      </Markdown>
    </div>
  );
}

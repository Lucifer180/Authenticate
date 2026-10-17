import { useState } from "react";

interface Props {
  code: string;
  file?: string;
}

const CodeBlock = ({ code, file }: Props) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard can be blocked; copying is a convenience only.
    }
  };

  return (
    <figure className="code">
      <figcaption className="code__head">
        <span className="code__file">{file ?? "snippet"}</span>
        <button className="code__copy" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </figcaption>
      <pre>
        <code>{code.trim()}</code>
      </pre>
    </figure>
  );
};

export default CodeBlock;

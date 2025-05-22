import React, { JSX } from "react";

export const renderFormattedResponse = (text: string) => {
  const lines = text.split("\n");

  const parseInlineFormatting = (line: string) => {
    return line
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/~~(.*?)~~/g, "<del>$1</del>")
      .replace(/`(.*?)`/g, "<code>$1</code>")
      .replace(
        /\[(.*?)\]\((.*?)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
      );
  };

  const isTableDivider = (line: string) => /^(\|\s*:?-+:?\s*)+\|$/.test(line);

  const parseMarkdownTable = (
    headerLine: string,
    dividerLine: string,
    rows: string[]
  ) => {
    const headers = headerLine
      .split("|")
      .slice(1, -1)
      .map((h) => h.trim());

    const dataRows = rows.map((row) =>
      row
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim())
    );

    return (
      <table
        key={`table-${Math.random()}`}
        className="markdown-table border border-collapse w-full my-4"
      >
        <thead>
          <tr>
            {headers.map((header, idx) => (
              <th
                key={`th-${idx}`}
                className="border px-2 py-1 bg-gray-100 text-left"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataRows.map((cells, rowIdx) => (
            <tr key={`tr-${rowIdx}`}>
              {cells.map((cell, cellIdx) => (
                <td
                  key={`td-${rowIdx}-${cellIdx}`}
                  className="border px-2 py-1"
                >
                  <span
                    dangerouslySetInnerHTML={{
                      __html: parseInlineFormatting(cell),
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeBlockLang = "";
  const rendered: React.ReactNode[] = [];
  let listBuffer: string[] = [];

  const flushList = (keyBase: string) => {
    if (listBuffer.length > 0) {
      rendered.push(
        <ul key={`${keyBase}-ul`}>
          {listBuffer.map((item, i) => (
            <li
              key={`${keyBase}-li-${i}`}
              dangerouslySetInnerHTML={{ __html: parseInlineFormatting(item) }}
            />
          ))}
        </ul>
      );
      listBuffer = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Table check
    if (line.startsWith("|") && isTableDivider(lines[i + 1]?.trim() || "")) {
      const headerLine = line;
      const dividerLine = lines[i + 1];
      const tableRows: string[] = [];
      i += 2;
      while (i < lines.length && lines[i].startsWith("|")) {
        tableRows.push(lines[i]);
        i++;
      }
      i--; // karena for-loop bakal naik lagi
      rendered.push(parseMarkdownTable(headerLine, dividerLine, tableRows));
      continue;
    }

    // Heading underline style (===, ---)
    const nextLine = lines[i + 1]?.trim();
    if (/^=+$/.test(nextLine)) {
      flushList(`h1-${i}`);
      rendered.push(
        <h1
          key={`h1-${i}`}
          dangerouslySetInnerHTML={{ __html: parseInlineFormatting(line) }}
        />
      );
      i++;
      continue;
    } else if (/^-+$/.test(nextLine)) {
      flushList(`h2-${i}`);
      rendered.push(
        <h2
          key={`h2-${i}`}
          dangerouslySetInnerHTML={{ __html: parseInlineFormatting(line) }}
        />
      );
      i++;
      continue;
    }

    // Markdown headings (# to ######)
    const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      flushList(`hx-${i}`);
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      const Tag = `h${level}` as keyof JSX.IntrinsicElements;
      rendered.push(
        <Tag
          key={`h${level}-${i}`}
          dangerouslySetInnerHTML={{
            __html: parseInlineFormatting(content),
          }}
        />
      );
      continue;
    }

    // Unordered list (-, *, +)
    const listMatch = line.match(/^[-*+]\s+(.*)/);
    if (listMatch) {
      listBuffer.push(listMatch[1]);
      continue;
    } else {
      flushList(`list-${i}`);
    }

    // Blockquote
    if (line.startsWith("> ")) {
      rendered.push(
        <blockquote
          key={`bq-${i}`}
          dangerouslySetInnerHTML={{
            __html: parseInlineFormatting(line.slice(2)),
          }}
        />
      );
      continue;
    }

    // Empty line as <br />
    if (line === "") {
      rendered.push(<br key={`br-${i}`} />);
      continue;
    }

    // Default paragraph
    rendered.push(
      <p
        key={`p-${i}`}
        dangerouslySetInnerHTML={{ __html: parseInlineFormatting(line) }}
      />
    );
  }

  flushList("end");

  return rendered;
};

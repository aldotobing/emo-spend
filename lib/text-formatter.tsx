import React, { JSX } from "react";

export const renderFormattedResponse = (text: string) => {
  // First, handle code blocks separately to preserve their formatting
  const codeBlocks: string[] = [];
  const withPlaceholders = text.replace(/```([\s\S]*?)```/g, (_, code) => {
    codeBlocks.push(code);
    return `%%CODE_BLOCK_${codeBlocks.length - 1}%%`;
  });

  const lines = withPlaceholders.split("\n");

  const parseInlineFormatting = (line: string) => {
    // Handle arrow-based format (->) with proper spacing and styling
    let formattedLine = line
      .replace(/(^|\s)->(\s|$)/g, ' <span class="text-primary">→</span> ') // Replace -> with arrow icon
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/~~(.*?)~~/g, "<del>$1</del>")
      .replace(/`([^`]+)`/g, '&ldquo;$1&rdquo;') // Replace backticks with curly quotes
      .replace(
        /\[(.*?)\]\((.*?)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>'
      );

    // Add margin after colons for better readability
    formattedLine = formattedLine.replace(/([:;])\s*/g, "$1 ");

    return formattedLine;
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
      .map((h) => h.trim().replace(/\*\*/g, '')); // Remove markdown bold from headers

    const dataRows = rows.map((row) =>
      row
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim())
    );

    return (
      <div className="w-full overflow-x-auto my-4">
        <table
          key={`table-${Math.random()}`}
          className="w-full border-collapse"
        >
          <thead>
            <tr>
              {headers.map((header, idx) => (
                <th
                  key={`th-${idx}`}
                  className="border border-gray-300 dark:border-gray-600 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-left text-gray-800 dark:text-gray-200 font-semibold"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((cells, rowIdx) => (
              <tr key={`tr-${rowIdx}`} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                {cells.map((cell, cellIdx) => (
                  <td
                    key={`td-${rowIdx}-${cellIdx}`}
                    className="border border-gray-200 dark:border-gray-600 px-3 py-2 text-gray-800 dark:text-gray-200"
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
      </div>
    );
  };

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

    // Handle arrow-based format as a special case
    if (line.trim().includes('->')) {
      rendered.push(
        <div 
          key={`arrow-${i}`} 
          className="my-2 pl-4 border-l-2 border-primary/20 break-words whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ 
            __html: parseInlineFormatting(line.replace(/^`*|`*$/g, '').trim())
          }} 
        />
      );
    } 
    // Handle code blocks
    else if (line.includes('%%CODE_BLOCK_')) {
      const match = line.match(/%%CODE_BLOCK_(\d+)%%/);
      if (match) {
        const codeIndex = parseInt(match[1], 10);
        const codeContent = codeBlocks[codeIndex];
        rendered.push(
          <pre key={`code-${i}`} className="bg-muted p-4 rounded-md my-2 overflow-auto">
            <code className="whitespace-pre-wrap break-words">{codeContent}</code>
          </pre>
        );
      }
    }
    // Default paragraph
    else {
      rendered.push(
        <p
          key={`p-${i}`}
          className="my-2 break-words whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ 
            __html: parseInlineFormatting(line.replace(/^`*|`*$/g, '').trim()) 
          }}
        />
      );
    }
  }

  flushList("end");

  return rendered;
};

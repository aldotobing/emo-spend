import React, { JSX } from "react";

export const renderFormattedResponse = (text: string) => {
  // Generate a unique session ID to ensure all keys are unique across renders
  const sessionId = Math.random().toString(36).substr(2, 9);
  
  // First, handle code blocks separately to preserve their formatting
  const codeBlocks: string[] = [];
  let withPlaceholders = text;
  
  // Handle triple backtick code blocks
  withPlaceholders = withPlaceholders.replace(/```([\s\S]*?)```/g, (_, code) => {
    codeBlocks.push(code);
    return `%%CODE_BLOCK_${codeBlocks.length - 1}%%`;
  });
  
  // Handle single backtick content (including multi-line) - just remove the backticks
  withPlaceholders = withPlaceholders.replace(/`([\s\S]*?)`/g, (match, code) => {
    // If it contains newlines, just return the content without backticks
    if (code.includes('\n')) {
      return code.trim();
    }
    // Otherwise, keep as inline code (will be handled later)
    return match;
  });

  const lines = withPlaceholders.split("\n");

  const parseInlineFormatting = (line: string) => {
    // Handle arrow-based format (->) with proper spacing and styling
    let formattedLine = line
      .replace(/(^|\s)->(\s|$)/g, ' <span class="text-primary">→</span> ') // Replace -> with arrow icon
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/~~(.*?)~~/g, "<del>$1</del>")
      .replace(/`([^`\n]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm break-words">$1</code>') // Handle inline code
      .replace(
        /\[(.*?)\]\((.*?)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>'
      );

    // Add margin after colons for better readability
    formattedLine = formattedLine.replace(/([:;])\s*/g, "$1 ");

    return formattedLine;
  };

  const isTableDivider = (line: string) => /^(\|\s*:?-+:?\s*)+\|$/.test(line);

  // Generate a unique ID without using hooks
  const generateTableId = () => {
    return `table-${sessionId}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const parseMarkdownTable = (
    headerLine: string,
    dividerLine: string,
    rows: string[],
    tableIndex: number
  ) => {
    const tableId = `${sessionId}-table-${tableIndex}`;
    
    const headers = headerLine
      .split("|")
      .slice(1, -1)
      .map((h, idx) => ({
        id: `${tableId}-header-${idx}`,
        content: h.trim().replace(/\*\*/g, '')
      }));

    const dataRows = rows.map((row, rowIndex) => ({
      id: `${tableId}-row-${rowIndex}`,
      cells: row
        .split("|")
        .slice(1, -1)
        .map((cell, cellIndex) => ({
          id: `${tableId}-cell-${rowIndex}-${cellIndex}`,
          content: cell.trim()
        }))
    }));
    
    return (
      <div key={tableId} className="w-full overflow-x-auto my-4">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {headers.map((header) => (
                <th
                  key={header.id}
                  className="border border-gray-300 dark:border-gray-600 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-left text-gray-800 dark:text-gray-200 font-semibold"
                >
                  {header.content}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row) => (
              <tr 
                key={row.id} 
                className="hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {row.cells.map((cell) => (
                  <td
                    key={cell.id}
                    className="border border-gray-200 dark:border-gray-600 px-3 py-2 text-gray-800 dark:text-gray-200"
                  >
                    <span
                      dangerouslySetInnerHTML={{
                        __html: parseInlineFormatting(cell.content),
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
  let tableCounter = 0;

  const flushList = (keyBase: string) => {
    if (listBuffer.length > 0) {
      const listId = `${sessionId}-${keyBase}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const listItems = listBuffer.map((item, i) => ({
        id: `${listId}-li-${i}`,
        content: item
      }));
      
      rendered.push(
        <ul key={listId} className="list-disc pl-5 space-y-1">
          {listItems.map(({ id, content }) => (
            <li
              key={id}
              className="my-1"
              dangerouslySetInnerHTML={{ __html: parseInlineFormatting(content) }}
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
      flushList(`table-flush-${i}`);
      const headerLine = line;
      const dividerLine = lines[i + 1];
      const tableRows: string[] = [];
      i += 2;
      while (i < lines.length && lines[i].startsWith("|")) {
        tableRows.push(lines[i]);
        i++;
      }
      i--; // karena for-loop bakal naik lagi
      rendered.push(parseMarkdownTable(headerLine, dividerLine, tableRows, tableCounter++));
      continue;
    }

    // Heading underline style (===, ---)
    const nextLine = lines[i + 1]?.trim();
    if (/^=+$/.test(nextLine)) {
      flushList(`h1-flush-${i}`);
      rendered.push(
        <h1
          key={`${sessionId}-h1-${i}`}
          dangerouslySetInnerHTML={{ __html: parseInlineFormatting(line) }}
        />
      );
      i++;
      continue;
    } else if (/^-+$/.test(nextLine)) {
      flushList(`h2-flush-${i}`);
      rendered.push(
        <h2
          key={`${sessionId}-h2-${i}`}
          dangerouslySetInnerHTML={{ __html: parseInlineFormatting(line) }}
        />
      );
      i++;
      continue;
    }

    // Markdown headings (# to ######)
    const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      flushList(`hx-flush-${i}`);
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      const Tag = `h${level}` as keyof JSX.IntrinsicElements;
      rendered.push(
        <Tag
          key={`${sessionId}-h${level}-${i}`}
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
          key={`${sessionId}-bq-${i}`}
          dangerouslySetInnerHTML={{
            __html: parseInlineFormatting(line.slice(2)),
          }}
        />
      );
      continue;
    }

    // Empty line as <br />
    if (line === "") {
      rendered.push(<br key={`${sessionId}-br-${i}`} />);
      continue;
    }

    // Handle arrow-based format as a special case
    if (line.trim().includes('->')) {
      rendered.push(
        <div 
          key={`${sessionId}-arrow-${i}`} 
          className="my-2 pl-4 border-l-2 border-primary/20 break-words word-wrap"
          dangerouslySetInnerHTML={{ 
            __html: parseInlineFormatting(line.trim())
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
          <pre key={`${sessionId}-code-${i}`} className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md my-2 overflow-x-auto border whitespace-pre-wrap">
            <code className="break-words text-sm">{codeContent}</code>
          </pre>
        );
      }
    }
    // Default paragraph
    else {
      rendered.push(
        <p
          key={`${sessionId}-p-${i}`}
          className="my-2 break-words break-all whitespace-normal"
          dangerouslySetInnerHTML={{ 
            __html: parseInlineFormatting(line.trim()) 
          }}
        />
      );
    }
  }

  flushList("end");

  return rendered;
};
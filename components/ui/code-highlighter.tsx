"use client";

import React, { useEffect, useRef, useMemo } from "react";

interface CodeHighlighterProps {
  code: string;
  highlightedSections?: string[];
  className?: string;
}

const SOLIDITY_KEYWORDS = [
  'pragma', 'solidity', 'contract', 'function', 'modifier', 'event', 'struct', 'enum',
  'mapping', 'address', 'uint256', 'uint8', 'bool', 'string', 'bytes32', 'memory',
  'public', 'private', 'internal', 'external', 'view', 'pure', 'payable', 'constant',
  'returns', 'return', 'if', 'else', 'for', 'while', 'require', 'import', 'constructor',
  'override', 'virtual', 'abstract', 'interface', 'library', 'using', 'is', 'super'
];

const SOLIDITY_TYPES = [
  'address', 'bool', 'string', 'bytes', 'uint', 'int', 'fixed', 'ufixed',
  'uint8', 'uint16', 'uint32', 'uint64', 'uint128', 'uint256',
  'int8', 'int16', 'int32', 'int64', 'int128', 'int256',
  'bytes1', 'bytes2', 'bytes4', 'bytes8', 'bytes16', 'bytes32'
];

const SOLIDITY_CONSTANTS = ['true', 'false', 'null', 'undefined', 'this', 'super'];

const HighlightedSpan: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className = "",
  children
}) => <span className={className}>{children}</span>;

export function CodeHighlighter({ code, highlightedSections = [], className = "" }: CodeHighlighterProps) {
  const codeRef = useRef<HTMLDivElement>(null);

  const processedTokens = useMemo(() => {
    const processSegment = (segment: string): React.ReactNode => {
      // Check if it's a comment
      if (segment.startsWith('//') || (segment.startsWith('/*') && segment.endsWith('*/'))) {
        return <HighlightedSpan className="text-green-500 italic">{segment}</HighlightedSpan>;
      }

      // Check if it's a string
      if ((segment.startsWith('"') && segment.endsWith('"')) ||
          (segment.startsWith("'") && segment.endsWith("'"))) {
        return <HighlightedSpan className="text-yellow-400">{segment}</HighlightedSpan>;
      }

      // Check if it's a number
      if (/^\d+(\.\d+)?$/.test(segment)) {
        return <HighlightedSpan className="text-purple-400">{segment}</HighlightedSpan>;
      }

      // Check if it's a keyword
      if (SOLIDITY_KEYWORDS.includes(segment)) {
        return <HighlightedSpan className="text-blue-400 font-semibold">{segment}</HighlightedSpan>;
      }

      // Check if it's a type
      if (SOLIDITY_TYPES.includes(segment)) {
        return <HighlightedSpan className="text-cyan-400 font-medium">{segment}</HighlightedSpan>;
      }

      // Check if it's a constant
      if (SOLIDITY_CONSTANTS.includes(segment)) {
        return <HighlightedSpan className="text-orange-400">{segment}</HighlightedSpan>;
      }

      // Check for highlighted sections
      const isHighlighted = highlightedSections.some(section =>
        segment.includes(section)
      );
      if (isHighlighted) {
        return <HighlightedSpan className="bg-yellow-200 dark:bg-yellow-900 px-1 rounded animate-pulse">{segment}</HighlightedSpan>;
      }

      return segment;
    };

    // Split by common delimiters and process
    const words = code.split(/(\s+|[{}();,\[\]()]|\/\/.*$|\/\*[\s\S]*?\*\/|"[^"\\]*"|'[^'\\']*'|\b\d+(\.\d+)?\b)/gm);

    return words.map((word, index) => {
      if (!word || word.trim() === '') return word;
      return <span key={index}>{processSegment(word)}</span>;
    });
  }, [code, highlightedSections]);

  // Auto-scroll to highlighted sections
  useEffect(() => {
    if (highlightedSections.length > 0 && codeRef.current) {
      const highlightedElement = codeRef.current.querySelector('.animate-pulse');
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }
    }
  }, [highlightedSections]);

  return (
    <div ref={codeRef} className={className}>
      <pre className="whitespace-pre-wrap font-mono leading-relaxed text-sm">
        {processedTokens}
      </pre>
    </div>
  );
}
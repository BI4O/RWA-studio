"use client";

import React, { useEffect, useRef, useState } from "react";

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

export function CodeHighlighter({ code, highlightedSections = [], className = "" }: CodeHighlighterProps) {
  const codeRef = useRef<HTMLDivElement>(null);
  const [processedCode, setProcessedCode] = useState("");

  const highlightSyntax = (sourceCode: string) => {
    let highlighted = sourceCode;

    // Highlight comments
    highlighted = highlighted.replace(
      /\/\/.*$/gm,
      '<span class="text-green-500 italic">$&</span>'
    );
    highlighted = highlighted.replace(
      /\/\*[\s\S]*?\*\//g,
      '<span class="text-green-500 italic">$&</span>'
    );

    // Highlight strings
    highlighted = highlighted.replace(
      /"([^"\\]|\\.)*"/g,
      '<span class="text-yellow-400">$&</span>'
    );
    highlighted = highlighted.replace(
      /'([^'\\]|\\.)*'/g,
      '<span class="text-yellow-400">$&</span>'
    );

    // Highlight numbers
    highlighted = highlighted.replace(
      /\b\d+(\.\d+)?\b/g,
      '<span class="text-purple-400">$&</span>'
    );

    // Highlight keywords
    SOLIDITY_KEYWORDS.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      highlighted = highlighted.replace(regex, `<span class="text-blue-400 font-semibold">${keyword}</span>`);
    });

    // Highlight types
    SOLIDITY_TYPES.forEach(type => {
      const regex = new RegExp(`\\b${type}\\b`, 'g');
      highlighted = highlighted.replace(regex, `<span class="text-cyan-400 font-medium">${type}</span>`);
    });

    // Highlight constants
    SOLIDITY_CONSTANTS.forEach(constant => {
      const regex = new RegExp(`\\b${constant}\\b`, 'g');
      highlighted = highlighted.replace(regex, `<span class="text-orange-400">${constant}</span>`);
    });

    // Highlight function names
    highlighted = highlighted.replace(
      /function\s+(\w+)/g,
      'function <span class="text-indigo-400 font-medium">$1</span>'
    );

    // Highlight contract names
    highlighted = highlighted.replace(
      /contract\s+(\w+)/g,
      'contract <span class="text-pink-400 font-bold">$1</span>'
    );

    // Highlight special sections that are currently being modified
    highlightedSections.forEach(section => {
      if (highlighted.includes(section)) {
        const regex = new RegExp(section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        highlighted = highlighted.replace(
          regex,
          `<span class="bg-yellow-200 dark:bg-yellow-900 px-1 rounded animate-pulse">${section}</span>`
        );
      }
    });

    return highlighted;
  };

  useEffect(() => {
    const highlighted = highlightSyntax(code);
    setProcessedCode(highlighted);
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
      <pre 
        className="whitespace-pre-wrap font-mono leading-relaxed text-sm"
        dangerouslySetInnerHTML={{ __html: processedCode }}
      />
    </div>
  );
}
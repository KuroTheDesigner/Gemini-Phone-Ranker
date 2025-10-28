import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

const parseBoldText = (text: string): (string | React.ReactElement)[] => {
  if (!text) return [text];
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const blocks = content.split('\n').filter(block => block.trim() !== '');

  const elements: { type: 'p' | 'ul'; content?: string; items?: string[] }[] = [];
  let currentList: string[] = [];

  for (const block of blocks) {
    if (block.trim().startsWith('* ')) {
      currentList.push(block.trim().substring(2));
    } else {
      if (currentList.length > 0) {
        elements.push({ type: 'ul', items: currentList });
        currentList = [];
      }
      elements.push({ type: 'p', content: block });
    }
  }
  if (currentList.length > 0) {
    elements.push({ type: 'ul', items: currentList });
  }

  return (
    <div>
      {elements.map((el, i) => {
        if (el.type === 'ul') {
          return (
            <ul key={i} className="list-disc list-inside space-y-1 mt-1 mb-3 pl-2">
              {el.items?.map((item, j) => (
                <li key={j}>{parseBoldText(item)}</li>
              ))}
            </ul>
          );
        } else { // 'p'
          return (
            <p key={i} className="mt-2 first:mt-0">
              {parseBoldText(el.content || '')}
            </p>
          );
        }
      })}
    </div>
  );
};
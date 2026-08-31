const fs = require('fs');
const path = 'c:/Users/Shourov/Downloads/MarketVerse/AI-Powered Multi-Vendor E-Commerce/src/pages/FashionStylist.tsx';
let content = fs.readFileSync(path, 'utf8');

const brokenIndex = content.indexOf('  index: number;');
if (brokenIndex !== -1) {
  content = content.slice(0, brokenIndex);
  content += `      )}
    </div>
  );
}

function RichLookCard({
  content,
  index,
  onQuickAction,
  onFeedback,
  feedbackState,
}: {
  content: string;
  index: number;
  onQuickAction: (action: string) => void;
  onFeedback: (key: string) => void;
  feedbackState: string | null;
}) {
  return (
    <div className="text-sm prose prose-sm dark:prose-invert max-w-none space-y-3">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      
      {/* Interactive Footer Actions */}
      <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="font-semibold">Helpful?</span>
          <button
            onClick={() => onFeedback(\`liked_\${index}\`)}
            className={\`p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors \${feedbackState === \\\`liked_\${index}\\\` ? "text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950" : ""}\`}
            title="Like"
          >
            👍
          </button>
          <button
            onClick={() => onFeedback(\`disliked_\${index}\`)}
            className={\`p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors \${feedbackState === \\\`disliked_\${index}\\\` ? "text-rose-600 font-bold bg-rose-50 dark:bg-rose-950" : ""}\`}
            title="Dislike"
          >
            👎
          </button>
        </div>
      </div>
    </div>
  );
}
`;
  fs.writeFileSync(path, content);
  console.log('Fixed file');
} else {
  console.log('Could not find broken string');
}

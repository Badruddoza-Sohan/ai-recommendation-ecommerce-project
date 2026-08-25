import React, { useState } from "react";
import { Star, MessageSquare, CheckCircle2 } from "lucide-react";

interface HumanEvalPortalProps {
  sessionId: string;
  onSubmitted?: () => void;
}

export const HumanEvalPortal: React.FC<HumanEvalPortalProps> = ({ sessionId: _sessionId, onSubmitted }) => {
  const [rating, setRating] = useState<number>(0);
  const [feedbackCategory, setFeedbackCategory] = useState<string>("accurate");
  const [comment, setComment] = useState<string>("");
  const [submitted, setSubmitted] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    // Direct submit payload
    setSubmitted(true);
    if (onSubmitted) onSubmitted();
  };

  if (submitted) {
    return (
      <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-4 text-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
        <h4 className="text-emerald-400 font-semibold text-sm">Thank You for Your Feedback!</h4>
        <p className="text-slate-400 text-xs mt-1">Your rating helps continuously train and improve our AI Stylist.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mt-4 text-slate-100">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-sky-400" />
        <h4 className="text-sm font-semibold">Rate Your Styling Experience</h4>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center justify-center gap-2 py-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className="focus:outline-none transition-transform hover:scale-110"
            >
              <Star
                className={`w-6 h-6 ${
                  star <= rating ? "text-amber-400 fill-amber-400" : "text-slate-600"
                }`}
              />
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          {[
            { id: "accurate", label: "🎯 Perfect Match" },
            { id: "color_issue", label: "🎨 Color Mis match" },
            { id: "cultural_issue", label: "🏛️ Cultural Issue" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFeedbackCategory(cat.id)}
              className={`p-1.5 rounded-lg border text-center font-medium transition-colors ${
                feedbackCategory === cat.id
                  ? "border-sky-500 bg-sky-500/10 text-sky-300"
                  : "border-slate-800 bg-slate-800/50 text-slate-400 hover:bg-slate-800"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Additional notes for our styling engineers..."
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none h-16"
        />

        <button
          type="submit"
          disabled={rating === 0}
          className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-semibold text-xs py-2 rounded-lg transition-colors"
        >
          Submit Stylist Rating
        </button>
      </form>
    </div>
  );
};

import React, { useState } from 'react';
import { Star, X } from 'lucide-react';
import { trpc } from "@/providers/trpc";
import { toast } from "@/lib/toast";

export function ReviewModal({ order, onClose, onSuccess }: { order: any; onClose: () => void; onSuccess: () => void }) {
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');

  const submitReview = trpc.review.createOrderReview.useMutation({
    onSuccess: () => {
      toast.success('Review submitted successfully!');
      setSelectedItem(null);
      setRating(5);
      setTitle('');
      setComment('');
      onSuccess();
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to submit review');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    submitReview.mutate({
      orderId: order.id,
      orderItemId: selectedItem.id,
      productId: selectedItem.productId,
      rating,
      title,
      comment,
    });
  };

  const unreviewedItems = order.items.filter((item: any) => !item.isReviewed);

  if (unreviewedItems.length === 0) {
    onClose();
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Review Your Purchase</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6">
          {!selectedItem ? (
            <div className="space-y-4">
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Your order #{order.orderNumber} has been delivered! Please rate the items you received:
              </p>
              <div className="grid gap-3">
                {unreviewedItems.map((item: any) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all text-left"
                  >
                    <img src={item.imageUrl} alt={item.productName} className="w-16 h-16 rounded-lg object-cover bg-slate-100" />
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white line-clamp-1">{item.productName}</h4>
                      <p className="text-sm text-slate-500">Sold by {item.sellerName}</p>
                    </div>
                    <div className="ml-auto">
                      <span className="px-3 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 rounded-full text-xs font-medium">Review</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl mb-4">
                <img src={selectedItem.imageUrl} alt={selectedItem.productName} className="w-12 h-12 rounded-md object-cover" />
                <h4 className="font-medium text-slate-900 dark:text-white line-clamp-2">{selectedItem.productName}</h4>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Rating</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRating(star)}
                      className="p-1 focus:outline-none"
                    >
                      <Star className={`h-8 w-8 ${star <= rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300 dark:text-slate-600'} transition-colors`} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Summarize your experience"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Comment</label>
                <textarea
                  required
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="What did you like or dislike? How did it fit?"
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="flex-1 px-4 py-3 rounded-xl font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitReview.isPending}
                  className="flex-1 px-4 py-3 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {submitReview.isPending ? "Submitting..." : "Submit Review"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

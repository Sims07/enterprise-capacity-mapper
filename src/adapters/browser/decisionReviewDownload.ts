/** Browser-only adapter. The review is generated locally and never sent to a server. */
export function downloadDecisionReview(markdown: string): void {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = 'capability-decision-review.md';
    link.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

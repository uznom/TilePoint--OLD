## 2025-03-05 - Memoizing expensive nested loops in React
**Learning:** In `Dashboard.tsx`, there was an O(N*M*...) nested loop calculating `slowMovingCandidates` during every render phase (triggering on tooltip hovers). The lack of memoization caused massive, unnecessary re-evaluations for a dashboard that has heavy interactivity.
**Action:** Always verify if expensive iterative data transformation operations inside React component bodies are properly wrapped in `useMemo`, especially when involving multiple dependent data collections and iterating extensively across them.
## 2024-05-18 - Fusing Multiple Array Iterations
**Learning:** Found multiple chained `.filter()` and `.reduce()` passes on large arrays (e.g. `filteredSales`) within `useMemo` hooks and event handlers inside `PosModule.tsx`. Iterating over a potentially large dataset multiple times negatively impacts frontend performance.
**Action:** Combined these array passes into a single O(N) `.reduce()` operation that computes multiple aggregate statistics simultaneously. This is a common pattern to apply whenever a large dataset needs to be reduced to multiple different totals.

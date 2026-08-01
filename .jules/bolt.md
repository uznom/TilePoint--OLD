## 2025-03-05 - Memoizing expensive nested loops in React
**Learning:** In `Dashboard.tsx`, there was an O(N*M*...) nested loop calculating `slowMovingCandidates` during every render phase (triggering on tooltip hovers). The lack of memoization caused massive, unnecessary re-evaluations for a dashboard that has heavy interactivity.
**Action:** Always verify if expensive iterative data transformation operations inside React component bodies are properly wrapped in `useMemo`, especially when involving multiple dependent data collections and iterating extensively across them.
## 2025-03-05 - Array Reduce Iteration Optimization
**Learning:** Found multiple places in `PosModule.tsx` where arrays were filtered and reduced multiple times to calculate aggregate statistics (e.g., `totalSubtotal`, `totalDiscount`, `totalVat`, `totalGrand`). Using a single `reduce` pass is significantly faster.
**Action:** Always combine multiple `filter` and `reduce` operations into a single pass when calculating multiple statistics from the same array.

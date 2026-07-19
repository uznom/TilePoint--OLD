## 2025-03-05 - Memoizing expensive nested loops in React
**Learning:** In `Dashboard.tsx`, there was an O(N*M*...) nested loop calculating `slowMovingCandidates` during every render phase (triggering on tooltip hovers). The lack of memoization caused massive, unnecessary re-evaluations for a dashboard that has heavy interactivity.
**Action:** Always verify if expensive iterative data transformation operations inside React component bodies are properly wrapped in `useMemo`, especially when involving multiple dependent data collections and iterating extensively across them.

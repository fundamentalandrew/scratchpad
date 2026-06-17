# Interview Transcript: Analysis Agent (Agent B)

## Q1: Tree-sitter Grammar Loading

**Question:** How should Tree-sitter grammar loading work? Should we bundle the WASM grammars, use native bindings, or support both? And should unsupported languages fall through to LLM-only scoring or be flagged?

**Answer:** Native bindings only. Use tree-sitter npm native bindings (faster, simpler, requires node-gyp build).

## Q2: Unsupported Language Handling

**Question:** For files in unsupported languages (not TS/JS), what should happen? They can't get AST analysis.

**Answer:** Send directly to LLM scoring. Skip AST layer, let Claude score them based on diff alone.

## Q3: Chunking Strategy

**Question:** When the total diff exceeds the context window, how should chunking priority work?

**Answer:** Score all files equally. Split into batches, each gets same prompt and budget.

## Q4: AST Classification Depth

**Question:** For AST change classification, how sophisticated should the initial implementation be?

**Answer:** Medium: format-only + rename-only + subtree hashing for moved function detection. Everything else goes to LLM.

## Q5: Input Mode Support

**Question:** How should the analysis agent handle the ContextOutput input? Should it support both PR mode and repo mode?

**Answer:** PR mode only. Analysis agent only handles PR diffs — repo mode isn't relevant for file scoring.

## Q6: Domain Rules in Scoring Prompt

**Question:** For the LLM scoring prompt, should domain rules from ContextOutput always be included, or should there be a fallback?

**Answer:** Include when available, generic prompt otherwise. Use domain rules if present, fall back to generic scoring rubric.

## Q7: Low-Risk File Handling

**Question:** Should AST-classified "low risk" files be completely excluded from LLM scoring, or sent with reduced budget?

**Answer:** Include with summary only. Send a one-line summary to LLM ("this file was a rename") for validation, not the full diff.

## Q8: Large/Binary File Handling

**Question:** How should we handle binary files or very large files in the PR?

**Answer:** Large files get their own sub-agent — spin up a separate API call to handle any large file. Use large context windows rather than truncating.

## Q9: Large File API Call Strategy

**Question:** Should the analysis agent use separate Claude API calls for large files while batching smaller files together?

**Answer:** Yes, separate API calls per large file. Files over a threshold get their own Claude API call with full context window.

## Q10: Token Counting Approach

**Question:** What token counting approach should we use for chunking decisions?

**Answer:** Simple character heuristic (~4 chars per token estimate). Fast and good enough for batching decisions.

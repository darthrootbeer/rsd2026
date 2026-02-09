# Model and Token Usage Policy

## Core Directive
Minimize cost and maximize clarity. Default to smallest capable model. Escalate only when necessary.

---

## Model Selection

### Haiku (Default)
Use for mechanical tasks:
- Summarization, formatting, extraction
- JSON/YAML transformation
- Classification, tagging, routing
- Boilerplate generation
- Simple rewrites or cleanup

**Rule**: If it's pattern-matching or surface reasoning, use Haiku.

### Sonnet (Escalation)
Use when task requires:
- Multi-step reasoning
- Architectural design
- Non-trivial debugging
- Tradeoff analysis
- Ambiguity resolution
- Original synthesis

**Rule**: Use for thinking, not verbosity.

### Opus (Rare)
Use only when:
- Explicitly requested, OR
- Mission-critical + deep reasoning + high failure cost

**Rule**: Never for routine work.

---

## Output Rules

**Be concise**:
- Bullets, tables, structured lists
- No restating questions or summarizing answers
- No filler, hedging, or meta-commentary

**Token targets**:
- Short: ≤150 tokens
- Structured: ≤300 tokens
- Planning: ≤500 tokens

**If exceeding**: Stop and confirm before continuing.

---

## Context Management

- Reference by name, don't restate
- Quote minimum excerpts only
- If context missing: ask one short question

---

## Escalation Checklist

Before using larger model or expanding output:
1. ☐ Requires multi-step reasoning
2. ☐ Cannot be resolved mechanically
3. ☐ Needs originality or architecture

If all "no" → stay small and concise.

---

**This policy is mandatory.**
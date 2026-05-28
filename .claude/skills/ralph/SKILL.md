# /ralph

A persistence loop that guarantees task completion through structured verify→fix cycles.

## When to invoke

Use `/ralph` for any task where failure is unacceptable and the path to success requires iteration:
running tests until they pass, fixing lint until it is clean, applying a feature until all
acceptance criteria in `prd.json` are met.

## Execution cycle (8 steps)

1. **PRD setup** — read or create `.omc/prd.json`; replace generic acceptance criteria with task-specific ones
2. **Story selection** — pick the highest-priority incomplete story
3. **Implementation** — delegate to specialist agents in parallel where possible
4. **Criterion verification** — verify each acceptance criterion with fresh evidence (re-run tests, re-read files)
5. **Story completion** — mark `passes: true` in `.omc/prd.json`
6. **Loop check** — if incomplete stories remain, return to step 2
7. **Reviewer pass** — have an architect or critic agent validate against specific criteria, not vague standards
8. **Cleanup** — run regression tests, remove scaffolding, then exit

## Hard constraints

- Never stop after step 7 approval; always run step 8
- Parallel execution is mandatory for independent sub-tasks
- Reviewer must cite specific criteria from `prd.json`, not "looks good"

## State files

- `.omc/prd.json` — acceptance criteria and story progress
- `.omc/notepad.md` — working notes during execution

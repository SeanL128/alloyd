## alloyd (ambient rule)

Do lightweight coordination and planning inline. Dispatch every SUBSTANTIAL
work unit (multi-file edits, whole features, long reviews) by running
`alloyd dispatch <role> --brief <path.json>` in the shell, where the brief
file is self-contained (goal, files, constraints, acceptance criteria).
Never call `claude -p` or `codex exec` directly — the router picks
vendor/model/effort from live usage.

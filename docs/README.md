# docs

## The build brief is not in this repository

`WATERLOO_V1_BRIEF.md` is Waterloo's internal build specification. It is **not
committed here**, because this repository is public.

The repository is public for one reason: on GitHub's free plan, branch
protection is only enforced on public repositories, and branch protection is
what stops either owner merging a change without the other's approval. That
rule is requirement **G10**, so the choice was between a public repository and
a governance guarantee that only existed on paper. The code holds no secrets,
so publishing it costs nothing — but the brief is a different matter. It maps
which owner holds which account and carries personal details about the owners,
which is exactly the information an attacker would want and none of which the
public needs.

So the brief lives in two places, neither of them here:

- `docs/WATERLOO_V1_BRIEF.private.md` on each owner's own machine. The
  `.gitignore` blocks every `*.private.md` file, so it cannot be committed by
  accident.
- The shared Bitwarden vault, which is the copy of record.

Anything from the brief that the code needs in order to be understood — the
design tokens, the permission tiers, the G-requirements — is restated in
`CLAUDE.md`, which is public.

## If you have just cloned this and have no brief

You are not one of the two owners, and that is fine: nothing here needs the
brief to build or run. See `CLAUDE.md` for what Waterloo is and the rules it
is built under.

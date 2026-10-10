<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Channel catalog is a compacted static file (public/data/catalog.json) cached in IndexedDB, with satellite membership stored as a bitmask: keeps 8,800+ channels fast to filter on TV hardware.
- Satellite/region auto-select rules live in src/lib/region.ts with tests in region.test.ts: single source for first-launch behavior.

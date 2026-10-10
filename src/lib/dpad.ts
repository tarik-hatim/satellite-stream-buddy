/** Spatial D-pad navigation over elements marked [data-nav]. */
const DIRS: Record<string, [number, number]> = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
};

export function moveFocus(key: string, root: ParentNode = document): boolean {
  const dir = DIRS[key];
  if (!dir) return false;
  const active = document.activeElement as HTMLElement | null;
  if (active?.tagName === "INPUT" && (key === "ArrowLeft" || key === "ArrowRight")) return false;
  const scope = (document.querySelector("[data-nav-scope]") as ParentNode | null) ?? root;
  const items = [...scope.querySelectorAll<HTMLElement>("[data-nav]")].filter((e) => e.offsetParent !== null);
  if (!active || !items.includes(active)) { items[0]?.focus(); return true; }
  const a = active.getBoundingClientRect();
  const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let best: HTMLElement | null = null, bestScore = Infinity;
  for (const el of items) {
    if (el === active) continue;
    const r = el.getBoundingClientRect();
    const dx = r.left + r.width / 2 - ax, dy = r.top + r.height / 2 - ay;
    const along = dx * dir[0] + dy * dir[1];
    if (along <= 1) continue;
    const across = Math.abs(dx * dir[1]) + Math.abs(dy * dir[0]);
    const score = along + across * 2.5;
    if (score < bestScore) { bestScore = score; best = el; }
  }
  if (best) { best.focus(); best.scrollIntoView({ block: "nearest", inline: "nearest" }); return true; }
  return false;
}

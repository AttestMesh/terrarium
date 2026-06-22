<script lang="ts">
  import { onMount } from "svelte";

  // Progressive enhancement over a server-rendered card grid: the cards are static
  // HTML (crawlable, indexable), and this island only shows/hides them by their data
  // attributes. State goes to the URL *fragment* — it generates no crawlable result
  // URLs, so the catalog can't spawn thin/zero-result indexable pages.
  let { facets }: { facets: { categories: string[]; tiers: string[]; proofs: string[]; freshness: string[] } } = $props();

  let category = $state("");
  let tier = $state("");
  let proof = $state("");
  let fresh = $state("");

  function apply() {
    if (typeof document === "undefined") return;
    let shown = 0;
    for (const el of document.querySelectorAll<HTMLElement>("[data-card]")) {
      const ok =
        (!category || el.dataset.category === category) &&
        (!tier || el.dataset.tier === tier) &&
        (!proof || el.dataset.proof === proof) &&
        (!fresh || el.dataset.fresh === fresh);
      el.style.display = ok ? "" : "none";
      if (ok) shown++;
    }
    const count = document.getElementById("filter-count");
    if (count) count.textContent = String(shown);

    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (tier) params.set("tier", tier);
    if (proof) params.set("proof", proof);
    if (fresh) params.set("fresh", fresh);
    const q = params.toString();
    history.replaceState(null, "", q ? `#${q}` : location.pathname + location.search);
  }

  function reset() {
    category = tier = proof = fresh = "";
    apply();
  }

  onMount(() => {
    const p = new URLSearchParams(location.hash.slice(1));
    category = p.get("category") ?? "";
    tier = p.get("tier") ?? "";
    proof = p.get("proof") ?? "";
    fresh = p.get("fresh") ?? "";
    apply();
  });
</script>

<div class="flex flex-wrap items-end gap-3 rounded-lg border border-rule bg-card p-4 font-mono text-xs">
  <label class="flex flex-col gap-1">
    <span class="text-ink-muted">category</span>
    <select bind:value={category} onchange={apply} class="rounded border border-rule bg-page px-2 py-1">
      <option value="">all</option>
      {#each facets.categories as c}<option value={c}>{c}</option>{/each}
    </select>
  </label>
  <label class="flex flex-col gap-1">
    <span class="text-ink-muted">tier</span>
    <select bind:value={tier} onchange={apply} class="rounded border border-rule bg-page px-2 py-1">
      <option value="">all</option>
      {#each facets.tiers as t}<option value={t}>{t}</option>{/each}
    </select>
  </label>
  <label class="flex flex-col gap-1">
    <span class="text-ink-muted">proof</span>
    <select bind:value={proof} onchange={apply} class="rounded border border-rule bg-page px-2 py-1">
      <option value="">all</option>
      {#each facets.proofs as p}<option value={p}>{p}</option>{/each}
    </select>
  </label>
  <label class="flex flex-col gap-1">
    <span class="text-ink-muted">freshness</span>
    <select bind:value={fresh} onchange={apply} class="rounded border border-rule bg-page px-2 py-1">
      <option value="">all</option>
      {#each facets.freshness as f}<option value={f}>{f}</option>{/each}
    </select>
  </label>
  <button onclick={reset} class="rounded border border-rule px-2 py-1 text-moss-deep hover:border-moss">reset</button>
</div>

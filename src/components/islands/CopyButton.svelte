<script lang="ts">
  let { text, label = "Copy" }: { text: string; label?: string } = $props();
  let copied = $state(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
      setTimeout(() => (copied = false), 1200);
    } catch {
      /* clipboard unavailable — no-op */
    }
  }
</script>

<button
  onclick={copy}
  class="rounded border border-rule bg-card px-2 py-0.5 font-mono text-xs text-moss-deep hover:border-moss"
>
  {copied ? "Copied ✓" : label}
</button>

<script lang="ts">
  // Placeholder rendered for sections whose insides aren't built yet (Scratch,
  // To-do). Replaced by the real section component in later slices.
  let { label = 'This section' }: { label?: string } = $props();
</script>

<div class="soon">
  <p class="title">{label}</p>
  <p class="sub">Coming soon.</p>
</div>

<style>
  .soon {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    color: var(--text-secondary);
    text-align: center;
    padding: 0 24px;
  }
  .title {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: var(--text);
  }
  .sub {
    margin: 0;
    font-size: 15px;
  }
</style>

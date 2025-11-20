<script lang="ts">
export const name = 'World';
</script>

<div class="example-view">
  <h1>Hello {name}!</h1>
  <p>This is a Svelte component inside Obsidian.</p>
</div>

<style>
  .example-view {
    padding: 20px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 4px;
  }
  h1 {
    color: var(--text-accent);
  }
</style>

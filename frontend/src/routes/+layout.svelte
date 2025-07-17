<script lang="ts">
  // This file's only purpose is to import the global CSS file
  // that Tailwind and shadcn-svelte use.
  import "../app.css";
</script>

<!-- The <slot /> component renders the content of the current page -->
<!-- (in this case, +page.svelte) -->
<slot />
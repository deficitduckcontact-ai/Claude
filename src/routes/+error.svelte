<script lang="ts">
  import { page } from '$app/state';
</script>
<div class="shell narrow pad-m" style="text-align:center;padding-top:60px">
  <h1>{page.status === 404 ? 'No comic here.' : 'Something broke.'}</h1>
  <p class="muted">{page.error?.message}</p>
  <a class="btn primary" href="/">Back to the feed</a>
</div>

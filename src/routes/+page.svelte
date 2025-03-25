<script>
    export let data
</script>

<h1 class="text-2xl text-red-700">Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>

<pre class="bg-emerald-300 p-8 rounded-lg shadow-xl">
    {JSON.stringify(data, null, 2)}
</pre>
<script>
  import TodoFetch from "./TodoFetch.svelte";
</script>

<body>
  <main>
    <h1>Aplikasi Svelte Saya</h1>
    <TodoFetch />
  </main>
</body>

<style>
	body {
		background: #1c1e22;
	}

  main {
    text-align: center;
    padding: 1em;
    max-width: 240px;
    margin: 0 auto;
    background: #1c1e22;
  }

  h1 {
    color: #c4c1bb;
    text-transform: uppercase;
    font-size: 4em;
    font-weight: 100;
  }

  @media (min-width: 640px) {
    main {
      max-width: none;
      background: #1c1e22;
    }
  }
</style>

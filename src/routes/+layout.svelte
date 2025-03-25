<script>
  import TodoFetch from "./TodoFetch.svelte";
</script>

<main>
  <nav>
    <a href="/">Home</a>
    <a href="/about">About</a>
    <a href="/contact">Contact</a>
    <a href="/about/team">Team</a>
    <a href="/about/secret">Secret</a>
  </nav>
  <TodoFetch />
  <slot />
</main>

<style>
  main {
    margin: 0 auto;
    padding: 20px;
    font-family: Arial;
    background: #1c1e22;
    color: #c4c1bb;
    border-radius: 8px;
  }
  
  nav {
    display: flex;
    justify-content: center;
    margin-bottom: 20px;
  }

  a {
    padding: 10px;
    color: #c4c1bb;
    font-weight: bold;
  }

  a:hover {
    color: #fff;
  }
</style>

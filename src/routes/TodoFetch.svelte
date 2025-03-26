<script>
  import { onMount } from 'svelte';
  import '$lib/styles/global.css';
  
  // Deklarasi variabel untuk menyimpan data
  let todo = null;
  let post = null;
  let comment = null;
  let user = null;
  let loading = true;
  let error = null;
  
  // Status untuk mengetahui data apa yang sedang ditampilkan
  let currentView = 'todo';
  
  // Variabel untuk menyimpan ID user yang sedang aktif
  let currentUserId = 1;
  // Variabel untuk batas maksimum user
  const maxUserId = 10;

  // Function untuk mengambil data todo
  async function fetchTodo() {
    try {
      loading = true;
      currentView = 'todo';
      error = null;
      
      const response = await fetch('https://jsonplaceholder.typicode.com/todos/1');
      
      // Periksa jika response OK
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      // Parse JSON dari response
      todo = await response.json();
      console.log('Todo data:', todo);
    } catch (e) {
      error = e.message;
      console.error('Fetch error:', e);
    } finally {
      loading = false;
    }
  }
  
  // Function untuk mengambil data post
  async function fetchPost() {
    try {
      loading = true;
      currentView = 'post';
      error = null;
      
      const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
      
      // Periksa jika response OK
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      // Parse JSON dari response
      post = await response.json();
      console.log('Post data:', post);
    } catch (e) {
      error = e.message;
      console.error('Fetch error:', e);
    } finally {
      loading = false;
    }
  }


  // Function untuk mengambil data comment
  async function fetchComments() {
    try {
      loading = true;
      currentView = 'comment';
      error = null;
      
      const response = await fetch('https://jsonplaceholder.typicode.com/comments/1');
      
      // Periksa jika response OK
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      // Parse JSON dari response
      comment = await response.json();
      console.log('Comment data:', comment);
    } catch (e) {
      error = e.message;
      console.error('Fetch error:', e);
    } finally {
      loading = false;
    }
  }
  
  // Function untuk mengambil data user dengan ID tertentu
  async function fetchUsers(id = 1) {
    try {
      loading = true;
      currentView = 'user';
      error = null;
      currentUserId = id; // Update ID user yang sedang aktif
      
      const response = await fetch(`https://jsonplaceholder.typicode.com/users/${id}`);
      
      // Periksa jika response OK
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      // Parse JSON dari response
      user = await response.json();
      console.log(`User ${id} data:`, user);
    } catch (e) {
      error = e.message;
      console.error('Fetch error:', e);
    } finally {
      loading = false;
    }
  }
  
  // Function untuk mengambil user selanjutnya
  function nextUser() {
    // Increment ID user dan pastikan tidak lebih dari maxUserId
    const nextId = currentUserId >= maxUserId ? 1 : currentUserId + 1;
    fetchUsers(nextId);
  }
  
  // Function untuk mengambil user sebelumnya
  function prevUser() {
    // Decrement ID user dan pastikan tidak kurang dari 1
    const prevId = currentUserId <= 1 ? maxUserId : currentUserId - 1;
    fetchUsers(prevId);
  }
  
  // Function untuk mencari user dengan ID tertentu
  function goToUser(id) {
    // Pastikan ID berada dalam rentang yang valid
    const validId = Math.max(1, Math.min(maxUserId, id));
    fetchUsers(validId);
  }

  // Eksekusi fetch todo begitu komponen dimount
  onMount(() => {
    fetchTodo();
  });
</script>

<main>
<h1>Contoh Fetch API dengan Svelte</h1>

<!-- trigger button -->
<div class="button-group">
  <button on:click={() => fetchTodo(1)} class={currentView === 'todo' ? 'active' : ''}>
    Fetch Todo Data
  </button>
  <button on:click={() => fetchPost(1)} class={currentView === 'post' ? 'active' : ''}>
    Fetch Post Data
  </button>
  <button on:click={() => fetchComments(1)} class={currentView === 'comment' ? 'active' : ''}>
    Fetch Comment Data
  </button>
  <button on:click={() => fetchUsers(1)} class={currentView === 'user' ? 'active' : ''}>
    Fetch User Data
  </button>
</div>

<!-- Tombol navigasi khusus untuk user data -->
{#if currentView === 'user'}
  <div class="user-navigation">
    <button on:click={prevUser} class="nav-button">← Previous User</button>
    <span class="user-counter">User {currentUserId} of {maxUserId}</span>
    <button on:click={nextUser} class="nav-button">Next User →</button>
  </div>
{/if}
{#if currentView === 'comment'}
<div class="user-navigation">
  <button on:click={prevUser} class="nav-button">← Previous User</button>
  <span class="user-counter">User {currentUserId} of {maxUserId}</span>
  <button on:click={nextUser} class="nav-button">Next User →</button>
</div>
{/if}

{#if currentView === 'todo'}
<div class="user-navigation">
  <button on:click={prevUser} class="nav-button">← Previous User</button>
  <span class="user-counter">User {currentUserId} of {maxUserId}</span>
  <button on:click={nextUser} class="nav-button">Next User →</button>
</div>
{/if}

{#if currentView === 'post'}
<div class="user-navigation">
  <button on:click={prevUser} class="nav-button">← Previous User</button>
  <span class="user-counter">User {currentUserId} of {maxUserId}</span>
  <button on:click={nextUser} class="nav-button">Next User →</button>
</div>
{/if}

  <!-- Direct access to specific user -->
  <div class="user-direct-access">
    <p>Go to User: </p>
    <div class="user-buttons">
      {#each Array(maxUserId) as _, i}
        <button 
          on:click={() => goToUser(i + 1)}
          class={currentUserId === i + 1 ? 'active' : ''}
        >
          {i + 1}
        </button>
      {/each}
    </div>
  </div>

{#if loading}
  <div class="loading-container">
    <p>Loading data...</p>
    <div class="spinner"></div>
  </div>
{:else if error}
  <div class="error-container">
    <p class="error">Error: {error}</p>
  </div>
{:else if currentView === 'todo' && todo}
  <div class="data-card">
    <h2>Todo #{todo.id}</h2>
    <p><strong>Title:</strong> {todo.title}</p>
    <p><strong>Completed:</strong> {todo.completed ? 'Yes' : 'No'}</p>
    <p><strong>User ID:</strong> {todo.userId}</p>
  </div>
{:else if currentView === 'post' && post}
  <div class="data-card">
    <h2>Post #{post.id}</h2>
    <p><strong>Title:</strong> {post.title}</p>
    <p><strong>Body:</strong> {post.body}</p>
    <p><strong>User ID:</strong> {post.userId}</p>
  </div>
{:else if currentView === 'comment' && comment}
  <div class="data-card">
    <h2>Comment #{comment.id}</h2>
    <p><strong>Name:</strong> {comment.name}</p>
    <p><strong>Email:</strong> {comment.email}</p>
    <p><strong>Body:</strong> {comment.body}</p>
  </div>
{:else if currentView === 'user' && user}
  <div class="data-card">
    <h2>User #{user.id}</h2>
    <p><strong>Name:</strong> {user.name}</p>
    <p><strong>Username:</strong> {user.username}</p>
    <p><strong>Email:</strong> {user.email}</p>
    <div class="address-info">
      <h3>Address:</h3>
      <ul>
        <li><strong>Street:</strong> {user.address.street}</li>
        <li><strong>Suite:</strong> {user.address.suite}</li>
        <li><strong>City:</strong> {user.address.city}</li>
        <li><strong>Zipcode:</strong> {user.address.zipcode}</li>
      </ul>
    </div>
    <p><strong>Phone Number:</strong> {user.phone}</p>
    <p><strong>Website:</strong> {user.website}</p>
    <div class="company-info">
      <h3>Company:</h3>
      <p><strong>Name:</strong> {user.company.name}</p>
      <p><strong>Catchphrase:</strong> {user.company.catchPhrase}</p>
    </div>
  </div>
{:else}
  <p>No data available</p>
{/if}

<div class="endpoint-info">
  <p>Current endpoint: 
    {#if currentView === 'todo'}
      <code>jsonplaceholder.typicode.com/todos/1</code>
    {:else if currentView === 'post'}
      <code>jsonplaceholder.typicode.com/posts/1</code>
    {:else if currentView === 'comment'}
      <code>jsonplaceholder.typicode.com/comments/1</code>
    {:else if currentView === 'user'}
      <code>jsonplaceholder.typicode.com/users/{currentUserId}</code>
    {/if}
  </p>
</div>
</main>

<style>
main {
  max-width: 90%;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
  background: #1c1e22;
  color: #C4C1BB;
  border-radius: 8px;
}

h1 {
  color: #C4C1BB;
  text-align: center;
  margin-bottom: 20px;
}

h3 {
  color: #C4C1BB;
  margin-top: 15px;
  margin-bottom: 5px;
}

li {
  margin-bottom: 5px;
}

ul {
  list-style-type: none;
  padding-left: 10px;
}

.button-group {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

button {
  background-color: #4CAF50;
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #45a049;
}

button.active {
  background-color: #2E7D32;
  box-shadow: 0 0 5px rgba(0,0,0,0.3);
}

.data-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  background-color: #23272F;
}

.error {
  color: red;
  font-weight: bold;
}

.error-container {
  border: 1px solid #ffcccc;
  background-color: #fff0f0;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 20px;
  color: #333;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 20px 0;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
  margin-top: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.endpoint-info {
  margin-top: 20px;
  padding: 10px;
  background-color: #f0f0f0;
  border-radius: 4px;
  font-size: 0.9em;
  color: #333;
}

code {
  background-color: #e0e0e0;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: monospace;
  color: #333;
}

/* Styling for user navigation */
.user-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 15px 0;
}

.user-counter {
  font-weight: bold;
}

.nav-button {
  background-color: #3498db;
}

.nav-button:hover {
  background-color: #2980b9;
}

/* Styling for direct user access */
.user-direct-access {
  margin: 15px 0;
  text-align: center;
}

.user-buttons {
  display: flex;
  justify-content: center;
  gap: 5px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.user-buttons button {
  width: 35px;
  height: 35px;
  padding: 0;
  border-radius: 50%;
  background-color: #3498db;
}

.user-buttons button:hover {
  background-color: #2980b9;
}

.user-buttons button.active {
  background-color: #2c3e50;
}

.address-info, .company-info {
  margin-top: 15px;
  padding: 10px;
  border-radius: 5px;
  background-color: #2c3e50;
}
</style>
<!-- ContactForm.svelte -->

<script>
  let name = '';
  let email = '';
  let message = '';
  
  function handleSubmit() {
    // Validate form inputs before submission
    if (name.trim() === '' || email.trim() === '' || message.trim() === '') {
      alert('Please fill out all fields.');
      return;
    }

    // Form submission logic
    console.log('Form submitted:', { name, email, message });

    // Clear form fields after submission
    name = '';
    email = '';
    message = '';
  }

</script>

<div class="bg-blue-400 p-4 mb-6 rounded">
  <h2 class="text-xl font-bold mb-2">Contact Form</h2>
  <form on:submit|preventDefault={handleSubmit}>
    <div class="mb-4">
      <label for="name" class="block font-bold mb-1">Name:</label>
      <input type="text" id="name" bind:value={name} class="w-full px-3 py-2 border rounded-md" placeholder="Your name">
    </div>
    <div class="mb-4">
      <label for="email" class="block font-bold mb-1">Email:</label>
      <input type="email" id="email" bind:value={email} class="w-full px-3 py-2 border rounded-md" placeholder="Your email">
    </div>
    <div class="mb-4">
      <label for="message" class="block font-bold mb-1">Message:</label>
      <textarea id="message" bind:value={message} class="w-full px-3 py-2 border rounded-md" rows="4" placeholder="Your message"></textarea>
    </div>
    <button type="submit" class="px-4 py-2 bg-gray-900 text-white rounded-md">Submit</button>
  </form>
</div>

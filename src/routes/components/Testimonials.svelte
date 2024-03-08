<script>
  let currentIndex = 0;
  let name = 'John Doe';
  let role = 'CEO, Company XYZ';
  let testimonial = '"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."';

  const cards = [
    {
      name: 'John Doe',
      role: 'CEO, Company XYZ',
      comment: '"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."'
    },
    {
      name: 'Jane Doe',
      role: 'Manager, ABC Inc.',
      comment: '"Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."'
    },
    {
      name: 'Alex Smith',
      role: 'Professor, University X',
      comment: '"Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur."'
    }
  ];

  function next() {
    currentIndex++;
    if (currentIndex >= cards.length) {
      currentIndex = 0;
    }
    updateTestimonial();
  }

  function prev() {
    currentIndex--;
    if (currentIndex < 0) {
      currentIndex = cards.length - 1;
    }
    updateTestimonial();
  }

  function updateTestimonial() {
    name = cards[currentIndex].name;
    role = cards[currentIndex].role;
    testimonial = cards[currentIndex].comment;
  }

</script>

<div class="bg-no-repeat bg-cover bg-center">
  <div class="lg:w-full mx-auto flex flex-col lg:flex-row gap-8 justify-center py-4 items-center">
    <div class="flex items-center"> 
      <button class="text-xs font-bold mb-2 mr-4 focus:outline-none px-4 py-2 rounded-md" on:click={prev}>Back</button>
      <div class="p-8 shrink text-2xl font-light leading-relaxed bg-white rounded-2xl shadow-2xl">
        <h3 style="color: black;" class="text-lg font-bold" >{name}</h3>
        <p style="color: black;" class="text-sm font-light">{role}</p>
        <p style="color: black;" class="text-lg py-2">{testimonial}</p>
                     
      </div>
      <button class="text-xs font-bold mb-2 ml-4 focus:outline-none px-4 py-2 rounded-md" on:click={next}>Forward</button>
    </div>
  </div>
</div>

<!-- Resume.svelte -->

<style>
  /* Dark mode styles */
  .dark {
    background-color: #1f2937;
    color: #f3f4f6;
  }

  body {
    width: 100%;
  }

</style>

<script>
    import Header from './components/Header.svelte';
    import ContactInfo from './components/Contact_Info.svelte';
    import Skills from './components/Skills.svelte';
    import Languages from './components/Languages.svelte';
    import Education from './components/Education.svelte';
    import Experience from './components/Experience.svelte';
    import Footer from './components/Footer.svelte';
    import LanguagesChart from './components/LanguagesChart.svelte';
    import ContactForm from './components/ContactForm.svelte';
    import Testimonials from './components/Testimonials.svelte';


    let isDarkMode = false; // Initialize white mode
    let activeTab = 'education'; // Initialize active tab as 'education'
    
    // Function to toggle dark mode
    function toggleDarkMode() {
        isDarkMode = !isDarkMode;
        document.body.classList.toggle('dark'); // Apply 'dark' class to body for dark mode
    }

    // Function to switch active tab
    function switchTab(tab) {
        activeTab = tab;
    }

    let languages = [
        { name: 'Italian', proficiency: 'Native', level: 100 },
        { name: 'English', proficiency: 'Fluent (C1)', level: 90 },
        { name: 'Spanish', proficiency: 'Intermediate', level: 70 }
    ];

    export let data;

    let showTable = false;

    function toggleTable() {
        showTable = !showTable;
    }

</script>

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=0.8">
  <title>Resume</title>
  <!-- Include Tailwind CSS via link tag -->
  <link href="https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css" rel="stylesheet">
</head>

<body class=" left-0 right-0 {isDarkMode ? 'dark' : ''}">
 
 <div>
    <Header />
 </div>

    <div class="grid lg:grid-cols-7 gap-6 px-6 {isDarkMode ? 'dark' : ''}">

        <div class="md:col-span-2 flex flex-col">

            <div class="md:col-span-1 flex flex-col">
                <div class="flex mb-6">
                    <!-- Second colored box -->
                    <div class="flex-1 mr-6">
                        <Skills />
                    </div>

                    <!-- Third colored box -->
                    <div class="flex-1">
                        <LanguagesChart {languages} />
                    </div>
                </div>

                <!-- Testimonials -->
                <Testimonials />
            </div>
        </div>

        <div class="md:col-span-3">

            <!-- Tab buttons -->
            <div class="flex mb-3">
                <button class="{activeTab === 'education' ? 'bg-blue-300' : 'bg-white'} 
                    text-2xl font-bold mb-2 mr-4 focus:outline-none px-4 py-2 rounded-md" 
                    on:click={() => switchTab('education')}>
                    Education</button>
                <button class="{activeTab === 'experience' ? 'bg-blue-300' : 'bg-white'} 
                    text-2xl font-bold mb-2 mr-4 focus:outline-none px-4 py-2 rounded-md" 
                    on:click={() => switchTab('experience')}>
                    Experience</button>
            </div>
            
            <!-- Render active tab content -->
            {#if activeTab === 'education'}
            <Education />
            {:else if activeTab === 'experience'}
            <Experience />
            {/if}
            
            
        </div>

        <div class="md:col-span-2 items-center">
            <ContactForm />
            <button class = "font-bold focus:outline-none px-4 py-2 rounded-md bg-gray-900 text-white" on:click={toggleTable}>Show Testimonial Contacts</button>
            {#if showTable}
                <table style="font-size: smaller; border-collapse: collapse; border-radius: 8px; overflow: hidden; margin-top: 8px;">
                    <thead>
                        <tr>
                            {#each Object.keys(data.testimonials_contacts[0]) as column}
                                <th style="padding: 8px; border: 1px solid #ddd;">{column}</th>
                            {/each}
                        </tr>
                    </thead>
                    <tbody>
                        {#each data.testimonials_contacts as contact}
                            <tr>
                                {#each Object.values(contact) as value}
                                    <td style="padding: 8px; border: 1px solid #ddd;">{value}</td>
                                {/each}
                            </tr>
                        {/each}
                    </tbody>
                </table>
            {/if}
        </div>


    </div>

    <!-- Dark mode toggle button -->
    <button class="fixed bottom-16 right-8 px-4 py-2 rounded-md bg-gray-900 text-white" on:click={toggleDarkMode}>
    {isDarkMode ? 'Light Mode' : 'Dark Mode'}
    </button>

    <!-- Footer -->
    <Footer />

</body>

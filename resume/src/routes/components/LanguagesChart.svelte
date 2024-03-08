<!-- LanguagesChart.svelte -->

<script>
  export let languages = [];
</script>

<div class="bg-yellow-400 p-4 mb-6 rounded">
  <div>
    <h2 class="text-xl font-bold mb-2">Languages</h2>
    <hr class="border-b-2 border-yellow-300 mb-4">
    {#each languages as language}
      <div class="mb-2">
        <p>{language.name} - {language.proficiency}</p>
        <div class="h-4 bg-gray-300">
          <div class="h-full bg-yellow-600" style="width: {language.level}%"></div>
        </div>
      </div>
    {/each}
  </div>
</div>

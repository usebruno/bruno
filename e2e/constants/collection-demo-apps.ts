/**
 * Sample collection-app code for specs that need an app to create, edit or save.
 * A click counter;
 */
export const CLICK_COUNTER_APP = `<button id="btn">Clicked 0 times</button>
<script>
  let n = 0;
  document.getElementById('btn').onclick = () => {
    n++;
    document.getElementById('btn').textContent = \`Clicked \${n} times\`;
  };
</script>`;

/**
 * CLICK_COUNTER_APP with a different button label, for specs that need an unsaved app edit.
 */
export const CLICK_COUNTER_APP_EDITED = CLICK_COUNTER_APP.replace('>Clicked 0 times</button>', '>Click me</button>');

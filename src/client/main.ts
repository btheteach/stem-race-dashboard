import { createApp, h, onMounted, ref } from "vue";

type Team = { id: string; name: string; score: number };
type RaceState = { teams: Team[] };

const App = {
  setup() {
    const teams = ref<Team[]>([]);
    const loading = ref(true);
    const error = ref<string | null>(null);

    async function load() {
      loading.value = true;
      error.value = null;
      try {
        const res = await fetch("/state");
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const data = (await res.json()) as RaceState;
        teams.value = data.teams;
      } catch {
        error.value = "Could not load scoreboard.";
      } finally {
        loading.value = false;
      }
    }

    onMounted(load);
    return { teams, loading, error, load };
  },
  render(this: { teams: Team[]; loading: boolean; error: string | null; load: () => Promise<void> }) {
    let content;

    if (this.loading) {
      content = h("p", "Loading...");
    } else if (this.error) {
      content = h("p", { class: "error" }, this.error);
    } else {
      content = h(
        "ul",
        { class: "grid" },
        this.teams.map((team) =>
          h("li", { key: team.id, class: "card" }, [
            h("h2", team.name),
            h("p", { class: "score" }, String(team.score)),
          ]),
        ),
      );
    }

    return h("main", { class: "shell" }, [
      h("header", { class: "hero" }, [
        h("h1", "STEM Race Scoreboard"),
        h("button", { onClick: this.load }, "Refresh"),
      ]),
      content,
    ]);
  },
};

createApp(App).mount("#app");

export type Team = {
  id: string;
  name: string;
  score: number;
};

export type RaceState = {
  teams: Team[];
};

const state: RaceState = {
  teams: [],
};

export function getState(): RaceState {
  return {
    teams: state.teams.map((team) => ({ ...team })),
  };
}

export function resetState() {
  state.teams = [];
}

export function createTeam(input: { id: string; name: string }): Team {
  const id = input.id.trim();
  const name = input.name.trim();

  if (state.teams.some((team) => team.id === id)) {
    throw new Error("duplicate_id");
  }

  const team = { id, name, score: 0 };
  state.teams.push(team);
  return { ...team };
}

export function updateTeamName(id: string, name: string): Team | null {
  const team = state.teams.find((item) => item.id === id);
  if (!team) return null;

  team.name = name.trim();
  return { ...team };
}

export function deleteTeam(id: string): boolean {
  const index = state.teams.findIndex((team) => team.id === id);
  if (index < 0) return false;

  state.teams.splice(index, 1);
  return true;
}

export function setTeamScore(id: string, score: number): Team | null {
  const team = state.teams.find((item) => item.id === id);
  if (!team) return null;

  team.score = score;
  return { ...team };
}

export function changeTeamScore(id: string, delta: number): Team | null {
  const team = state.teams.find((item) => item.id === id);
  if (!team) return null;

  team.score += delta;
  return { ...team };
}

export function resetTeamScore(id: string): Team | null {
  return setTeamScore(id, 0);
}

import React from "react";
import { PrimaryButton, Stack, Text, TextField, DefaultButton, MessageBar, MessageBarType } from "@fluentui/react";
import { supabase } from "../lib/supabaseClient";

interface RosterUploadProps {
    tournamentId: string;
    onRosterUpdated: () => void;
}

interface TeamEntry {
    name: string;
    players: string[];
}

export function RosterUpload({ tournamentId, onRosterUpdated }: RosterUploadProps): JSX.Element {
    const [teams, setTeams] = React.useState<TeamEntry[]>([{ name: "", players: [""] }]);
    const [error, setError] = React.useState<string | null>(null);
    const [saving, setSaving] = React.useState(false);
    const [jsonFile, setJsonFile] = React.useState<File | null>(null);

    const handleAddTeam = () => {
        setTeams([...teams, { name: "", players: [""] }]);
    };

    const handleRemoveTeam = (index: number) => {
        setTeams(teams.filter((_, i) => i !== index));
    };

    const handleTeamNameChange = (index: number, name: string) => {
        const updated = [...teams];
        updated[index] = { ...updated[index], name };
        setTeams(updated);
    };

    const handlePlayerChange = (teamIndex: number, playerIndex: number, name: string) => {
        const updated = [...teams];
        const players = [...updated[teamIndex].players];
        players[playerIndex] = name;
        updated[teamIndex] = { ...updated[teamIndex], players };
        setTeams(updated);
    };

    const handleAddPlayer = (teamIndex: number) => {
        const updated = [...teams];
        updated[teamIndex] = { ...updated[teamIndex], players: [...updated[teamIndex].players, ""] };
        setTeams(updated);
    };

    const handleRemovePlayer = (teamIndex: number, playerIndex: number) => {
        const updated = [...teams];
        updated[teamIndex] = {
            ...updated[teamIndex],
            players: updated[teamIndex].players.filter((_, i) => i !== playerIndex),
        };
        setTeams(updated);
    };

    const handleJsonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setJsonFile(file);

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            // Support a simple format: { teams: [{ name: "Team A", players: ["P1", "P2"] }] }
            if (data.teams && Array.isArray(data.teams)) {
                const parsed: TeamEntry[] = data.teams.map((t: any) => ({
                    name: t.name ?? "",
                    players: Array.isArray(t.players)
                        ? t.players.map((p: any) => (typeof p === "string" ? p : p.name ?? ""))
                        : [""],
                }));
                setTeams(parsed);
                setError(null);
            } else {
                setError("JSON must have a 'teams' array with 'name' and 'players' fields.");
            }
        } catch {
            setError("Failed to parse JSON file.");
        }
    };

    const handleSave = async () => {
        setError(null);
        setSaving(true);

        const validTeams = teams.filter((t) => t.name.trim());
        if (validTeams.length === 0) {
            setError("Add at least one team with a name.");
            setSaving(false);
            return;
        }

        // Delete existing roster
        await supabase.from("tournament_teams").delete().eq("tournament_id", tournamentId);

        for (const team of validTeams) {
            const { data: teamData, error: teamError } = await supabase
                .from("tournament_teams")
                .insert({ tournament_id: tournamentId, name: team.name.trim() })
                .select()
                .single();

            if (teamError || !teamData) {
                setError(`Failed to create team "${team.name}": ${teamError?.message}`);
                setSaving(false);
                return;
            }

            const validPlayers = team.players.filter((p) => p.trim());
            if (validPlayers.length > 0) {
                const { error: playerError } = await supabase.from("tournament_players").insert(
                    validPlayers.map((p) => ({
                        team_id: teamData.id,
                        name: p.trim(),
                    }))
                );

                if (playerError) {
                    setError(`Failed to add players to "${team.name}": ${playerError.message}`);
                    setSaving(false);
                    return;
                }
            }
        }

        setSaving(false);
        onRosterUpdated();
    };

    return (
        <Stack tokens={{ childrenGap: 16 }}>
            <Stack horizontal tokens={{ childrenGap: 12 }} verticalAlign="end">
                <Text variant="large" styles={{ root: { fontWeight: 600 } }}>
                    Roster
                </Text>
                <label>
                    <input
                        type="file"
                        accept=".json"
                        onChange={handleJsonUpload}
                        style={{ display: "none" }}
                    />
                    <DefaultButton text="Import JSON" onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()} />
                </label>
            </Stack>

            {error && <MessageBar messageBarType={MessageBarType.error}>{error}</MessageBar>}

            {teams.map((team, teamIndex) => (
                <Stack
                    key={teamIndex}
                    tokens={{ childrenGap: 8 }}
                    styles={{
                        root: {
                            padding: 12,
                            backgroundColor: "white",
                            borderRadius: 4,
                            border: "1px solid #edebe9",
                        },
                    }}
                >
                    <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="end">
                        <TextField
                            label="Team Name"
                            value={team.name}
                            onChange={(_e, val) => handleTeamNameChange(teamIndex, val ?? "")}
                            styles={{ root: { flex: 1 } }}
                        />
                        <DefaultButton text="Remove Team" onClick={() => handleRemoveTeam(teamIndex)} />
                    </Stack>
                    {team.players.map((player, playerIndex) => (
                        <Stack key={playerIndex} horizontal tokens={{ childrenGap: 8 }} verticalAlign="end">
                            <TextField
                                placeholder={`Player ${playerIndex + 1}`}
                                value={player}
                                onChange={(_e, val) => handlePlayerChange(teamIndex, playerIndex, val ?? "")}
                                styles={{ root: { flex: 1 } }}
                            />
                            {team.players.length > 1 && (
                                <DefaultButton text="X" onClick={() => handleRemovePlayer(teamIndex, playerIndex)} />
                            )}
                        </Stack>
                    ))}
                    <DefaultButton text="+ Add Player" onClick={() => handleAddPlayer(teamIndex)} styles={{ root: { alignSelf: "flex-start" } }} />
                </Stack>
            ))}

            <Stack horizontal tokens={{ childrenGap: 8 }}>
                <DefaultButton text="+ Add Team" onClick={handleAddTeam} />
                <PrimaryButton text={saving ? "Saving..." : "Save Roster"} onClick={handleSave} disabled={saving} />
            </Stack>
        </Stack>
    );
}

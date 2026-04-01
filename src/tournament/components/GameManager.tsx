import React from "react";
import { useNavigate } from "react-router-dom";
import {
    DefaultButton,
    Dialog,
    DialogFooter,
    DialogType,
    Dropdown,
    IDropdownOption,
    PrimaryButton,
    Stack,
    Text,
    FontWeights,
    MessageBar,
    MessageBarType,
} from "@fluentui/react";
import { supabase } from "../lib/supabaseClient";
import { GameCard } from "./GameCard";

interface Team {
    id: string;
    name: string;
}

interface Moderator {
    user_id: string | null;
    email: string;
    display_name?: string;
}

interface GameRow {
    id: string;
    round_id: string;
    team1_id: string;
    team2_id: string;
    team1_name: string;
    team2_name: string;
    team1_score: number;
    team2_score: number;
    status: "pending" | "in_progress" | "completed";
    moderator_id: string | null;
    moderator_name?: string;
}

interface RoundData {
    id: string;
    round_number: number;
}

interface GameManagerProps {
    tournamentId: string;
    rounds: RoundData[];
    teams: Team[];
    moderators: Moderator[];
    onGamesUpdated: () => void;
}

export function GameManager({ tournamentId, rounds, teams, moderators, onGamesUpdated }: GameManagerProps): JSX.Element {
    const navigate = useNavigate();
    const [games, setGames] = React.useState<GameRow[]>([]);
    const [showCreate, setShowCreate] = React.useState(false);
    const [selectedRound, setSelectedRound] = React.useState<string | undefined>();
    const [selectedTeam1, setSelectedTeam1] = React.useState<string | undefined>();
    const [selectedTeam2, setSelectedTeam2] = React.useState<string | undefined>();
    const [selectedModerator, setSelectedModerator] = React.useState<string | undefined>();
    const [error, setError] = React.useState<string | null>(null);
    const [creating, setCreating] = React.useState(false);

    const fetchGames = React.useCallback(async () => {
        const { data } = await supabase
            .from("games")
            .select(
                `
                id,
                round_id,
                team1_id,
                team2_id,
                team1_score,
                team2_score,
                status,
                moderator_id,
                team1:tournament_teams!team1_id(name),
                team2:tournament_teams!team2_id(name),
                moderator:profiles!moderator_id(display_name)
            `
            )
            .eq("tournament_id", tournamentId)
            .order("round_id");

        if (data) {
            setGames(
                data.map((g: any) => ({
                    id: g.id,
                    round_id: g.round_id,
                    team1_id: g.team1_id,
                    team2_id: g.team2_id,
                    team1_name: g.team1?.name ?? "TBD",
                    team2_name: g.team2?.name ?? "TBD",
                    team1_score: g.team1_score,
                    team2_score: g.team2_score,
                    status: g.status,
                    moderator_id: g.moderator_id,
                    moderator_name: g.moderator?.display_name,
                }))
            );
        }
    }, [tournamentId]);

    React.useEffect(() => {
        fetchGames();
    }, [fetchGames]);

    // Subscribe to real-time updates
    React.useEffect(() => {
        const channel = supabase
            .channel(`games-manage-${tournamentId}`)
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "games", filter: `tournament_id=eq.${tournamentId}` },
                (payload) => {
                    const updated = payload.new as any;
                    setGames((prev) =>
                        prev.map((g) =>
                            g.id === updated.id
                                ? { ...g, team1_score: updated.team1_score, team2_score: updated.team2_score, status: updated.status }
                                : g
                        )
                    );
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tournamentId]);

    const roundOptions: IDropdownOption[] = rounds.map((r) => ({ key: r.id, text: `Round ${r.round_number}` }));

    const teamOptions: IDropdownOption[] = teams.map((t) => ({ key: t.id, text: t.name }));

    const moderatorOptions: IDropdownOption[] = [
        { key: "", text: "(Unassigned)" },
        ...moderators
            .filter((m) => m.user_id)
            .map((m) => ({ key: m.user_id!, text: m.display_name ?? m.email })),
    ];

    const handleCreate = async () => {
        if (!selectedRound || !selectedTeam1 || !selectedTeam2) return;
        if (selectedTeam1 === selectedTeam2) {
            setError("Teams must be different.");
            return;
        }

        setCreating(true);
        setError(null);

        const { error: insertError } = await supabase.from("games").insert({
            round_id: selectedRound,
            tournament_id: tournamentId,
            team1_id: selectedTeam1,
            team2_id: selectedTeam2,
            moderator_id: selectedModerator || null,
        });

        setCreating(false);
        if (insertError) {
            setError(insertError.message);
        } else {
            setShowCreate(false);
            setSelectedTeam1(undefined);
            setSelectedTeam2(undefined);
            setSelectedModerator(undefined);
            fetchGames();
            onGamesUpdated();
        }
    };

    const handleDeleteGame = async (gameId: string) => {
        await supabase.from("games").delete().eq("id", gameId);
        fetchGames();
    };

    // Group games by round
    const gamesByRound = new Map<string, GameRow[]>();
    for (const game of games) {
        const existing = gamesByRound.get(game.round_id) ?? [];
        existing.push(game);
        gamesByRound.set(game.round_id, existing);
    }

    return (
        <Stack tokens={{ childrenGap: 16 }}>
            <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
                <Text variant="large" styles={{ root: { fontWeight: FontWeights.semibold } }}>
                    Games
                </Text>
                <PrimaryButton
                    text="Create Game"
                    onClick={() => setShowCreate(true)}
                    disabled={rounds.length === 0 || teams.length < 2}
                />
            </Stack>

            {rounds.length === 0 && <Text styles={{ root: { color: "#605e5c" } }}>Add rounds first before creating games.</Text>}
            {teams.length < 2 && rounds.length > 0 && <Text styles={{ root: { color: "#605e5c" } }}>Add at least 2 teams to the roster before creating games.</Text>}

            {rounds.map((round) => {
                const roundGames = gamesByRound.get(round.id) ?? [];
                if (roundGames.length === 0) return null;

                return (
                    <Stack key={round.id} tokens={{ childrenGap: 8 }}>
                        <Text styles={{ root: { fontWeight: FontWeights.semibold } }}>Round {round.round_number}</Text>
                        {roundGames.map((game) => (
                            <Stack key={game.id} horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
                                <Stack.Item grow>
                                    <GameCard
                                        team1Name={game.team1_name}
                                        team2Name={game.team2_name}
                                        team1Score={game.team1_score}
                                        team2Score={game.team2_score}
                                        moderatorName={game.moderator_name}
                                        status={game.status}
                                    />
                                </Stack.Item>
                                <Stack tokens={{ childrenGap: 4 }}>
                                    {game.status !== "pending" && (
                                        <DefaultButton
                                            text="Open Game"
                                            onClick={() => navigate(`/tournament/${tournamentId}/game/${game.id}`)}
                                        />
                                    )}
                                    <DefaultButton text="Delete" onClick={() => handleDeleteGame(game.id)} />
                                </Stack>
                            </Stack>
                        ))}
                    </Stack>
                );
            })}

            <Dialog
                hidden={!showCreate}
                onDismiss={() => setShowCreate(false)}
                dialogContentProps={{ type: DialogType.normal, title: "Create Game" }}
                modalProps={{ isBlocking: true }}
            >
                <Stack tokens={{ childrenGap: 12 }}>
                    {error && <MessageBar messageBarType={MessageBarType.error}>{error}</MessageBar>}
                    <Dropdown
                        label="Round"
                        options={roundOptions}
                        selectedKey={selectedRound}
                        onChange={(_e, option) => setSelectedRound(option?.key as string)}
                        required
                    />
                    <Dropdown
                        label="Team 1"
                        options={teamOptions}
                        selectedKey={selectedTeam1}
                        onChange={(_e, option) => setSelectedTeam1(option?.key as string)}
                        required
                    />
                    <Dropdown
                        label="Team 2"
                        options={teamOptions}
                        selectedKey={selectedTeam2}
                        onChange={(_e, option) => setSelectedTeam2(option?.key as string)}
                        required
                    />
                    <Dropdown
                        label="Moderator"
                        options={moderatorOptions}
                        selectedKey={selectedModerator ?? ""}
                        onChange={(_e, option) => setSelectedModerator(option?.key as string)}
                    />
                </Stack>
                <DialogFooter>
                    <PrimaryButton text={creating ? "Creating..." : "Create"} onClick={handleCreate} disabled={creating || !selectedRound || !selectedTeam1 || !selectedTeam2} />
                    <DefaultButton text="Cancel" onClick={() => setShowCreate(false)} />
                </DialogFooter>
            </Dialog>
        </Stack>
    );
}

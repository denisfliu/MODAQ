import React from "react";
import { Stack, Text, FontWeights } from "@fluentui/react";
import { supabase } from "../lib/supabaseClient";
import { GameCard } from "./GameCard";

interface RoundGames {
    roundNumber: number;
    roundId: string;
    games: GameRow[];
}

interface GameRow {
    id: string;
    team1_name: string;
    team2_name: string;
    team1_score: number;
    team2_score: number;
    status: "pending" | "in_progress" | "completed";
    moderator_name?: string;
}

interface ScoreboardViewProps {
    tournamentId: string;
    tournamentName?: string;
}

export function ScoreboardView({ tournamentId, tournamentName }: ScoreboardViewProps): JSX.Element {
    const [roundGames, setRoundGames] = React.useState<RoundGames[]>([]);
    const [loading, setLoading] = React.useState(true);

    const fetchGames = React.useCallback(async () => {
        const { data: rounds } = await supabase
            .from("rounds")
            .select("id, round_number")
            .eq("tournament_id", tournamentId)
            .eq("is_enabled", true)
            .order("round_number");

        if (!rounds) {
            setLoading(false);
            return;
        }

        const allRoundGames: RoundGames[] = [];

        for (const round of rounds) {
            const { data: games } = await supabase
                .from("games")
                .select(
                    `
                    id,
                    team1_score,
                    team2_score,
                    status,
                    moderator_id,
                    team1:tournament_teams!team1_id(name),
                    team2:tournament_teams!team2_id(name),
                    moderator:profiles!moderator_id(display_name)
                `
                )
                .eq("round_id", round.id);

            const gameRows: GameRow[] = (games ?? []).map((g: any) => ({
                id: g.id,
                team1_name: g.team1?.name ?? "TBD",
                team2_name: g.team2?.name ?? "TBD",
                team1_score: g.team1_score,
                team2_score: g.team2_score,
                status: g.status,
                moderator_name: g.moderator?.display_name,
            }));

            allRoundGames.push({
                roundNumber: round.round_number,
                roundId: round.id,
                games: gameRows,
            });
        }

        setRoundGames(allRoundGames);
        setLoading(false);
    }, [tournamentId]);

    React.useEffect(() => {
        fetchGames();
    }, [fetchGames]);

    // Subscribe to real-time game score updates
    React.useEffect(() => {
        const channel = supabase
            .channel(`scoreboard-${tournamentId}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "games",
                    filter: `tournament_id=eq.${tournamentId}`,
                },
                (payload) => {
                    const updated = payload.new as any;
                    setRoundGames((prev) =>
                        prev.map((round) => ({
                            ...round,
                            games: round.games.map((game) =>
                                game.id === updated.id
                                    ? {
                                          ...game,
                                          team1_score: updated.team1_score,
                                          team2_score: updated.team2_score,
                                          status: updated.status,
                                      }
                                    : game
                            ),
                        }))
                    );
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tournamentId]);

    if (loading) {
        return <Text>Loading scoreboard...</Text>;
    }

    if (roundGames.length === 0) {
        return <Text>No rounds are currently enabled.</Text>;
    }

    return (
        <Stack tokens={{ childrenGap: 24 }}>
            {tournamentName && (
                <Text variant="xxLarge" styles={{ root: { fontWeight: FontWeights.bold } }}>
                    {tournamentName}
                </Text>
            )}
            {roundGames.map((round) => (
                <Stack key={round.roundId} tokens={{ childrenGap: 12 }}>
                    <Text variant="xLarge" styles={{ root: { fontWeight: FontWeights.semibold } }}>
                        Round {round.roundNumber}
                    </Text>
                    <Stack tokens={{ childrenGap: 8 }}>
                        {round.games.map((game) => (
                            <GameCard
                                key={game.id}
                                team1Name={game.team1_name}
                                team2Name={game.team2_name}
                                team1Score={game.team1_score}
                                team2Score={game.team2_score}
                                moderatorName={game.moderator_name}
                                status={game.status}
                            />
                        ))}
                    </Stack>
                </Stack>
            ))}
        </Stack>
    );
}

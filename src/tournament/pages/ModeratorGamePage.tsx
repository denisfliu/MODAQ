import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { reaction } from "mobx";
import { DefaultButton, Spinner, SpinnerSize, Stack, Text } from "@fluentui/react";
import { supabase } from "../lib/supabaseClient";
import { ModaqControl } from "../../components/ModaqControl";
import { IPacket } from "../../state/IPacket";
import { IPlayer } from "../../state/TeamState";
import { IGameFormat } from "../../state/IGameFormat";
import { fromQBJ, toQBJ, IMatch } from "../../qbj/QBJ";
import { PacketState, Tossup, Bonus } from "../../state/PacketState";
import { AppState } from "../../state/AppState";
import { extractScoresFromQBJ } from "../lib/scoreUtils";

declare const __BUILD_VERSION__: string;

interface GameData {
    packet: IPacket;
    players: IPlayer[];
    gameFormat: IGameFormat;
    team1Name: string;
    team2Name: string;
    existingGameState: IMatch | null;
}

function packetFromIPacket(iPacket: IPacket): PacketState {
    const tossups = (iPacket.tossups ?? []).map(
        (t) => new Tossup(t.question, t.answer, t.metadata)
    );
    const bonuses = (iPacket.bonuses ?? []).map(
        (b) =>
            new Bonus(
                b.leadin,
                (b.parts ?? []).map((partQ, i) => ({
                    question: typeof partQ === "string" ? partQ : partQ,
                    answer: b.answers?.[i] ?? "",
                    value: b.values?.[i] ?? 10,
                    difficultyModifier: b.difficultyModifiers?.[i],
                })),
                b.metadata
            )
    );
    const packet = new PacketState();
    packet.setTossups(tossups);
    packet.setBonuses(bonuses);
    return packet;
}

export function ModeratorGamePage(): JSX.Element {
    const { id: tournamentId, gameId } = useParams<{ id: string; gameId: string }>();
    const navigate = useNavigate();
    const [gameData, setGameData] = React.useState<GameData | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [ready, setReady] = React.useState(false);

    React.useEffect(() => {
        const fetchGameData = async () => {
            if (!gameId || !tournamentId) return;

            // Fetch game with round, team, and existing game_state
            const { data: game, error: gameError } = await supabase
                .from("games")
                .select(
                    `
                    id,
                    team1_id,
                    team2_id,
                    game_state,
                    round:rounds!round_id(packet),
                    team1:tournament_teams!team1_id(id, name),
                    team2:tournament_teams!team2_id(id, name)
                `
                )
                .eq("id", gameId)
                .single();

            if (gameError || !game) {
                setError("Failed to load game data.");
                setLoading(false);
                return;
            }

            // Fetch tournament for game format
            const { data: tournament } = await supabase
                .from("tournaments")
                .select("game_format")
                .eq("id", tournamentId)
                .single();

            if (!tournament) {
                setError("Failed to load tournament data.");
                setLoading(false);
                return;
            }

            const roundData = game.round as any;
            const packet: IPacket | null = roundData?.packet;

            if (!packet) {
                setError("No packet has been uploaded for this round yet.");
                setLoading(false);
                return;
            }

            // Fetch players for both teams
            const team1Data = game.team1 as any;
            const team2Data = game.team2 as any;

            const { data: team1Players } = await supabase
                .from("tournament_players")
                .select("name, is_starter")
                .eq("team_id", team1Data.id);

            const { data: team2Players } = await supabase
                .from("tournament_players")
                .select("name, is_starter")
                .eq("team_id", team2Data.id);

            const players: IPlayer[] = [
                ...(team1Players ?? []).map((p) => ({
                    name: p.name,
                    teamName: team1Data.name,
                    isStarter: p.is_starter,
                })),
                ...(team2Players ?? []).map((p) => ({
                    name: p.name,
                    teamName: team2Data.name,
                    isStarter: p.is_starter,
                })),
            ];

            setGameData({
                packet,
                players,
                gameFormat: tournament.game_format,
                team1Name: team1Data.name,
                team2Name: team2Data.name,
                existingGameState: (game as any).game_state as IMatch | null,
            });
            setLoading(false);
        };

        fetchGameData();
    }, [gameId, tournamentId]);

    // Once gameData is loaded, restore from Supabase QBJ if localStorage is empty
    React.useEffect(() => {
        if (!gameData || !gameId) return;

        const storeName = `tournament-game-${gameId}`;
        const hasLocalData = localStorage.getItem(storeName) != null;

        if (!hasLocalData && gameData.existingGameState) {
            const packetState = packetFromIPacket(gameData.packet);
            const result = fromQBJ(gameData.existingGameState, packetState, gameData.gameFormat);
            if (result.success) {
                AppState.instance.setGame(result.value);
            }
        }

        setReady(true);
    }, [gameData, gameId]);

    // Sync game state to Supabase whenever scores change, using a MobX reaction
    React.useEffect(() => {
        if (!gameId || !ready) return;

        const appState = AppState.instance;
        let syncTimeout: ReturnType<typeof setTimeout> | undefined;

        const dispose = reaction(
            () => {
                const scores = appState.game.scores;
                return scores ? [scores[0], scores[1]] : [0, 0];
            },
            () => {
                // Debounce: wait 2 seconds after the last change before syncing
                if (syncTimeout != undefined) {
                    clearTimeout(syncTimeout);
                }
                syncTimeout = setTimeout(() => {
                    const game = appState.game;
                    const packetName = game.packet.name ?? appState.uiState.packetFilename;
                    const qbj = toQBJ(game, packetName);
                    const scores = extractScoresFromQBJ(qbj);

                    supabase
                        .from("games")
                        .update({
                            game_state: qbj as any,
                            team1_score: scores.team1Score,
                            team2_score: scores.team2Score,
                            status: "in_progress",
                            updated_at: new Date().toISOString(),
                        })
                        .eq("id", gameId)
                        .select()
                        .then(({ error: updateError, data }) => {
                            if (updateError) {
                                console.error("[Tournament Sync] Failed:", updateError.message);
                            } else if (!data || data.length === 0) {
                                console.warn("[Tournament Sync] No rows updated — check RLS permissions");
                            } else {
                                console.log("[Tournament Sync] Synced scores:", scores);
                            }
                        });
                }, 2000);
            },
            { fireImmediately: false }
        );

        return () => {
            dispose();
            if (syncTimeout != undefined) {
                clearTimeout(syncTimeout);
            }
        };
    }, [gameId, ready]);

    if (loading || !ready) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
                <Spinner size={SpinnerSize.large} label="Loading game..." />
            </div>
        );
    }

    if (error || !gameData) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
                <Stack tokens={{ childrenGap: 12 }} horizontalAlign="center">
                    <Text variant="large">{error ?? "Failed to load game."}</Text>
                    <DefaultButton text="Back to Tournament" onClick={() => navigate(`/tournament/${tournamentId}`)} />
                </Stack>
            </div>
        );
    }

    return (
        <div>
            <div
                style={{
                    padding: "4px 16px",
                    backgroundColor: "#0078d4",
                    color: "white",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <Text styles={{ root: { color: "white", fontWeight: 600 } }}>
                    {gameData.team1Name} vs {gameData.team2Name}
                </Text>
                <DefaultButton
                    text="Back to Tournament"
                    onClick={() => navigate(`/tournament/${tournamentId}`)}
                    styles={{
                        root: { backgroundColor: "transparent", color: "white", borderColor: "white" },
                        rootHovered: { backgroundColor: "rgba(255,255,255,0.1)", color: "white" },
                    }}
                />
            </div>
            <ModaqControl
                packet={gameData.packet}
                players={gameData.players}
                gameFormat={gameData.gameFormat}
                storeName={`tournament-game-${gameId}`}
                hideNewGame={true}
                buildVersion={typeof __BUILD_VERSION__ !== "undefined" ? __BUILD_VERSION__ : undefined}
            />
        </div>
    );
}

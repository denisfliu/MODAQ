import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    DefaultButton,
    Dialog,
    DialogFooter,
    DialogType,
    Dropdown,
    FontWeights,
    IDropdownOption,
    MessageBar,
    MessageBarType,
    Pivot,
    PivotItem,
    PrimaryButton,
    Spinner,
    SpinnerSize,
    Stack,
    Text,
} from "@fluentui/react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { TournamentLayout } from "../components/TournamentLayout";
import { RoundManager } from "../components/RoundManager";
import { GameManager } from "../components/GameManager";
import { RosterUpload } from "../components/RosterUpload";
import { InviteModerators } from "../components/InviteModerators";
import { ScoreboardView } from "../components/ScoreboardView";
import { GameCard } from "../components/GameCard";

interface TournamentData {
    id: string;
    name: string;
    director_id: string;
}

interface RoundRow {
    id: string;
    round_number: number;
    packet_name: string | null;
    is_enabled: boolean;
}

interface TeamRow {
    id: string;
    name: string;
}

interface ModeratorRow {
    user_id: string | null;
    email: string;
    display_name?: string;
}

interface ModeratorGame {
    id: string;
    round_number: number;
    round_id: string;
    team1_name: string;
    team2_name: string;
    team1_score: number;
    team2_score: number;
    status: "pending" | "in_progress" | "completed";
}

export function TournamentPage(): JSX.Element {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [tournament, setTournament] = React.useState<TournamentData | null>(null);
    const [rounds, setRounds] = React.useState<RoundRow[]>([]);
    const [teams, setTeams] = React.useState<TeamRow[]>([]);
    const [moderators, setModerators] = React.useState<ModeratorRow[]>([]);
    const [myGames, setMyGames] = React.useState<ModeratorGame[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [isDirector, setIsDirector] = React.useState(false);

    // Create game dialog state (moderator)
    const [showCreateGame, setShowCreateGame] = React.useState(false);
    const [selectedRoundId, setSelectedRoundId] = React.useState<string | undefined>();
    const [selectedTeam1, setSelectedTeam1] = React.useState<string | undefined>();
    const [selectedTeam2, setSelectedTeam2] = React.useState<string | undefined>();
    const [createError, setCreateError] = React.useState<string | null>(null);
    const [creating, setCreating] = React.useState(false);

    const fetchAll = React.useCallback(async () => {
        if (!id) return;

        const { data: t } = await supabase.from("tournaments").select("*").eq("id", id).single();
        if (!t) {
            setLoading(false);
            return;
        }
        setTournament(t);
        setIsDirector(t.director_id === user?.id);

        const { data: r } = await supabase
            .from("rounds")
            .select("id, round_number, packet_name, is_enabled")
            .eq("tournament_id", id)
            .order("round_number");
        setRounds(r ?? []);

        const { data: tm } = await supabase
            .from("tournament_teams")
            .select("id, name")
            .eq("tournament_id", id)
            .order("name");
        setTeams(tm ?? []);

        const { data: mods } = await supabase
            .from("tournament_moderators")
            .select("user_id, email")
            .eq("tournament_id", id);

        if (mods) {
            const withNames: ModeratorRow[] = [];
            for (const mod of mods) {
                if (mod.user_id) {
                    const { data: profile } = await supabase
                        .from("profiles")
                        .select("display_name")
                        .eq("id", mod.user_id)
                        .single();
                    withNames.push({ ...mod, display_name: profile?.display_name });
                } else {
                    withNames.push(mod);
                }
            }
            setModerators(withNames);
        }

        // Fetch games created by current user
        if (user) {
            const { data: games } = await supabase
                .from("games")
                .select(
                    `
                    id,
                    round_id,
                    team1_score,
                    team2_score,
                    status,
                    round:rounds!round_id(round_number),
                    team1:tournament_teams!team1_id(name),
                    team2:tournament_teams!team2_id(name)
                `
                )
                .eq("tournament_id", id)
                .eq("moderator_id", user.id);

            if (games) {
                setMyGames(
                    games.map((g: any) => ({
                        id: g.id,
                        round_id: g.round_id,
                        round_number: g.round?.round_number ?? 0,
                        team1_name: g.team1?.name ?? "TBD",
                        team2_name: g.team2?.name ?? "TBD",
                        team1_score: g.team1_score,
                        team2_score: g.team2_score,
                        status: g.status,
                    }))
                );
            }
        }

        setLoading(false);
    }, [id, user]);

    React.useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const enabledRounds = rounds.filter((r) => r.is_enabled);

    const handleOpenCreateGame = (roundId: string) => {
        setSelectedRoundId(roundId);
        setSelectedTeam1(undefined);
        setSelectedTeam2(undefined);
        setCreateError(null);
        setShowCreateGame(true);
    };

    const handleCreateGame = async () => {
        if (!selectedRoundId || !selectedTeam1 || !selectedTeam2 || !user) return;
        if (selectedTeam1 === selectedTeam2) {
            setCreateError("Teams must be different.");
            return;
        }

        setCreating(true);
        setCreateError(null);

        const { data, error } = await supabase
            .from("games")
            .insert({
                round_id: selectedRoundId,
                tournament_id: id!,
                team1_id: selectedTeam1,
                team2_id: selectedTeam2,
                moderator_id: user.id,
            })
            .select("id")
            .single();

        setCreating(false);

        if (error) {
            setCreateError(error.message);
        } else if (data) {
            setShowCreateGame(false);
            navigate(`/tournament/${id}/game/${data.id}`);
        }
    };

    const teamOptions: IDropdownOption[] = teams.map((t) => ({ key: t.id, text: t.name }));

    if (loading) {
        return (
            <TournamentLayout>
                <Spinner size={SpinnerSize.large} label="Loading tournament..." />
            </TournamentLayout>
        );
    }

    if (!tournament) {
        return (
            <TournamentLayout>
                <Text>Tournament not found.</Text>
            </TournamentLayout>
        );
    }

    const createGameDialog = (
        <Dialog
            hidden={!showCreateGame}
            onDismiss={() => setShowCreateGame(false)}
            dialogContentProps={{
                type: DialogType.normal,
                title: `Start Game — Round ${enabledRounds.find((r) => r.id === selectedRoundId)?.round_number ?? ""}`,
            }}
            modalProps={{ isBlocking: true }}
        >
            <Stack tokens={{ childrenGap: 12 }}>
                {createError && <MessageBar messageBarType={MessageBarType.error}>{createError}</MessageBar>}
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
            </Stack>
            <DialogFooter>
                <PrimaryButton
                    text={creating ? "Starting..." : "Start Game"}
                    onClick={handleCreateGame}
                    disabled={creating || !selectedTeam1 || !selectedTeam2}
                />
                <DefaultButton text="Cancel" onClick={() => setShowCreateGame(false)} />
            </DialogFooter>
        </Dialog>
    );

    // Moderator view
    if (!isDirector) {
        // Group existing games by round
        const gamesByRound = new Map<string, ModeratorGame[]>();
        for (const game of myGames) {
            const existing = gamesByRound.get(game.round_id) ?? [];
            existing.push(game);
            gamesByRound.set(game.round_id, existing);
        }

        return (
            <TournamentLayout>
                <Stack tokens={{ childrenGap: 24 }}>
                    <Text variant="xxLarge" styles={{ root: { fontWeight: FontWeights.bold } }}>
                        {tournament.name}
                    </Text>

                    {enabledRounds.length === 0 && (
                        <Text styles={{ root: { color: "#605e5c" } }}>
                            No rounds are currently enabled. Check back later.
                        </Text>
                    )}

                    {enabledRounds.map((round) => {
                        const roundGames = gamesByRound.get(round.id) ?? [];
                        return (
                            <Stack key={round.id} tokens={{ childrenGap: 8 }}>
                                <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
                                    <Text variant="large" styles={{ root: { fontWeight: FontWeights.semibold } }}>
                                        Round {round.round_number}
                                    </Text>
                                    <PrimaryButton
                                        text="Start New Game"
                                        onClick={() => handleOpenCreateGame(round.id)}
                                        disabled={teams.length < 2}
                                    />
                                </Stack>
                                {round.packet_name && (
                                    <Text variant="small" styles={{ root: { color: "#605e5c" } }}>
                                        Packet: {round.packet_name}
                                    </Text>
                                )}
                                {roundGames.map((game) => (
                                    <GameCard
                                        key={game.id}
                                        team1Name={game.team1_name}
                                        team2Name={game.team2_name}
                                        team1Score={game.team1_score}
                                        team2Score={game.team2_score}
                                        status={game.status}
                                        onClick={() => navigate(`/tournament/${id}/game/${game.id}`)}
                                    />
                                ))}
                            </Stack>
                        );
                    })}
                </Stack>
                {createGameDialog}
            </TournamentLayout>
        );
    }

    // Director view
    const viewerLink = `${window.location.origin}/tournament/${id}/view`;

    return (
        <TournamentLayout>
            <Stack tokens={{ childrenGap: 16 }}>
                <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
                    <Text variant="xxLarge" styles={{ root: { fontWeight: FontWeights.bold } }}>
                        {tournament.name}
                    </Text>
                    <DefaultButton
                        text="Copy Viewer Link"
                        onClick={() => navigator.clipboard.writeText(viewerLink)}
                    />
                </Stack>

                <Pivot>
                    <PivotItem headerText="Rounds">
                        <Stack styles={{ root: { paddingTop: 16 } }}>
                            <RoundManager
                                tournamentId={tournament.id}
                                rounds={rounds}
                                onRoundsUpdated={fetchAll}
                            />
                        </Stack>
                    </PivotItem>
                    <PivotItem headerText="Games">
                        <Stack styles={{ root: { paddingTop: 16 } }}>
                            <GameManager
                                tournamentId={tournament.id}
                                rounds={rounds}
                                teams={teams}
                                moderators={moderators}
                                onGamesUpdated={fetchAll}
                            />
                        </Stack>
                    </PivotItem>
                    <PivotItem headerText="Roster">
                        <Stack styles={{ root: { paddingTop: 16 } }}>
                            <RosterUpload tournamentId={tournament.id} onRosterUpdated={fetchAll} />
                        </Stack>
                    </PivotItem>
                    <PivotItem headerText="Moderators">
                        <Stack styles={{ root: { paddingTop: 16 } }}>
                            <InviteModerators tournamentId={tournament.id} />
                        </Stack>
                    </PivotItem>
                    <PivotItem headerText="Live Scores">
                        <Stack styles={{ root: { paddingTop: 16 } }}>
                            <ScoreboardView tournamentId={tournament.id} />
                        </Stack>
                    </PivotItem>
                </Pivot>
            </Stack>
        </TournamentLayout>
    );
}

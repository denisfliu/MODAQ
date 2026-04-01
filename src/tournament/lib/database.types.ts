import { IGameFormat } from "../../state/IGameFormat";
import { IPacket } from "../../state/IPacket";
import { IMatch } from "../../qbj/QBJ";

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    display_name: string;
                    email: string;
                    created_at: string;
                };
                Insert: {
                    id: string;
                    display_name: string;
                    email: string;
                    created_at?: string;
                };
                Update: {
                    display_name?: string;
                    email?: string;
                };
            };
            tournaments: {
                Row: {
                    id: string;
                    name: string;
                    director_id: string;
                    game_format: IGameFormat;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    director_id: string;
                    game_format: IGameFormat;
                    created_at?: string;
                };
                Update: {
                    name?: string;
                    game_format?: IGameFormat;
                };
            };
            tournament_teams: {
                Row: {
                    id: string;
                    tournament_id: string;
                    name: string;
                };
                Insert: {
                    id?: string;
                    tournament_id: string;
                    name: string;
                };
                Update: {
                    name?: string;
                };
            };
            tournament_players: {
                Row: {
                    id: string;
                    team_id: string;
                    name: string;
                    is_starter: boolean;
                };
                Insert: {
                    id?: string;
                    team_id: string;
                    name: string;
                    is_starter?: boolean;
                };
                Update: {
                    name?: string;
                    is_starter?: boolean;
                };
            };
            tournament_moderators: {
                Row: {
                    id: string;
                    tournament_id: string;
                    user_id: string | null;
                    email: string;
                    invited_at: string;
                    accepted_at: string | null;
                };
                Insert: {
                    id?: string;
                    tournament_id: string;
                    user_id?: string | null;
                    email: string;
                    invited_at?: string;
                    accepted_at?: string | null;
                };
                Update: {
                    user_id?: string | null;
                    accepted_at?: string | null;
                };
            };
            rounds: {
                Row: {
                    id: string;
                    tournament_id: string;
                    round_number: number;
                    packet: IPacket | null;
                    packet_name: string | null;
                    is_enabled: boolean;
                };
                Insert: {
                    id?: string;
                    tournament_id: string;
                    round_number: number;
                    packet?: IPacket | null;
                    packet_name?: string | null;
                    is_enabled?: boolean;
                };
                Update: {
                    round_number?: number;
                    packet?: IPacket | null;
                    packet_name?: string | null;
                    is_enabled?: boolean;
                };
            };
            games: {
                Row: {
                    id: string;
                    round_id: string;
                    tournament_id: string;
                    moderator_id: string | null;
                    team1_id: string;
                    team2_id: string;
                    game_state: IMatch | null;
                    team1_score: number;
                    team2_score: number;
                    status: "pending" | "in_progress" | "completed";
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    round_id: string;
                    tournament_id: string;
                    moderator_id?: string | null;
                    team1_id: string;
                    team2_id: string;
                    game_state?: IMatch | null;
                    team1_score?: number;
                    team2_score?: number;
                    status?: "pending" | "in_progress" | "completed";
                    updated_at?: string;
                };
                Update: {
                    moderator_id?: string | null;
                    game_state?: IMatch | null;
                    team1_score?: number;
                    team2_score?: number;
                    status?: "pending" | "in_progress" | "completed";
                    updated_at?: string;
                };
            };
        };
    };
}

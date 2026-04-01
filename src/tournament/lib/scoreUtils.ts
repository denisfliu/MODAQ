import { IMatch, IMatchTeam } from "../../qbj/QBJ";

export interface GameScores {
    team1Score: number;
    team2Score: number;
}

function getTeamScore(matchTeam: IMatchTeam): number {
    let score = matchTeam.bonus_points + (matchTeam.bonus_bounceback_points ?? 0);
    for (const player of matchTeam.match_players) {
        for (const ac of player.answer_counts) {
            score += ac.number * ac.answer.value;
        }
    }
    return score;
}

export function extractScoresFromQBJ(qbj: IMatch): GameScores {
    const matchTeams = qbj.match_teams;
    if (!matchTeams || matchTeams.length < 2) {
        return { team1Score: 0, team2Score: 0 };
    }

    return {
        team1Score: getTeamScore(matchTeams[0]),
        team2Score: getTeamScore(matchTeams[1]),
    };
}

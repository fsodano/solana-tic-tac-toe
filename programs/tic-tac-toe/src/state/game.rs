use anchor_lang::prelude::*;

use crate::entity::sign::Sign;
use crate::entity::Status;
use crate::entity::Status::{FinishedAndClaimed, FinishedNotClaimed, NotStarted, Started};

#[account]
pub struct Game {
    // 32
    player_one: Pubkey,
    // 32
    player_two: Pubkey,
    // 1
    turn: bool,
    // 9 * (1 + 1) = 18
    board: [[Option<Sign>; 3]; 3],
    // 1 + 1 = 2
    status: Status,
    // 1 + 32 = 33
    winner: Option<Pubkey>,
    // 2
    sequence: u16,
}

impl Game {
    pub const MAXIMUM_SIZE: usize = 120;

    pub fn start(&mut self, player_one: Pubkey, player_two: Pubkey, sequence: u16) -> Result<()> {
        require!(self.status.eq(&NotStarted), GameError::AlreadyActive);
        self.status = Started;
        self.player_one = player_one;
        self.player_two = player_two;
        self.turn = false;
        self.sequence = sequence;
        Ok(())
    }

    pub fn play(&mut self, player: Pubkey, row: u8, col: u8) -> Result<()> {
        require!(self.status.eq(&Started), GameError::Inactive);
        require_gte!(self.board.len() - 1, row as usize, GameError::InvalidRow);
        require_gte!(self.board[row as usize].len() - 1, col as usize, GameError::InvalidColumn);
        require!(self.board[row as usize][col as usize].is_none(),GameError::TileTaken);

        match self.turn {
            false => require_eq!(player, self.player_one, GameError::NotYourTurn),
            true => require_eq!(player, self.player_two, GameError::NotYourTurn)
        };

        let sign = if self.player_one.key().eq(&player) { Sign::X } else { Sign::O };
        self.board[row as usize][col as usize] = Some(sign);

        if self.has_won(sign) {
            self.status = FinishedNotClaimed;
            self.winner = Some(player);
        } else {
            let total_plays: u8 = self.board.into_iter().flatten().map(|tile| -> u8 { if tile.is_some() { 1 } else { 0 } }).sum();
            if total_plays == 9 {
                self.status = FinishedNotClaimed;
            } else {
                self.turn = !self.turn;
            }
        }

        Ok(())
    }

    pub fn get_winner(&mut self) -> Option<Pubkey> {
        self.winner
    }

    pub fn get_status(&mut self) -> Status {
        self.status
    }

    pub fn set_claimed(&mut self) -> () {
        self.status = FinishedAndClaimed;
        ()
    }


    fn has_won(&self, sign: Sign) -> bool {
        for i in 0..=2 {
            let mut horizontal_sum = 0;
            let mut vertical_sum = 0;

            for j in 0..=2 {
                horizontal_sum += u8::from(self.board[i][j].eq(&Some(sign)));
                vertical_sum += u8::from(self.board[j][i].eq(&Some(sign)));

                if horizontal_sum == 3 || vertical_sum == 3 {
                    return true;
                }
            }
        }

        let sign_distribution: Vec<u8> = self.board
            .into_iter()
            .flatten()
            .map(|s| -> u8 {
                u8::from(s.eq(&Some(sign)))
            }).collect();

        let left_to_right_diagonal_sum = sign_distribution[0] + sign_distribution[4] + sign_distribution[8];
        if left_to_right_diagonal_sum == 3 {
            return true;
        }

        let right_to_left_diagonal_sum = sign_distribution[2] + sign_distribution[4] + sign_distribution[6];
        if right_to_left_diagonal_sum == 3 {
            return true;
        }

        false
    }
}

#[error_code]
#[derive(PartialEq, Eq)]
pub enum GameError {
    #[msg("Out of bounds, invalid row")]
    InvalidRow,
    #[msg("Out of bounds, invalid column")]
    InvalidColumn,
    #[msg("This tile is already taken")]
    TileTaken,
    #[msg("Not this player's turn")]
    NotYourTurn,
    #[msg("This game is not active")]
    Inactive,
    #[msg("This game is already active")]
    AlreadyActive,
}


#[cfg(test)]
mod tests {
    use anchor_lang::prelude::Pubkey;

    use crate::entity::Status::{FinishedNotClaimed, NotStarted};
    use crate::state::Game;

    fn create_game(player_one: Pubkey, player_two: Pubkey) -> Game {
        Game {
            player_one,
            player_two,
            turn: false,
            winner: None,
            status: NotStarted,
            board: [[None; 3]; 3],
            sequence: 1,
        }
    }

    #[test]
    fn test_winning_combinations() {
        let player_one = Pubkey::new_unique(); // X
        let player_two = Pubkey::new_unique(); // O

        struct Play {
            winner: Option<Pubkey>,
            tiles: Vec<[u8; 2]>,
        }

        let winning_plays = [
            // [X][O][O]
            // [ ][X][ ]
            // [ ][ ][X]
            Play {
                winner: Some(player_one),
                tiles: Vec::from([[0, 0], [0, 1], [1, 1], [0, 2], [2, 2]]),
            },

            // [O][O][X]
            // [ ][X][ ]
            // [X][ ][ ]
            Play {
                winner: Some(player_one),
                tiles: Vec::from([[0, 2], [0, 1], [1, 1], [0, 0], [2, 0]]),
            },

            // [O][O][ ]
            // [ ][ ][ ]
            // [X][X][X]
            Play {
                winner: Some(player_one),
                tiles: Vec::from([[2, 0], [0, 0], [2, 1], [0, 1], [2, 2]]),
            },

            // [O][O][X]
            // [ ][ ][X]
            // [ ][ ][X]
            Play {
                winner: Some(player_one),
                tiles: Vec::from([[0, 2], [0, 0], [1, 2], [0, 1], [2, 2]]),
            },
            // [X][O][O]
            // [O][X][X]
            // [X][X][O]
            Play {
                winner: None,
                tiles: Vec::from([[0, 0], [0, 1], [1, 1], [2, 2], [1, 2], [1, 0], [2, 0], [0, 2], [2, 1]]),
            },
            // [ ][ ][O]
            // [ ][X][O]
            // [X][X][O]
            Play {
                winner: Some(player_two),
                tiles: Vec::from([[1, 1], [0, 2], [2, 0], [1, 2], [2, 1], [2, 2]]),
            },
        ];

        winning_plays.into_iter().for_each(|winning_play| -> () {
            let mut game = create_game(player_one, player_two);
            let mut current_player = player_one;
            for play in winning_play.tiles {
                game.play(current_player, play[0], play[1]).unwrap();
                current_player = if current_player.eq(&player_one) { player_two } else { player_one };
            }

            assert_eq!(game.status, FinishedNotClaimed);
            assert_eq!(game.winner, winning_play.winner)
        });
    }

    #[test]
    #[should_panic(expected = "error_name: \"NotYourTurn\"")]
    fn test_invalid_turn() {
        let player_one = Pubkey::new_unique(); // X
        let player_two = Pubkey::new_unique(); // O

        let mut game = create_game(player_one, player_two);
        game.play(player_two, 0, 0).unwrap();
    }

    #[test]
    #[should_panic(expected = "error_name: \"TileTaken\"")]
    fn test_tile_already_taken() {
        let player_one = Pubkey::new_unique(); // X
        let player_two = Pubkey::new_unique(); // O

        let mut game = create_game(player_one, player_two);
        game.play(player_one, 0, 0).unwrap();
        game.play(player_two, 0, 0).unwrap();
    }

    #[test]
    #[should_panic(expected = "error_name: \"InvalidRow\"")]
    fn test_row_out_of_bounds() {
        let player_one = Pubkey::new_unique(); // X
        let player_two = Pubkey::new_unique(); // O

        let mut game = create_game(player_one, player_two);
        game.play(player_one, 3, 0).unwrap();
    }

    #[test]
    #[should_panic(expected = "error_name: \"InvalidColumn\"")]
    fn test_column_out_of_bounds() {
        let player_one = Pubkey::new_unique(); // X
        let player_two = Pubkey::new_unique(); // O

        let mut game = create_game(player_one, player_two);
        game.play(player_one, 0, 3).unwrap();
    }

    #[test]
    #[should_panic(expected = "error_name: \"AlreadyActive\"")]
    fn test_cant_start_active_game() {
        let player_one = Pubkey::new_unique(); // X
        let player_two = Pubkey::new_unique(); // O

        let mut game = create_game(player_one, player_two);
        game.start(player_one, player_two, 1).unwrap();
    }

    #[test]
    #[should_panic(expected = "error_name: \"Inactive\"")]
    fn test_cant_play_inactive_game() {
        let player_one = Pubkey::new_unique(); // X
        let player_two = Pubkey::new_unique(); // O

        let mut game = create_game(player_one, player_two);
        game.status = NotStarted;
        game.play(player_one, 0, 0).unwrap();
    }
}

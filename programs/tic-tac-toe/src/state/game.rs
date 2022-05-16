use anchor_lang::prelude::*;

use crate::entity::sign::Sign;

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
    // 1
    is_active: bool,
    // 1 + 32 = 33
    winner: Option<Pubkey>,
}

impl Game {
    pub const MAXIMUM_SIZE: usize = 117;

    pub fn start(&mut self, player_one: Pubkey, player_two: Pubkey) -> Result<()> {
        require_eq!(self.is_active, false);
        self.is_active = true;
        self.player_one = player_one;
        self.player_two = player_two;
        self.turn = false;
        Ok(())
    }

    pub fn play(&mut self, player: Pubkey, row: u8, col: u8) -> Result<()> {
        msg!(&row.to_string());
        msg!(&col.to_string());
        require_eq!(self.is_active, true);
        require_gte!(self.board.len() - 1, row as usize, GameError::InvalidRow);
        require_gte!(self.board[row as usize].len() - 1, col as usize, GameError::InvalidColumn);
        require!(self.board[row as usize][col as usize].is_none(),GameError::TileTaken);

        match self.turn {
            false => require_eq!(player, self.player_one, GameError::NotYourTurn),
            true => require_eq!(player, self.player_two, GameError::NotYourTurn)
        };

        self.board[row as usize][col as usize] = Some(if self.player_one.key().eq(&player) { Sign::X } else { Sign::O });
        self.turn = !self.turn;
        Ok(())
    }
}

#[error_code]
pub enum GameError {
    #[msg("Out of bounds, invalid row")]
    InvalidRow,
    #[msg("Out of bounds, invalid column")]
    InvalidColumn,
    #[msg("This tile is already taken")]
    TileTaken,
    #[msg("Not this player's  turn")]
    NotYourTurn,
}
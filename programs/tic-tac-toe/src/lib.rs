use anchor_lang::prelude::*;

use crate::instructions::play::*;
use crate::instructions::setup_game::*;

mod instructions;
mod state;
mod entity;

declare_id!("6BzuJZBHQXM5H8diTy5Pj6E91NdKfwnJ6joCf6Y6RnXp");

#[program]
pub mod tic_tac_toe {
    use super::*;

    pub fn setup_game(ctx: Context<SetupGameInstruction>) -> Result<()> {
        ctx.accounts.game_account.start(ctx.accounts.player_one.key(), ctx.accounts.player_two.key())
    }

    pub fn play(ctx: Context<PlayInstruction>, row: u8, col: u8) -> Result<()> {
        ctx.accounts.game_account.play(ctx.accounts.player.key(), row, col)
    }
}


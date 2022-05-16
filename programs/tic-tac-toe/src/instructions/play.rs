use anchor_lang::prelude::*;

use crate::state::game::Game;

#[derive(Accounts)]
pub struct PlayInstruction<'info> {
    #[account(mut)]
    pub game_account: Account<'info, Game>,
    #[account()]
    pub player: Signer<'info>,
}

use anchor_lang::prelude::*;

use crate::state::game::Game;

#[derive(Accounts)]
pub struct SetupGameInstruction<'info> {
    #[account(init, payer = player_one, space = Game::MAXIMUM_SIZE + 8)]
    pub game_account: Account<'info, Game>,
    #[account(mut)]
    pub player_one: Signer<'info>,
    #[account()]
    pub player_two: Signer<'info>,
    pub system_program: Program<'info, System>,
}

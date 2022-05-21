use anchor_lang::prelude::*;

use crate::state::game::Game;

#[derive(Accounts)]
#[instruction(game_number: u16)]
// This PDA will support up to 2^16 plays between 2 players
// &[(game_number >> 8) as u8, (game_number & 0xff) as u8] => split game_number into an array of u8
// see https://stackoverflow.com/questions/70542217/how-do-i-split-a-16-bit-value-into-two-8-bit-values
pub struct SetupGameInstruction<'info> {
    #[account(
    init,
    payer = player_one,
    seeds = [b"game".as_ref(), player_one.key.as_ref(), player_two.key.as_ref(), &[(game_number >> 8) as u8, (game_number & 0xff) as u8]],
    bump,
    space = Game::MAXIMUM_SIZE + 8
    )]
    pub game_account: Account<'info, Game>,
    #[account(mut)]
    pub player_one: Signer<'info>,
    #[account()]
    pub player_two: Signer<'info>,
    pub system_program: Program<'info, System>,
}

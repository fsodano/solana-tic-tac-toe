use anchor_lang::prelude::*;
use anchor_spl::{
    token::{Mint, Token},
};

#[derive(Accounts)]
pub struct SetupMintOnceInstruction<'info> {
    #[account(
    init_if_needed,
    payer = payer,
    seeds = [b"tic-tac-toe".as_ref()],
    bump,
    mint::decimals = 7,
    mint::authority = mint
    )]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

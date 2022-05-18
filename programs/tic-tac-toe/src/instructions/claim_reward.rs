use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

#[derive(Accounts)]
pub struct ClaimRewardInstruction<'info> {
    #[account(
    init_if_needed,
    payer = payer,
    seeds = [b"tic-tac-toe".as_ref()],
    bump,
    mint::decimals = 7,
    mint::authority = mint
    )]
    pub mint: Account<'info, Mint>,
    #[account(
    init_if_needed,
    payer = payer,
    associated_token::mint = mint,
    associated_token::authority = payer
    )]
    pub destination: Account<'info, TokenAccount>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}
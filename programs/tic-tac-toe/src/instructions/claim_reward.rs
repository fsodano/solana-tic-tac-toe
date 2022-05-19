use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

#[derive(Accounts)]
pub struct ClaimRewardInstruction<'info> {
    #[account(
    init_if_needed,
    payer = receiver,
    associated_token::mint = mint,
    associated_token::authority = receiver
    )]
    pub destination: Account<'info, TokenAccount>,
    #[account(mut)]
    pub receiver: Signer<'info>,
    #[account()]
    pub mint: Account<'info, Mint>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
use anchor_lang::prelude::*;

use crate::instructions::claim_reward::*;
use crate::instructions::play::*;
use crate::instructions::setup_game::*;
use crate::instructions::setup_mint_once::*;

mod instructions;
mod state;
mod entity;

declare_id!("6BzuJZBHQXM5H8diTy5Pj6E91NdKfwnJ6joCf6Y6RnXp");

#[program]
pub mod tic_tac_toe {
    use super::*;

    pub fn setup_mint(_ctx: Context<SetupMintOnceInstruction>) -> Result<()> {
        Ok(())
    }

    pub fn setup_game(ctx: Context<SetupGameInstruction>, game_number: u16) -> Result<()> {
        msg!(game_number);
        msg!(&ctx.bumps.get("game_account").unwrap().to_string());
        ctx.accounts.game_account.start(ctx.accounts.player_one.key(), ctx.accounts.player_two.key(), game_number)
    }

    pub fn play(ctx: Context<PlayInstruction>, row: u8, col: u8) -> Result<()> {
        ctx.accounts.game_account.play(ctx.accounts.player.key(), row, col)
    }

    pub fn claim_reward(ctx: Context<ClaimRewardInstruction>) -> Result<()> {
        anchor_spl::token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.destination.to_account_info(),
                    authority: ctx.accounts.mint.to_account_info(),
                },
                &[&[&"tic-tac-toe".as_bytes(), &[*ctx.bumps.get("mint").unwrap()]]],
            ),
            1 * 10_000_000,
        )?;
        Ok(())
    }
}


# Solana tic-tac-toe

This is a sample implementation of a Solana program to play Tic Tac Toe.

## Rules

* The program owner calls the `setup_mint_once` instruction to create a mint PDA.
* Player one is the one that calls `setup_game` instruction which creates a game PDA.
* Player one starts and always plays with `X`
* Player two always plays with `O`
* No invalid plays (out of bounds, out of turn, already taken tile)
* A tie is possible
* If there is a winner, they can claim a token from the mint.

## Instructions

### setup_mint_once
```rust
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
```


### Setup mint


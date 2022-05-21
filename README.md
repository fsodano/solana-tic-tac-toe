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

Sets up the mint that will pay out the reward token. This instruction is meant to be executed only once.

```rust
#[derive(Accounts)]
pub struct SetupMintOnceInstruction<'info> {
    #[account(
    init,
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

### setup_game

Sets up a game between two players. It'll support 65_536 games between the same two players.

```rust
#[derive(Accounts)]
#[instruction(game_number: u16)]
// This PDA will support up to 2^16 plays between 2 players
pub struct SetupGameInstruction<'info> {
    #[account(
    init,
    payer = player_one,
    seeds = [b"game".as_ref(), player_one.key.as_ref(), player_two.key.as_ref(), & [(game_number >> 8) as u8, (game_number & 0xff) as u8]],
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
```

### play

Records a play between two players with the relevant validation. The player determines which sign they get (player one
is always `X` and player two is always `O`)

```rust
#[derive(Accounts)]
pub struct PlayInstruction<'info> {
    #[account(mut)]
    pub game_account: Account<'info, Game>,
    pub player: Signer<'info>,
}
```

### claim_reward

Once the game is finished, if there is a winner, then they may call this instruction (only once) to get their reward.

```rust
#[derive(Accounts)]
pub struct ClaimRewardInstruction<'info> {
    #[account(
    init_if_needed,
    payer = receiver,
    associated_token::mint = mint,
    associated_token::authority = receiver
    )]
    pub destination: Account<'info, TokenAccount>,
    #[account()]
    pub game_account: Account<'info, Game>,
    #[account(mut)]
    pub receiver: Signer<'info>,
    #[account(
    mut,
    seeds = [b"tic-tac-toe".as_ref()],
    bump,
    )]
    pub mint: Account<'info, Mint>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
```
use anchor_lang::prelude::*;

#[derive(AnchorSerialize,
AnchorDeserialize,
Copy,
Clone,
PartialEq,
Eq)]
pub enum Status {
    NotStarted,
    Started,
    FinishedNotClaimed,
    FinishedAndClaimed,
}

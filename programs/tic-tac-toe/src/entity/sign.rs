use anchor_lang::prelude::*;

#[derive(AnchorSerialize,
AnchorDeserialize,
Copy,
Clone,
PartialEq,
Eq)]
pub enum Sign {
    X,
    O,
}

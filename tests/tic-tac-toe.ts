import * as anchor from "@project-serum/anchor";
import {AnchorError, Program} from "@project-serum/anchor";
import {TicTacToe} from "../target/types/tic_tac_toe";
import {expect} from "chai";
import {ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, TOKEN_PROGRAM_ID} from "@solana/spl-token";

const {SystemProgram} = anchor.web3;

describe("tic-tac-toe operation", async () => {
    try {
        const provider = anchor.AnchorProvider.env();
        anchor.setProvider(provider);

        const program = anchor.workspace.TicTacToe as Program<TicTacToe>;
        // const seed = Uint8Array.from([112, 202, 158, 133, 22, 221, 138, 146, 45, 135, 216, 70, 56, 49, 14, 181, 249, 146, 20, 156, 40, 247, 210, 31, 36, 41, 6, 200, 153, 12, 144, 128, 88, 1, 129, 167, 39, 219, 136, 149, 190, 47, 53, 110, 29, 206, 220, 151, 183, 124, 201, 101, 143, 48, 207, 96, 67, 124, 124, 232, 222, 186, 39, 109]).slice(0, 32);
        const programOwner = provider.wallet;
        const playerOne = anchor.web3.Keypair.generate();
        const playerTwo = anchor.web3.Keypair.generate();
        const [mintPda] = await anchor.web3.PublicKey.findProgramAddress([Buffer.from(anchor.utils.bytes.utf8.encode("tic-tac-toe"))], program.programId);
        describe("one time game setup", async () => {

                it("funds the accounts that act as payers", async () => {
                    await provider.connection.requestAirdrop(programOwner.publicKey, 2 * 1_000_000_000);
                    await provider.connection.requestAirdrop(program.programId, 2 * 1_000_000_000);
                    await provider.connection.requestAirdrop(playerOne.publicKey, 2 * 1_000_000_000);
                    await provider.connection.requestAirdrop(playerTwo.publicKey, 2 * 1_000_000_000);
                });

                it("sets up the mint to pay the custom token", async () => {
                    try {
                        await program.methods.setupMint()
                            .accounts({
                                payer: programOwner.publicKey,
                                mint: mintPda,
                                tokenProgram: TOKEN_PROGRAM_ID,
                                systemProgram: SystemProgram.programId,
                                rent: anchor.web3.SYSVAR_RENT_PUBKEY
                            })
                            .rpc();

                        console.log('mint PDA address: ', mintPda.toString());
                    } catch (e) {
                        console.log(e);
                        throw e;
                    }
                });
            }
        );

        describe("play a new game", async () => {
            let board;
            const randomGameNumber = Math.floor(Math.random() * 65536);
            const [gameAccount, nonce] = await anchor.web3.PublicKey.findProgramAddress(
                [
                    Buffer.from(anchor.utils.bytes.utf8.encode("game")),
                    playerOne.publicKey.toBuffer(),
                    playerTwo.publicKey.toBuffer(),
                    new anchor.BN(randomGameNumber).toBuffer(null, 2)
                ], program.programId
            );

            describe("board setup", async () => {
                console.log("derived game account pda", gameAccount.toString(), 'nonce', nonce, randomGameNumber);

                it("sets up the board", async () => {
                    await program.methods.setupGame(randomGameNumber)
                        .accounts({
                            gameAccount,
                            playerOne: playerOne.publicKey,
                            playerTwo: playerTwo.publicKey,
                            systemProgram: SystemProgram.programId,
                        })
                        .signers([playerOne, playerTwo])
                        .rpc();
                });


                it("fails to set up the board again", async () => {
                    try {
                        await program.methods.setupGame(randomGameNumber)
                            .accounts({
                                gameAccount,
                                playerOne: playerOne.publicKey,
                                playerTwo: playerTwo.publicKey,
                                systemProgram: SystemProgram.programId,
                            })
                            .signers([playerOne, playerTwo])
                            .rpc();
                    } catch (e) {
                        const joinedLogs = e.logs.join();
                        expect(joinedLogs).to.contain(gameAccount.toString());
                        expect(joinedLogs).to.contain("already in use");
                    }
                });
            });

            describe("players start the game", () => {
                describe("invalid operations at the beginning of the game", () => {
                    const INVALID_ROW = 3;
                    const INVALID_COL = 3;
                    const ROW = 1;
                    const MAX_ROW = 2;
                    const MAX_COL = 2;

                    it("fails to play with an invalid row", async () => {
                        try {
                            const COL = 1;
                            await program.methods.play(INVALID_ROW, COL)
                                .accounts({
                                    gameAccount,
                                    player: playerOne.publicKey,
                                })
                                .signers([playerOne,])
                                .rpc();

                            chai.assert(false, "It should have failed with an InvalidRow error but it didn't work")
                        } catch (e) {
                            expect(e).to.be.instanceOf(AnchorError);
                            const err = e as AnchorError;
                            expect(err.error.errorCode.code).to.equal("InvalidRow");
                            expect(err.error.errorCode.number).to.equal(6000);
                            expect(err.program.equals(program.programId)).is.true;
                            expect(err.error.comparedValues).to.deep.equal([MAX_ROW.toString(), INVALID_ROW.toString()]);
                        }
                    });

                    it("fails to play with an invalid column", async () => {
                        try {
                            const tx = await program.methods.play(ROW, INVALID_COL)
                                .accounts({
                                    gameAccount,
                                    player: playerOne.publicKey,
                                })
                                .signers([playerOne,])
                                .rpc();

                            console.log("Your transaction signature", tx);
                            chai.assert(false, "It should have failed with an InvalidCol error but it didn't work")
                        } catch (e) {
                            expect(e).to.be.instanceOf(AnchorError);
                            const err = e as AnchorError;
                            expect(err.error.errorCode.code).to.equal("InvalidColumn");
                            expect(err.error.errorCode.number).to.equal(6001);
                            expect(err.program.equals(program.programId)).is.true;
                            expect(err.error.comparedValues).to.deep.equal([MAX_COL.toString(), INVALID_COL.toString()]);
                        }
                    })
                })

                describe("game starts", async () => {
                    it("starts with player one", async () => {

                        // [X][ ][ ]
                        // [ ][ ][ ]
                        // [ ][ ][ ]
                        await program.methods.play(0, 0)
                            .accounts({
                                gameAccount, player: playerOne.publicKey,
                            })
                            .signers([playerOne,])
                            .rpc();
                        board = await program.account.game.fetch(gameAccount);
                        console.log(board.board);
                    });

                    it("follows with player two", async () => {
                        // [X][ ][ ]
                        // [O][ ][ ]
                        // [ ][ ][ ]
                        await program.methods.play(1, 0)
                            .accounts({
                                gameAccount, player: playerTwo.publicKey,
                            })
                            .signers([playerTwo,])
                            .rpc();

                        board = await program.account.game.fetch(gameAccount);
                        console.log(board.board);
                    });

                    it("fails to play in a taken tile", async () => {
                        try {
                            await program.methods.play(1, 0)
                                .accounts({
                                    gameAccount, player: playerOne.publicKey,
                                })
                                .signers([playerOne,])
                                .rpc();
                        } catch (e) {
                            expect(e).to.be.instanceOf(AnchorError);
                            const err = e as AnchorError;
                            expect(err.error.errorCode.code).to.equal("TileTaken");
                            expect(err.error.errorCode.number).to.equal(6002);
                            expect(err.program.equals(program.programId)).is.true;
                        }
                    });

                    it("fails if a player tries to play out of turn", async () => {
                        try {
                            await program.methods.play(2, 0)
                                .accounts({
                                    gameAccount, player: playerTwo.publicKey,
                                })
                                .signers([playerTwo,])
                                .rpc();
                        } catch (e) {
                            expect(e).to.be.instanceOf(AnchorError);
                            const err = e as AnchorError;
                            expect(err.error.errorCode.code).to.equal("NotYourTurn");
                            expect(err.error.errorCode.number).to.equal(6003);
                            expect(err.program.equals(program.programId)).is.true;
                        }
                    });

                    it("continues until player 2 wins", async () => {
                        // [X][ ][ ]
                        // [O][ ][ ]
                        // [X][ ][ ]
                        await program.methods.play(2, 0)
                            .accounts({
                                gameAccount, player: playerOne.publicKey,
                            })
                            .signers([playerOne,])
                            .rpc();

                        board = await program.account.game.fetch(gameAccount);
                        console.log(board.board);

                        // [X][ ][ ]
                        // [O][O][ ]
                        // [X][ ][ ]
                        await program.methods.play(1, 1)
                            .accounts({
                                gameAccount, player: playerTwo.publicKey,
                            })
                            .signers([playerTwo,])
                            .rpc();

                        board = await program.account.game.fetch(gameAccount);
                        console.log(board.board);

                        // [X][X][ ]
                        // [O][O][ ]
                        // [X][ ][ ]
                        await program.methods.play(0, 1)
                            .accounts({
                                gameAccount, player: playerOne.publicKey,
                            })
                            .signers([playerOne,])
                            .rpc();

                        board = await program.account.game.fetch(gameAccount);
                        console.log(board.board);

                        // [X][X][ ]
                        // [O][O][O]
                        // [X][ ][ ]
                        await program.methods.play(1, 2)
                            .accounts({
                                gameAccount, player: playerTwo.publicKey,
                            })
                            .signers([playerTwo,])
                            .rpc();

                        board = await program.account.game.fetch(gameAccount);
                        console.log(board.board);
                        expect(board.winner.toString()).to.eq(playerTwo.publicKey.toString())
                        expect(board.status).contains.keys(["finishedNotClaimed"])
                    });

                    it("cannot claim the token if its not the winner", async () => {
                        try {

                            const associatedTokenAccount = await getAssociatedTokenAddress(
                                mintPda,
                                playerOne.publicKey,
                                true,
                                TOKEN_PROGRAM_ID,
                                ASSOCIATED_TOKEN_PROGRAM_ID,
                            );

                            await program.methods.claimReward()
                                .accounts({
                                    gameAccount,
                                    receiver: playerOne.publicKey,
                                    destination: associatedTokenAccount,
                                    mint: mintPda,
                                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                                    tokenProgram: TOKEN_PROGRAM_ID,
                                    systemProgram: SystemProgram.programId,
                                    rent: anchor.web3.SYSVAR_RENT_PUBKEY
                                })
                                .signers([playerOne])
                                .rpc();
                        } catch (e) {
                            const err = e as AnchorError;
                            expect(err.error.errorCode.code).to.equal("WrongClaimant");
                            expect(err.program.equals(program.programId)).is.true;
                        }
                    });

                    it("Claims the token correctly", async () => {
                        const associatedTokenAccount = await getAssociatedTokenAddress(
                            mintPda,
                            playerTwo.publicKey,
                            true,
                            TOKEN_PROGRAM_ID,
                            ASSOCIATED_TOKEN_PROGRAM_ID,
                        );

                        await program.methods.claimReward()
                            .accounts({
                                gameAccount,
                                receiver: playerTwo.publicKey,
                                destination: associatedTokenAccount,
                                mint: mintPda,
                                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                                tokenProgram: TOKEN_PROGRAM_ID,
                                systemProgram: SystemProgram.programId,
                                rent: anchor.web3.SYSVAR_RENT_PUBKEY
                            })
                            .signers([playerTwo])
                            .rpc();
                    });

                    it("fails when trying to claim the token again", async () => {
                        try {
                            const associatedTokenAccount = await getAssociatedTokenAddress(
                                mintPda,
                                playerTwo.publicKey,
                                true,
                                TOKEN_PROGRAM_ID,
                                ASSOCIATED_TOKEN_PROGRAM_ID,
                            );

                            await program.methods.claimReward()
                                .accounts({
                                    gameAccount,
                                    receiver: playerTwo.publicKey,
                                    destination: associatedTokenAccount,
                                    mint: mintPda,
                                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                                    tokenProgram: TOKEN_PROGRAM_ID,
                                    systemProgram: SystemProgram.programId,
                                    rent: anchor.web3.SYSVAR_RENT_PUBKEY
                                })
                                .signers([playerTwo])
                                .rpc();
                        } catch (e) {
                            expect(e).to.be.instanceOf(AnchorError);
                            const err = e as AnchorError;
                            expect(err.error.errorCode.code).to.equal("WrongStatus");
                        }
                    });
                });
            })
        })
    } catch
        (e) {
        console.log(e);
        throw e;
    }
})
;

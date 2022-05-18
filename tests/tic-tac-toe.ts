import * as anchor from "@project-serum/anchor";
import {AnchorError, Program} from "@project-serum/anchor";
import {TicTacToe} from "../target/types/tic_tac_toe";
import {expect} from "chai";
import {ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, TOKEN_PROGRAM_ID} from "@solana/spl-token";

const {SystemProgram} = anchor.web3;

describe("tic-tac-toe", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.TicTacToe as Program<TicTacToe>;
    const gameAccount = anchor.web3.Keypair.generate();
    const seed = Uint8Array.from([112, 202, 158, 133, 22, 221, 138, 146, 45, 135, 216, 70, 56, 49, 14, 181, 249, 146, 20, 156, 40, 247, 210, 31, 36, 41, 6, 200, 153, 12, 144, 128, 88, 1, 129, 167, 39, 219, 136, 149, 190, 47, 53, 110, 29, 206, 220, 151, 183, 124, 201, 101, 143, 48, 207, 96, 67, 124, 124, 232, 222, 186, 39, 109]).slice(0, 32);
    const playerOne = anchor.web3.Keypair.fromSeed(seed);
    const playerTwo = anchor.web3.Keypair.generate();

    it("should play the game", async () => {
        let board;

        await program.methods.setupGame()
            .accounts({
                gameAccount: gameAccount.publicKey,
                playerOne: playerOne.publicKey,
                playerTwo: playerTwo.publicKey,
                systemProgram: SystemProgram.programId
            })
            .signers([gameAccount, playerOne, playerTwo])
            .rpc();

        const INVALID_ROW = 3;
        const INVALID_COL = 3;

        try {
            const COL = 1;
            await program.methods.play(INVALID_ROW, COL)
                .accounts({
                    gameAccount: gameAccount.publicKey, player: playerOne.publicKey,
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
            expect(err.error.comparedValues).to.deep.equal(["2", INVALID_ROW.toString()]);
        }

        try {
            const ROW = 1;
            const tx = await program.methods.play(ROW, INVALID_COL)
                .accounts({
                    gameAccount: gameAccount.publicKey, player: playerOne.publicKey,
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
            expect(err.error.comparedValues).to.deep.equal(["2", INVALID_COL.toString()]);
        }

        // [X][ ][ ]
        // [ ][ ][ ]
        // [ ][ ][ ]
        await program.methods.play(0, 0)
            .accounts({
                gameAccount: gameAccount.publicKey, player: playerOne.publicKey,
            })
            .signers([playerOne,])
            .rpc();
        board = await program.account.game.fetch(gameAccount.publicKey);
        console.log(board.board);

        // [X][ ][ ]
        // [O][ ][ ]
        // [ ][ ][ ]
        await program.methods.play(1, 0)
            .accounts({
                gameAccount: gameAccount.publicKey, player: playerTwo.publicKey,
            })
            .signers([playerTwo,])
            .rpc();

        board = await program.account.game.fetch(gameAccount.publicKey);
        console.log(board.board);

        try {
            await program.methods.play(1, 0)
                .accounts({
                    gameAccount: gameAccount.publicKey, player: playerOne.publicKey,
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

        try {
            await program.methods.play(2, 0)
                .accounts({
                    gameAccount: gameAccount.publicKey, player: playerTwo.publicKey,
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

        // [X][ ][ ]
        // [O][ ][ ]
        // [X][ ][ ]
        await program.methods.play(2, 0)
            .accounts({
                gameAccount: gameAccount.publicKey, player: playerOne.publicKey,
            })
            .signers([playerOne,])
            .rpc();

        board = await program.account.game.fetch(gameAccount.publicKey);
        console.log(board.board);

        // Get the PDA that is the mint for the faucet
        const [mintPda] = await anchor.web3.PublicKey.findProgramAddress(
            [Buffer.from(anchor.utils.bytes.utf8.encode("tic-tac-toe"))],
            program.programId
        );

        const associatedTokenAccount = await getAssociatedTokenAddress(
            mintPda,
            playerOne.publicKey,
            true,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID,
        );

        await program.methods.claimReward()
            .accounts({
                destination: associatedTokenAccount,
                payer: playerOne.publicKey,
                mint: mintPda,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY
            })
            .signers([playerOne])
            .rpc();

        console.log(associatedTokenAccount.toString());
        console.log(playerOne.publicKey.toString());
    });
});

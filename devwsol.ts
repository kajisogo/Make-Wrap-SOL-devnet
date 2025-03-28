import {
    PublicKey, Keypair, Connection, Transaction, ComputeBudgetProgram,
    sendAndConfirmTransaction, VersionedTransaction, TransactionMessage,
    TransactionInstruction, SystemProgram,
} from "@solana/web3.js";
import {
    NATIVE_MINT, TOKEN_PROGRAM_ID, createTransferCheckedInstruction,
    createAssociatedTokenAccountIdempotentInstruction,
    createCloseAccountInstruction, getAssociatedTokenAddress, getMint, getMinimumBalanceForRentExemptAccount,
    createSyncNativeInstruction
} from "@solana/spl-token";
import base58 from "bs58";


const mainKpStr = "KgnfNKt3soPdaR8ig1RTddd1WTUupTPDY8UxcGR1qBeBYnouyE6Ejvqja8QBjmtsfDiJeSug6kFrrJ2ZQ5ukHnd";
const rpcUrl = "https://devnet.helius-rpc.com/?";
const mainKp = Keypair.fromSecretKey(base58.decode(mainKpStr));
const connection = new Connection(rpcUrl, { commitment: "processed" });
/**
 * Wraps the given amount of SOL into WSOL.
 * @param {Keypair} mainKp - The central keypair which holds SOL.
 * @param {number} wsolAmount - The amount of SOL to wrap.
 */


export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const wrapSol = async (mainKp: Keypair, wsolAmount: number) => {
    try {
        const wSolAccount = await getAssociatedTokenAddress(NATIVE_MINT, mainKp.publicKey);
        const tx = new Transaction().add(
            ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 500_000 }),
            ComputeBudgetProgram.setComputeUnitLimit({ units: 51_337 }),
        );
        if (!await connection.getAccountInfo(wSolAccount))
            tx.add(
                createAssociatedTokenAccountIdempotentInstruction(
                    mainKp.publicKey,
                    wSolAccount,
                    mainKp.publicKey,
                    NATIVE_MINT,
                ),
                SystemProgram.transfer({
                    fromPubkey: mainKp.publicKey,
                    toPubkey: wSolAccount,
                    lamports: Math.floor(wsolAmount * 10 ** 9),
                }),
                createSyncNativeInstruction(wSolAccount, TOKEN_PROGRAM_ID),
            )

        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
        tx.feePayer = mainKp.publicKey
        // console.log("Wrap simulation: ", await connection.simulateTransaction(tx))
        const sig = await sendAndConfirmTransaction(connection, tx, [mainKp], { skipPreflight: true, commitment: "confirmed" });
        console.log(`Wrapped SOL transaction: https://solscan.io/tx/${sig}`);
        await sleep(5000);
    } catch (error) {
        // console.error("wrapSol error:", error);
    }
};

/**
 * Unwraps WSOL into SOL.
 * @param {Keypair} mainKp - The main keypair.
 */
const unwrapSol = async (mainKp: Keypair) => {
    const wSolAccount = await getAssociatedTokenAddress(NATIVE_MINT, mainKp.publicKey);
    try {
        const wsolAccountInfo = await connection.getAccountInfo(wSolAccount);
        if (wsolAccountInfo) {
            const tx = new Transaction().add(
                ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 500_000 }),
                ComputeBudgetProgram.setComputeUnitLimit({ units: 101337 }),
                createCloseAccountInstruction(
                    wSolAccount,
                    mainKp.publicKey,
                    mainKp.publicKey,
                ),
            );
            tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
            tx.feePayer = mainKp.publicKey
            const sig = await sendAndConfirmTransaction(connection, tx, [mainKp], { skipPreflight: true, commitment: "confirmed" });
            console.log(`Unwrapped SOL transaction: https://solscan.io/tx/${sig}`);
            await sleep(5000);
        }
    } catch (error) {
    }
};


// You can run the wrapSOL function to wrap some sol in central wallet for any reasone
wrapSol(mainKp, 0.01)

// unWrapSOl function to unwrap all WSOL in central wallet that is in the wallet
unwrapSol(mainKp)
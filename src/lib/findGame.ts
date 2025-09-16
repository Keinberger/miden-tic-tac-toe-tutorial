import { AccountId, Felt, WebClient, Word } from "@demox-labs/miden-sdk";
import { NODE_URL, TIC_TAC_TOE_CONTRACT_ID } from "./constants";

// lib/findGame.ts
export async function findGame(
  connectedWalletIdString: string,
  nonce: number
): Promise<boolean> {
  try {
    // Convert string IDs to AccountId objects
    const gameAccountId = AccountId.fromHex(TIC_TAC_TOE_CONTRACT_ID);
    const connectedWalletId = AccountId.fromHex(connectedWalletIdString);

    // Create client instance
    const client = await WebClient.createClient(NODE_URL);
    await client.syncState();

    console.log("Connected wallet ID:", connectedWalletId);

    // Get the game account to access its storage
    let gameAccount = await client.getAccount(gameAccountId);
    if (!gameAccount) {
      await client.importAccountById(gameAccountId);
      await client.syncState();
      gameAccount = await client.getAccount(gameAccountId);
      if (!gameAccount) {
        throw new Error(`Account not found after import: ${gameAccountId}`);
      }
    }

    // Check storage slots 1 and 2 for player1 and player2 account IDs
    const storage = gameAccount.storage();

    const nonceWord = Word.newFromFelts([
      new Felt(BigInt(0)),
      new Felt(BigInt(0)),
      new Felt(BigInt(0)),
      new Felt(BigInt(nonce)),
    ]);

    // Storage slot 1: player1 account ID
    const playerIdsSlot = storage.getMapItem(1, nonceWord);

    console.log("before connected id");

    const connectedIdPrefix = connectedWalletId.prefix();
    const connectedIdSuffix = connectedWalletId.suffix();

    // 0, 0, prefix, suffix (reversed)
    if (playerIdsSlot !== undefined) {
      const felts = playerIdsSlot.toFelts();

      console.log("Felts: ", felts);

      const player1IdPrefixFelt = felts[3];
      const player1IdSuffixFelt = felts[2];
      const player2IdPrefixFelt = felts[1];
      const player2IdSuffixFelt = felts[0];

      console.log(player1IdPrefixFelt.asInt(), player1IdSuffixFelt.asInt());
      console.log(connectedIdPrefix.asInt(), connectedIdSuffix.asInt());

      if (
        player1IdPrefixFelt.asInt() === connectedIdPrefix.asInt() &&
        player1IdSuffixFelt.asInt() === connectedIdSuffix.asInt()
      ) {
        return true;
      } else if (
        player2IdPrefixFelt.asInt() === connectedIdPrefix.asInt() &&
        player2IdSuffixFelt.asInt() === connectedIdSuffix.asInt()
      ) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error("Failed to find game:", error);
    return false;
  }
}

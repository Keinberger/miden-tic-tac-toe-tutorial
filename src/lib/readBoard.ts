import { AccountId, Word } from "@demox-labs/miden-sdk";
import {
  PLAYER1_VALUES_MAPPING_SLOT,
  PLAYER2_VALUES_MAPPING_SLOT,
  TIC_TAC_TOE_CONTRACT_ID,
} from "./constants";
import {
  getAccount,
  getNonceWord,
  instantiateClient,
  convertContractIndexToBoardIndex,
} from "./utils";

export async function readBoard(
  nonce: number
): Promise<{ player1Values: number[]; player2Values: number[] }> {
  const gameAccountId = AccountId.fromHex(TIC_TAC_TOE_CONTRACT_ID);
  // Create client instance
  const client = await instantiateClient({
    accountsToImport: [],
  });
  await client.syncState();

  // Get the game account to access its storage
  const gameAccount = await getAccount(client, gameAccountId);
  if (!gameAccount) {
    throw new Error(`Account not found after import: ${gameAccountId}`);
  }

  const nonceWord = getNonceWord(nonce);

  let player1ValuesMapping: Word | undefined;
  try {
    player1ValuesMapping = gameAccount
      .storage()
      .getMapItem(PLAYER1_VALUES_MAPPING_SLOT, nonceWord);
  } catch {
    console.warn("Player 1 values mapping not found");
  }

  let player2ValuesMapping: Word | undefined;
  try {
    player2ValuesMapping = gameAccount
      .storage()
      .getMapItem(PLAYER2_VALUES_MAPPING_SLOT, nonceWord);
  } catch {
    console.warn("Player 2 values mapping not found");
  }

  const player1Values = player1ValuesMapping
    ? mappingValuesToIndexes(player1ValuesMapping)
    : [];
  const player2Values = player2ValuesMapping
    ? mappingValuesToIndexes(player2ValuesMapping)
    : [];

  return { player1Values, player2Values };
}

function mappingValuesToIndexes(mappingWord: Word): number[] {
  const felts = mappingWord.toFelts();
  return felts
    .map((felt) => felt.asInt())
    .filter((value) => value !== 0n)
    .map((value) => convertContractIndexToBoardIndex(Number(value)));
}

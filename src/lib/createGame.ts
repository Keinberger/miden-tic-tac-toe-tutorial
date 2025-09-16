import {
  AssemblerUtils,
  TransactionKernel,
  NoteInputs,
  NoteMetadata,
  FeltArray,
  NoteAssets,
  Felt,
  Word,
  NoteTag,
  NoteType,
  NoteExecutionMode,
  NoteExecutionHint,
  NoteRecipient,
  Note,
  OutputNote,
  OutputNotesArray,
  TransactionRequestBuilder,
  AccountInterface,
  NetworkId,
  AccountId,
  Address,
} from "@demox-labs/miden-sdk";
import {
  type MidenTransaction,
  TransactionType,
  CustomTransaction,
} from "@demox-labs/miden-wallet-adapter";

import gameContractCode from "./contracts/tic_tac_toe_code";
import createGameNoteCode from "./notes/create_game_note_code";
import { instantiateClient } from "./utils";
import { TIC_TAC_TOE_CONTRACT_ID } from "./constants";

// lib/createGame.ts
export async function createGame(
  player2IdString: string,
  connectedWalletIdString: string,
  requestTransaction: (transaction: MidenTransaction) => Promise<string>
): Promise<{ nonce: number; txIx: string }> {
  if (typeof window === "undefined") {
    console.warn("webClient() can only run in the browser");
    return { nonce: 0, txIx: "" };
  }

  // Create client instance
  const client = await instantiateClient({
    accountsToImport: [],
  });

  const connectedWalletId = Address.fromBech32(
    connectedWalletIdString
  ).accountId();
  const player2Id = Address.fromBech32(player2IdString).accountId();

  // Building the tic tac toe contract
  let assembler = TransactionKernel.assembler();

  const gameContractId = AccountId.fromHex(TIC_TAC_TOE_CONTRACT_ID);

  // Reading the public state of the tic tac toe contract from testnet,
  // and importing it into the WebClient
  let gameContractAccount = await client.getAccount(gameContractId);
  if (!gameContractAccount) {
    await client.importAccountById(gameContractId);
    await client.syncState();
    gameContractAccount = await client.getAccount(gameContractId);
    if (!gameContractAccount) {
      throw new Error(`Account not found after import: ${gameContractId}`);
    }
  }

  // Creating the library to call the counter contract
  const gameComponentLib = AssemblerUtils.createAccountComponentLibrary(
    assembler, // assembler
    "external_contract::game_contract", // library path to call the contract
    gameContractCode // account code of the contract
  );

  assembler = assembler.withDebugMode(true).withLibrary(gameComponentLib);

  const noteScript = assembler.compileNoteScript(createGameNoteCode);

  let noteInputs = new NoteInputs(
    new FeltArray([player2Id.suffix(), player2Id.prefix()])
  );
  const randomInts = Array.from({ length: 4 }, () =>
    Math.floor(Math.random() * 100000)
  );
  let serialNumber = new Word(new BigUint64Array(randomInts.map(BigInt)));
  let recipient = new NoteRecipient(serialNumber, noteScript, noteInputs);
  let noteTag = NoteTag.fromAccountId(gameContractAccount.id());
  let metadata = new NoteMetadata(
    connectedWalletId,
    NoteType.Public,
    noteTag,
    NoteExecutionHint.always(),
    new Felt(BigInt(0))
  );
  let makeMoveNote = new Note(new NoteAssets([]), metadata, recipient);

  let noteRequest = new TransactionRequestBuilder()
    .withOwnOutputNotes(new OutputNotesArray([OutputNote.full(makeMoveNote)]))
    .build();

  const requestBytes = noteRequest.serialize();
  // console.log("requestBytes", Buffer.from(requestBytes).toString("base64"));

  const tx = new CustomTransaction(connectedWalletIdString, noteRequest);

  const txId = await requestTransaction({
    type: TransactionType.Custom,
    payload: tx,
  });

  await client.syncState();

  // Get new nonce
  const nonceStorage = gameContractAccount.storage().getItem(1)?.toU64s();
  console.log(nonceStorage);

  // Return the game contract account ID
  return { nonce: 1, txIx: txId };
}

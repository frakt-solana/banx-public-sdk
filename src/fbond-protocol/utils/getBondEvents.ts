import { web3 } from '@project-serum/anchor';
import { BondEventType } from '../types';
import { BOND_DECIMAL_DELTA } from './cartManagerV2';

export const getBondEvents = async ({
  programId,
  fromThisSignature,
  eventslimit,
  signaturesLimit,
  untilThisSignature,
  connection,
}: {
  programId: web3.PublicKey;
  fromThisSignature?: string;
  eventslimit?: number;
  signaturesLimit?: number;

  untilThisSignature?: string;
  connection: web3.Connection;
}) => {
  const LIMIT = !eventslimit || eventslimit > 100 ? 100 : eventslimit;
  const limitSig = !signaturesLimit ? 1e10 : signaturesLimit;
  let allSignaturesInfos: web3.ConfirmedSignatureInfo[] = [];
  const currentLastSignatureInfo = (
    await connection.getConfirmedSignaturesForAddress2(
      programId,
      {
        limit: 1,
      },
      'confirmed',
    )
  )[0];

  let currentLastSignature = fromThisSignature || currentLastSignatureInfo.signature;
  if (currentLastSignature == untilThisSignature) return [];
  let newSignatureInfosLatestToPast = await connection.getConfirmedSignaturesForAddress2(
    programId,
    {
      limit: LIMIT,
      before: currentLastSignature,
      until: untilThisSignature,
    },
    'confirmed',
  );
  if (newSignatureInfosLatestToPast.length == 0) return [];
  currentLastSignature = newSignatureInfosLatestToPast[newSignatureInfosLatestToPast.length - 1].signature;
  allSignaturesInfos = [...allSignaturesInfos, ...newSignatureInfosLatestToPast, currentLastSignatureInfo].filter(
    (signatureInfo) => !signatureInfo.err,
  );
  while (
    newSignatureInfosLatestToPast.length === LIMIT &&
    (!eventslimit || allSignaturesInfos.length >= eventslimit) &&
    allSignaturesInfos.length < limitSig
  ) {
    newSignatureInfosLatestToPast = await connection.getConfirmedSignaturesForAddress2(
      programId,
      {
        limit: LIMIT,
        before: currentLastSignature,
        until: untilThisSignature,
      },
      'confirmed',
    );
    currentLastSignature = newSignatureInfosLatestToPast[newSignatureInfosLatestToPast.length - 1].signature;

    allSignaturesInfos = [...allSignaturesInfos, ...newSignatureInfosLatestToPast].filter(
      (signatureInfo) => !signatureInfo.err,
    );
  }
  const bondTransactions: web3.ParsedTransactionWithMeta[] = await getBondTransactionsFromSignatures({
    signatures: allSignaturesInfos.map((signatureInfo) => signatureInfo.signature),
    connection,
  });
  let allBondEvents: BondEvent[] = [];

  for (let bondTxn of bondTransactions) {
    const bondEvents = await parseTransactionInfoToBondEvents({ bondTxn, connection });
    allBondEvents = [...allBondEvents, ...bondEvents];
  }

  return allBondEvents;
};

export const getBondEventsBySignatures = async ({
  signatures,
  connection,
}: {
  signatures: string[];
  connection: web3.Connection;
}): Promise<BondEvent[]> => {
  const bondTransactions: web3.ParsedTransactionWithMeta[] = await getBondTransactionsFromSignatures({
    signatures,
    connection,
  });

  let allbondEvents: BondEvent[] = [];
  for (let bondTxn of bondTransactions) {
    const bondEvents = await parseTransactionInfoToBondEvents({ bondTxn, connection });
    allbondEvents = [...allbondEvents, ...bondEvents];
  }

  return allbondEvents;
};

export const getBondTransactionsFromSignatures = async ({
  signatures,
  connection,
}: {
  signatures: string[];
  connection: web3.Connection;
}): Promise<web3.ParsedTransactionWithMeta[]> => {
  const bondTransactions: web3.ParsedTransactionWithMeta[] = [];
  for (let signature of signatures) {
    const currentTransactionInfo: web3.ParsedTransactionWithMeta | null = await connection.getParsedTransaction(
      signature,
      {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      },
    );

    if (!currentTransactionInfo || !isBondTransactionInfo(currentTransactionInfo as any)) continue;
    bondTransactions.push(currentTransactionInfo as any);
  }
  return bondTransactions;
};

const isBondTransactionInfo = (currentTransactionInfo: web3.ParsedTransactionWithMeta): boolean => {
  return currentTransactionInfo.meta?.logMessages?.find(isBondInstructionLog) !== undefined;
};

const getNumberValueFromLog = (logMessages: string[], eventLog: string) => {
  const newBorrowedSolLog = logMessages.find((log) => log.startsWith(eventLog));
  return Number(newBorrowedSolLog?.replace(eventLog, ''));
};

const parseTransactionInfoToBondEvents = async ({
  bondTxn,
  connection,
}: {
  bondTxn: web3.ParsedTransactionWithMeta;
  connection: web3.Connection;
}): Promise<BondEvent[]> => {
  const instructionLogs: string[] = bondTxn.meta?.logMessages?.reduce(
    (instructionLogs, log) => (isBondInstructionLog(log) ? [...instructionLogs, log] : instructionLogs),
    [] as string[],
  ) as any;

  const programInstructionsRaw: web3.PartiallyDecodedInstruction[] = bondTxn.transaction.message.instructions as any;
  const innerInstructions: web3.ParsedInnerInstruction[] = bondTxn.meta?.innerInstructions as any;
  const programInstructions: web3.PartiallyDecodedInstruction[] = programInstructionsRaw as any;

  let bondEvents: BondEvent[] = [];
  for (let i = 0; i < innerInstructions.length; i++) {
    const currentLog = instructionLogs[i];

    if (!isBondInstructionLog(currentLog)) continue;
    const currentSignature = bondTxn.transaction.signatures[0];

    const currentInnerInstruction = innerInstructions[i];
    const currentProgramInstruction =
      programInstructions[i].accounts.length == 0 ? programInstructions[i + 1] : programInstructions[i];

    const blockTime = bondTxn.blockTime;
    if (!BOND_TRANSACTION_PARSERS[currentLog]) continue;
    const parsedBondEvents = await BOND_TRANSACTION_PARSERS[currentLog]({
      innerInstruction: currentInnerInstruction,
      programInstruction:
        currentProgramInstruction.accounts.length == 0 ? programInstructions[i + 2] : currentProgramInstruction,
      signature: currentSignature,
      transaction: bondTxn,
      blockTime,
      connection,
    });

    if (!parsedBondEvents) continue;
    bondEvents = [...bondEvents, ...parsedBondEvents];
  }

  return bondEvents;
};

const isBondInstructionLog = (log: string) => Object.values<string>(BondInstruction).includes(log);

const isInstructionLog = (log: string) => log.startsWith('Program log: Instruction:');

export interface BondEvent {
  timestamp: number;
  signature: string;
  bondEventType: BondEventType;

  fbond: string;
  user: string;
  pair?: string;

  solAmount: number | null;
  bondsAmount: number | null;

  nft?: string;
}

enum BondInstruction {
  RepayFbondToTradeTransactions = 'Program log: Instruction: RepayFbondToTradeTransactions',
  CreateBondAndSellToOffers = 'Program log: Instruction: CreateBondAndSellToOffers',
  RefinanceToBondOffersV2 = 'Program log: Instruction: RefinanceToBondOffersV2',
  LiquidateBondOnAuction = 'Program log: Instruction: LiquidateBondOnAuction',
  ClaimNftByLenderPnft = 'Program log: Instruction: ClaimNftByLenderPnft',
}

const BOND_TRANSACTION_PARSERS = {
  [BondInstruction.RepayFbondToTradeTransactions]: async ({
    innerInstruction,
    programInstruction,
    signature,
    blockTime,
    transaction,
    connection,
  }: {
    innerInstruction: web3.ParsedInnerInstruction;
    programInstruction: web3.PartiallyDecodedInstruction;
    signature: string;
    blockTime: number;
    transaction: web3.ParsedTransactionWithMeta;

    connection: web3.Connection;
  }): Promise<BondEvent[]> => {
    const user = programInstruction.accounts[7];
    const solAmount = getTransferAmountFromInnerInstructions(innerInstruction);

    const fbond = programInstruction.accounts[1];

    return [
      {
        timestamp: blockTime,
        signature: signature,
        bondEventType: BondEventType.Repay,

        fbond: fbond ? fbond.toBase58() : '',
        user: user ? user.toBase58() : '',

        solAmount: solAmount,
        bondsAmount: solAmount / BOND_DECIMAL_DELTA,
      },
    ];
  },
  [BondInstruction.CreateBondAndSellToOffers]: async ({
    innerInstruction,
    programInstruction,
    signature,
    blockTime,
    transaction,
    connection,
  }: {
    innerInstruction: web3.ParsedInnerInstruction;
    programInstruction: web3.PartiallyDecodedInstruction;
    signature: string;
    blockTime: number;
    transaction: web3.ParsedTransactionWithMeta;

    connection: web3.Connection;
  }): Promise<BondEvent[]> => {
    const balanceChanges = transaction.meta?.preBalances.map((prebalance, index) =>
      Math.abs(prebalance - (transaction.meta?.postBalances[index] || 0)),
    );
    // const bondsAmount = Number(
    //   (innerInstruction.instructions.find((ix) => (ix as any)?.parsed?.type == 'mintTo') as any)?.parsed?.info?.amount,
    // );

    const eventCreationLogAmountOfSolBorrowed = 'Program log: Event Creation amountOfBorrowedSol: ';
    const solAmountLog = transaction.meta?.logMessages?.find((log) =>
      log.startsWith(eventCreationLogAmountOfSolBorrowed),
    );
    const solAmountFromLog = Number(solAmountLog?.replace(eventCreationLogAmountOfSolBorrowed, ''));

    const solAmount = solAmountFromLog || (balanceChanges ? balanceChanges[0] : 0);
    const eventCreationLogAmountOfBonds = 'Program log: Event Creation amountOfBondToIssue: ';
    const bondsAmountLog = transaction.meta?.logMessages?.find((log) => log.startsWith(eventCreationLogAmountOfBonds));

    const bondsAmount = Number(bondsAmountLog?.replace(eventCreationLogAmountOfBonds, ''));
    const user = programInstruction.accounts[2];
    const fbond = programInstruction.accounts[0];

    return [
      {
        timestamp: blockTime,
        signature: signature,
        bondEventType: BondEventType.Creation,

        fbond: fbond ? fbond.toBase58() : '',
        user: user ? user.toBase58() : '',

        solAmount: solAmount,
        bondsAmount: bondsAmount,
      },
    ];
  },
  [BondInstruction.RefinanceToBondOffersV2]: async ({
    innerInstruction,
    programInstruction,
    signature,
    blockTime,
    transaction,
    connection,
  }: {
    innerInstruction: web3.ParsedInnerInstruction;
    programInstruction: web3.PartiallyDecodedInstruction;
    signature: string;
    blockTime: number;
    transaction: web3.ParsedTransactionWithMeta;

    connection: web3.Connection;
  }): Promise<BondEvent[]> => {
    const user = programInstruction.accounts[7];

    const fbondRepay = programInstruction.accounts[1];

    const eventRefinanceRepayLogAmount = 'Program log: Event Refinance fbond.amount_to_return: ';

    const repayAmount = getNumberValueFromLog(transaction.meta?.logMessages || [], eventRefinanceRepayLogAmount);

    const repayEvent = {
      timestamp: blockTime,
      signature: signature,
      bondEventType: BondEventType.Repay,
      fbond: fbondRepay ? fbondRepay.toBase58() : '',
      user: user ? user.toBase58() : '',
      solAmount: repayAmount,
      bondsAmount: repayAmount / BOND_DECIMAL_DELTA || 0,
    };

    const fbondCreate = programInstruction.accounts[11];

    const eventRefinanceNewBorrowedSol = 'Program log: Event Refinance new_borrowed_sol_sum: ';
    const newBorrowedSol = getNumberValueFromLog(transaction.meta?.logMessages || [], eventRefinanceNewBorrowedSol);

    const eventRefinanceNewBorrowedBonds = 'Program log: Event Refinance new_borrowed_bonds_sum: ';
    const newBorrowedBonds = getNumberValueFromLog(transaction.meta?.logMessages || [], eventRefinanceNewBorrowedBonds);

    const creationEvent = {
      timestamp: blockTime,
      signature: signature,
      bondEventType: BondEventType.Creation,
      fbond: fbondCreate ? fbondCreate.toBase58() : '',
      user: user ? user.toBase58() : '',
      solAmount: newBorrowedSol,
      bondsAmount: newBorrowedBonds,
    };
    return [repayEvent, creationEvent];
  },
  [BondInstruction.LiquidateBondOnAuction]: async ({
    innerInstruction,
    programInstruction,
    signature,
    blockTime,
    transaction,
    connection,
  }: {
    innerInstruction: web3.ParsedInnerInstruction;
    programInstruction: web3.PartiallyDecodedInstruction;
    signature: string;
    blockTime: number;
    transaction: web3.ParsedTransactionWithMeta;

    connection: web3.Connection;
  }): Promise<BondEvent[]> => {
    // const solAmount = getTransferAmountFromInnerInstructions(innerInstruction);

    const eventLiquidateLogSolAmount = 'Program log: Event Liquidation buyout_price: ';
    const solAmount = getNumberValueFromLog(transaction.meta?.logMessages || [], eventLiquidateLogSolAmount);

    const eventLiquidateLogBondsAmount = 'Program log: Event Liquidation fbond.fbond_token_supply: ';
    const bondsAmount = getNumberValueFromLog(transaction.meta?.logMessages || [], eventLiquidateLogBondsAmount);

    const bondEventType = BondEventType.Liquidated;
    const user = programInstruction.accounts[7];
    const fbond = programInstruction.accounts[1];

    return [
      {
        timestamp: blockTime,
        signature: signature,
        bondEventType: bondEventType,

        fbond: fbond ? fbond.toBase58() : '',
        user: user ? user.toBase58() : '',

        solAmount: solAmount,
        bondsAmount: bondsAmount,
      },
    ];
  },
  [BondInstruction.ClaimNftByLenderPnft]: async ({
    innerInstruction,
    programInstruction,
    signature,
    blockTime,
    transaction,
    connection,
  }: {
    innerInstruction: web3.ParsedInnerInstruction;
    programInstruction: web3.PartiallyDecodedInstruction;
    signature: string;
    blockTime: number;
    transaction: web3.ParsedTransactionWithMeta;

    connection: web3.Connection;
  }): Promise<BondEvent[]> => {
    // const solAmount = getTransferAmountFromInnerInstructions(innerInstruction);

    // const eventRefinanceLiquidateLogSolAmount = 'Program log: Event Liquidation buyout_price: ';
    // const solAmount = getNumberValueFromLog(transaction.meta?.logMessages || [], eventRefinanceLiquidateLogSolAmount);

    const eventLiquidateLogBondsAmount = 'Program log: Event Liquidation bond_trade_transaction_v2.amount_of_bonds: ';
    const bondsAmount = getNumberValueFromLog(transaction.meta?.logMessages || [], eventLiquidateLogBondsAmount);

    const bondEventType = BondEventType.Liquidated;
    const user = programInstruction.accounts[9];
    const nft = programInstruction.accounts[7];

    const fbond = programInstruction.accounts[1];

    return [
      {
        timestamp: blockTime,
        signature: signature,
        bondEventType: bondEventType,

        fbond: fbond ? fbond.toBase58() : '',
        user: user ? user.toBase58() : '',

        nft: nft ? nft.toBase58() : '',
        solAmount: null,
        bondsAmount: bondsAmount,
      },
    ];
  },
};

const getTransferAmountFromInnerInstructions = (innerInstruction: web3.ParsedInnerInstruction) => {
  return innerInstruction.instructions
    .filter((instruction) => (instruction as any).program === InnerProgramTypes.System)
    .filter((instruction: any) => instruction.parsed.type === InnerInstructionTypes.Transfer)
    .reduce((amount, instruction: any) => {
      return amount + instruction.parsed.info.lamports;
    }, 0);
};

const getTransferAmountFromInnerInstructionsWithoutFee = (innerInstruction: web3.ParsedInnerInstruction) => {
  // console.log(
  //   'transfer ix: ',
  //   innerInstruction.instructions
  //     .filter((instruction) => (instruction as any).program === InnerProgramTypes.System)
  //     .filter((instruction: any) => instruction.parsed.type === InnerInstructionTypes.Transfer)
  //     .slice(0, 1)
  //     .map((ix: any) => ix.parsed.info),
  // );
  return innerInstruction.instructions
    .filter((instruction) => (instruction as any).program === InnerProgramTypes.System)
    .filter((instruction: any) => instruction.parsed.type === InnerInstructionTypes.Transfer)
    .slice(0, 1)
    .reduce((amount, instruction: any) => {
      return Math.max(amount + instruction.parsed.info.lamports);
    }, 0);
};

const getFbondAndUserAccountsFromInnerInstructionsDepositReturnedSol = (
  innerInstruction: web3.ParsedInnerInstruction,
) => {
  const filteredInstructions = innerInstruction.instructions
    .filter(
      (instruction) => (instruction as any).programId.toString() == '4tdmkuY6EStxbS6Y8s5ueznL3VPMSugrvQuDeAHGZhSt',
    )
    .filter((instruction) => (instruction as any).accounts.length == 4);
  const instruction = filteredInstructions[0] as any;
  const solAmount = getTransferAmountFromInnerInstructions(innerInstruction) / 2;
  return [instruction.accounts[2], instruction.accounts[0], solAmount];
};

enum InnerProgramTypes {
  System = 'system',
  SplToken = 'spl-token',
}

enum InnerInstructionTypes {
  Transfer = 'transfer',
}

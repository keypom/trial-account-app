// src/components/TrialAccountForm.tsx

import React, { useState } from "react";
import {
  Box,
  Input,
  NumberInput,
  FormLabel,
  Button,
  Stack,
  Heading,
  Select,
  Textarea,
  NumberInputField,
  FormControl
} from "@chakra-ui/react";
import { useWallet } from "@/contexts/near";
import {
  TrialAccountManager,
  TrialData,
  ActionToPerform,
  ChainType,
  UsageConstraints,
  InteractionLimits,
  ExitConditions
} from "@keypom/trial-accounts";
import { writeToFile } from "@/utils/fileOps";

interface TrialAccountResult {
  accountId: string;
  signatures: any;
  txnData: any;
}

const TrialAccountForm = () => {
  const [numberOfAccounts, setNumberOfAccounts] = useState(1);
  const [chain, setChain] = useState<ChainType>("NEAR");
  const [methodName, setMethodName] = useState("");
  const [contractId, setContractId] = useState("");
  const [abiFile, setAbiFile] = useState<File | null>(null);
  const [args, setArgs] = useState("{}");
  const [attachedDeposit, setAttachedDeposit] = useState("0");
  const [gas, setGas] = useState("300000000000000");
  const [trialAccounts, setTrialAccounts] = useState<TrialAccountResult[]>([]);
  const { wallet } = useWallet();

  const handleAbiUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setAbiFile(event.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Parse the args JSON
    let parsedArgs = {};
    try {
      parsedArgs = JSON.parse(args);
    } catch (error) {
      alert("Invalid JSON in arguments");
      return;
    }

    // Build the action to perform
    const action: ActionToPerform = {
      chain,
      targetContractId: contractId,
      methodName,
      args: parsedArgs,
      attachedDepositNear: attachedDeposit,
      gas,
      abi: abiFile ? await abiFile.text() : undefined // Read the ABI file content
    };

    // Build trial data with required properties
    const trialData: TrialData = {
      constraintsByChainId: {
        [chain]: {
          allowedMethods: [methodName],
          allowedContracts: [contractId],
          initialDeposit: "0" // Adjust if needed
          // Additional constraints as needed
        }
      },
      usageConstraints: {} as UsageConstraints, // Define as per your requirements
      interactionLimits: {} as InteractionLimits, // Define as per your requirements
      exitConditions: {} as ExitConditions, // Define as per your requirements
      expirationTime: Date.now() + 3600 * 1000 // 1 hour from now
    };

    try {
      // Initialize the TrialAccountManager
      const trialManager = new TrialAccountManager({
        trialContractId: "your-trial-contract.testnet", // Replace with your trial contract ID
        mpcContractId: "v1.signer-prod.testnet", // Replace with your MPC contract ID
        networkId: "testnet"
      });

      const signingAccount = await wallet?.getWallet();

      // Create a trial
      const trialId = await trialManager.createTrial({
        trialData,
        // @ts-ignore
        signingAccount
      });

      // Add trial accounts
      const trialKeys = await trialManager.addTrialAccounts({
        trialId,
        numberOfAccounts,
        // @ts-ignore
        signingAccount
      });

      // Activate trial accounts and perform actions
      const results: TrialAccountResult[] = [];
      for (const trialKey of trialKeys) {
        const accountId = `${Date.now().toString()}-trial-account.testnet`;

        // Activate the trial account
        await trialManager.activateTrialAccounts({
          trialAccountSecretKey: trialKey.trialAccountSecretKey,
          newAccountId: accountId,
          chainId: chain
        });

        // Perform the action
        const actionResult = await trialManager.performActions({
          actionsToPerform: [action],
          trialAccountSecretKey: trialKey.trialAccountSecretKey
        });

        // Store results as needed
        results.push({
          accountId,
          signatures: actionResult.signatures,
          txnData: actionResult.txnDatas // Adjust based on actual return type
        });
      }

      setTrialAccounts(results);

      // Optionally, write to file or allow users to download
      writeToFile(results, "trialAccounts.json");
    } catch (error) {
      console.error("Error creating trial accounts:", error);
      alert(
        "Failed to create trial accounts. Check the console for more details."
      );
    }
  };

  return (
    <Box maxW="md" mx="auto" mt={8} p={4} borderWidth={1} borderRadius="md">
      <form onSubmit={handleSubmit}>
        <Stack spacing={4}>
          <Heading as="h2" size="lg" textAlign="center">
            Create Trial Accounts
          </Heading>
          <FormControl id="numberOfAccounts" isRequired>
            <FormLabel>Number of Accounts</FormLabel>
            <NumberInput
              min={1}
              value={numberOfAccounts}
              onChange={(valueString) =>
                setNumberOfAccounts(parseInt(valueString))
              }
            >
              <NumberInputField />
            </NumberInput>
          </FormControl>
          <FormControl id="chain" isRequired>
            <FormLabel>Chain</FormLabel>
            <Select
              value={chain}
              onChange={(e) => setChain(e.target.value as ChainType)}
            >
              <option value="NEAR">NEAR</option>
              <option value="EVM">EVM</option>
              {/* Add more chains as needed */}
            </Select>
          </FormControl>
          <FormControl id="contractId" isRequired>
            <FormLabel>Contract ID</FormLabel>
            <Input
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
              placeholder="Contract ID (e.g., guestbook.near-examples.testnet)"
            />
          </FormControl>
          <FormControl id="methodName" isRequired>
            <FormLabel>Method Name</FormLabel>
            <Input
              value={methodName}
              onChange={(e) => setMethodName(e.target.value)}
              placeholder="Method Name (e.g., add_message)"
            />
          </FormControl>
          <FormControl id="args">
            <FormLabel>Arguments (JSON)</FormLabel>
            <Textarea
              value={args}
              onChange={(e) => setArgs(e.target.value)}
              placeholder='{"key": "value"}'
            />
          </FormControl>
          {chain === "EVM" && (
            <FormControl id="abiFile">
              <FormLabel>ABI File</FormLabel>
              <Input type="file" accept=".json" onChange={handleAbiUpload} />
            </FormControl>
          )}
          <FormControl id="attachedDeposit">
            <FormLabel>Attached Deposit</FormLabel>
            <Input
              value={attachedDeposit}
              onChange={(e) => setAttachedDeposit(e.target.value)}
              placeholder="Amount in NEAR (e.g., 1)"
            />
          </FormControl>
          <FormControl id="gas">
            <FormLabel>Gas</FormLabel>
            <Input
              value={gas}
              onChange={(e) => setGas(e.target.value)}
              placeholder="Gas (e.g., 300000000000000)"
            />
          </FormControl>
          <Button colorScheme="teal" type="submit">
            Create Trials
          </Button>
        </Stack>
      </form>
    </Box>
  );
};

export default TrialAccountForm;

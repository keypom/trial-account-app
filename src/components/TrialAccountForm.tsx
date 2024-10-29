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
  NumberInputField,
  FormControl,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  IconButton,
  Tooltip,
  Text
} from "@chakra-ui/react";
import { CopyIcon } from "@chakra-ui/icons";
import { useWallet } from "@/contexts/near";
import {
  TrialAccountManager,
  TrialData,
  ChainType,
  UsageConstraints,
  InteractionLimits,
  ExitConditions
} from "@keypom/trial-accounts";
import { writeToFile } from "@/utils/fileOps";
import { MPC_CONTRACT_ID, NETWORK_ID, TRIAL_CONTRACT_ID } from "@/config";

interface TrialAccountResult {
  trialAccountSecretKey: string;
  trialAccountPublicKey: string;
}

const TrialAccountForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [numberOfAccounts, setNumberOfAccounts] = useState(1);

  // Step 1: Chain Constraints
  const [chains, setChains] = useState<Array<ChainType>>(["NEAR"]);
  const [chainConstraints, setChainConstraints] = useState<{
    [key in string]: any;
  }>({});

  // Step 2: Usage Constraints (skippable)
  const [usageConstraints, setUsageConstraints] =
    useState<UsageConstraints | null>(null);

  // Step 3: Interaction Limits (skippable)
  const [interactionLimits, setInteractionLimits] =
    useState<InteractionLimits | null>(null);

  // Step 4: Exit Conditions
  const [exitConditions, setExitConditions] = useState<ExitConditions | null>(
    null
  );

  const [trialAccounts, setTrialAccounts] = useState<TrialAccountResult[]>([]);

  const { wallet } = useWallet();

  const nextStep = () => setCurrentStep((prev) => prev + 1);
  const prevStep = () => setCurrentStep((prev) => prev - 1);

  const handleAddChain = () => {
    setChains((prev) => [...prev, "NEAR"]);
  };

  const handleRemoveChain = (index: number) => {
    setChains((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChainTypeChange = (index: number, value: ChainType) => {
    const updatedChains = [...chains];
    updatedChains[index] = value;
    setChains(updatedChains);
  };

  const handleChainConstraintChange = (
    index: number,
    field: keyof any,
    value: any
  ) => {
    const chain = chains[index];
    setChainConstraints((prev) => ({
      ...prev,
      [index]: {
        ...(prev[index] || {}),
        [field]: value
      }
    }));
  };

  const handleSubmit = async () => {
    // Build constraintsByChainId
    const constraintsByChainId = {};
    chains.forEach((chain, index) => {
      const constraints = chainConstraints[index];
      if (constraints) {
        constraintsByChainId[chain] = constraints;
      }
    });

    // Build trial data with required properties
    const trialData: TrialData = {
      constraintsByChainId,
      expirationTime: Date.now() + 3600 * 1000, // 1 hour from now
      usageConstraints,
      interactionLimits,
      exitConditions
    };

    try {
      // Initialize the TrialAccountManager
      const trialManager = new TrialAccountManager({
        trialContractId: TRIAL_CONTRACT_ID,
        mpcContractId: MPC_CONTRACT_ID,
        networkId: NETWORK_ID
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

      // Collect trial account secret keys
      const results: TrialAccountResult[] = trialKeys.map((trialKey) => ({
        trialAccountSecretKey: trialKey.trialAccountSecretKey,
        trialAccountPublicKey: trialKey.trialAccountPublicKey
      }));

      setTrialAccounts(results);

      // Optionally, write to file or allow users to download
      // writeToFile(results, 'trialAccounts.json');
    } catch (error) {
      console.error("Error creating trial accounts:", error);
      alert(
        "Failed to create trial accounts. Check the console for more details."
      );
    }
  };

  const handleDownloadCSV = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Secret Key,Public Key"]
        .concat(
          trialAccounts.map(
            (acc) => `${acc.trialAccountSecretKey},${acc.trialAccountPublicKey}`
          )
        )
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "trial_accounts.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(trialAccounts.length / itemsPerPage);

  const displayedAccounts = trialAccounts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  return (
    <Box maxW="md" mx="auto" mt={8} p={4} borderWidth={1} borderRadius="md">
      <Stack spacing={4}>
        <Heading as="h2" size="lg" textAlign="center">
          Create Trial Accounts
        </Heading>
        {currentStep === 1 && (
          <Box>
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
            {chains.map((chain, index) => (
              <Box key={index} borderWidth={1} borderRadius="md" p={3} my={2}>
                <FormControl id={`chain-${index}`} isRequired>
                  <FormLabel>Chain</FormLabel>
                  <Select
                    value={chain}
                    onChange={(e) =>
                      handleChainTypeChange(index, e.target.value as ChainType)
                    }
                  >
                    <option value="NEAR">NEAR</option>
                    <option value="EVM">EVM</option>
                    {/* Add more chains as needed */}
                  </Select>
                </FormControl>
                <FormControl id={`contracts-${index}`} isRequired>
                  <FormLabel>Allowed Contracts (comma-separated)</FormLabel>
                  <Input
                    onChange={(e) =>
                      handleChainConstraintChange(
                        index,
                        "allowedContracts",
                        e.target.value.split(",").map((s) => s.trim())
                      )
                    }
                  />
                </FormControl>
                <FormControl id={`methods-${index}`} isRequired>
                  <FormLabel>Allowed Methods (comma-separated)</FormLabel>
                  <Input
                    onChange={(e) =>
                      handleChainConstraintChange(
                        index,
                        "allowedMethods",
                        e.target.value.split(",").map((s) => s.trim())
                      )
                    }
                  />
                </FormControl>
                <FormControl id={`maxGas-${index}`}>
                  <FormLabel>Max Gas</FormLabel>
                  <Input
                    onChange={(e) =>
                      handleChainConstraintChange(
                        index,
                        "maxGas",
                        e.target.value
                      )
                    }
                  />
                </FormControl>
                <FormControl id={`maxDeposit-${index}`}>
                  <FormLabel>Max Deposit</FormLabel>
                  <Input
                    onChange={(e) =>
                      handleChainConstraintChange(
                        index,
                        "maxDeposit",
                        e.target.value
                      )
                    }
                  />
                </FormControl>
                <FormControl id={`initialDeposit-${index}`}>
                  <FormLabel>Initial Deposit</FormLabel>
                  <Input
                    onChange={(e) =>
                      handleChainConstraintChange(
                        index,
                        "initialDeposit",
                        e.target.value
                      )
                    }
                  />
                </FormControl>
                <Button
                  colorScheme="red"
                  onClick={() => handleRemoveChain(index)}
                >
                  Remove Chain
                </Button>
              </Box>
            ))}
            <Button onClick={handleAddChain}>Add Another Chain</Button>
          </Box>
        )}
        {currentStep === 2 && (
          <Box>
            <FormControl id="maxContracts">
              <FormLabel>Max Contracts</FormLabel>
              <NumberInput
                min={0}
                onChange={(valueString) =>
                  setUsageConstraints((prev) => ({
                    ...prev,
                    maxNumberContracts: parseInt(valueString)
                  }))
                }
              >
                <NumberInputField />
              </NumberInput>
            </FormControl>
            <FormControl id="maxMethods">
              <FormLabel>Max Methods</FormLabel>
              <NumberInput
                min={0}
                onChange={(valueString) =>
                  setUsageConstraints((prev) => ({
                    ...prev,
                    maxNumberMethods: parseInt(valueString)
                  }))
                }
              >
                <NumberInputField />
              </NumberInput>
            </FormControl>
            <FormControl id="maxTokenTransfers">
              <FormLabel>Max Token Transfers</FormLabel>
              <NumberInput
                min={0}
                onChange={(valueString) =>
                  setUsageConstraints((prev) => ({
                    ...prev,
                    maxNumberTokenTransfers: parseInt(valueString)
                  }))
                }
              >
                <NumberInputField />
              </NumberInput>
            </FormControl>
            <FormControl id="rateLimitPerMinute">
              <FormLabel>Rate Limit Per Minute</FormLabel>
              <NumberInput
                min={0}
                onChange={(valueString) =>
                  setUsageConstraints((prev) => ({
                    ...prev,
                    rateLimitPerMinute: parseInt(valueString)
                  }))
                }
              >
                <NumberInputField />
              </NumberInput>
            </FormControl>
            <FormControl id="blacklistedAddresses">
              <FormLabel>Blacklisted Addresses (comma-separated)</FormLabel>
              <Input
                onChange={(e) =>
                  setUsageConstraints((prev) => ({
                    ...prev,
                    blacklistedAddresses: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                  }))
                }
              />
            </FormControl>
          </Box>
        )}
        {currentStep === 3 && (
          <Box>
            <FormControl id="maxInteractionsPerDay">
              <FormLabel>Max Interactions Per Day</FormLabel>
              <NumberInput
                min={0}
                onChange={(valueString) =>
                  setInteractionLimits((prev) => ({
                    ...prev,
                    maxInteractionsPerDay: parseInt(valueString)
                  }))
                }
              >
                <NumberInputField />
              </NumberInput>
            </FormControl>
            <FormControl id="totalInteractions">
              <FormLabel>Total Interactions</FormLabel>
              <NumberInput
                min={0}
                onChange={(valueString) =>
                  setInteractionLimits((prev) => ({
                    ...prev,
                    totalInteractions: parseInt(valueString)
                  }))
                }
              >
                <NumberInputField />
              </NumberInput>
            </FormControl>
          </Box>
        )}
        {currentStep === 4 && (
          <Box>
            <FormControl id="numberOfTransactions">
              <FormLabel>Number of Transactions</FormLabel>
              <NumberInput
                min={0}
                onChange={(valueString) =>
                  setExitConditions((prev) => ({
                    ...prev,
                    numberOfTransactions: parseInt(valueString)
                  }))
                }
              >
                <NumberInputField />
              </NumberInput>
            </FormControl>
            <FormControl id="timeLimit">
              <FormLabel>Time Limit (in minutes)</FormLabel>
              <NumberInput
                min={0}
                onChange={(valueString) =>
                  setExitConditions((prev) => ({
                    ...prev,
                    timeLimit: parseInt(valueString)
                  }))
                }
              >
                <NumberInputField />
              </NumberInput>
            </FormControl>
          </Box>
        )}
        {currentStep < 4 && (
          <Button colorScheme="teal" onClick={nextStep}>
            Next
          </Button>
        )}
        {currentStep > 1 && (
          <Button onClick={prevStep} variant="outline">
            Back
          </Button>
        )}
        {currentStep === 4 && (
          <Button colorScheme="green" onClick={handleSubmit}>
            Create Trials
          </Button>
        )}
      </Stack>

      {trialAccounts.length > 0 && (
        <Box mt={8}>
          <Heading as="h3" size="md" mb={4}>
            Trial Accounts
          </Heading>
          <TableContainer>
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Secret Key</Th>
                  <Th>Public Key</Th>
                </Tr>
              </Thead>
              <Tbody>
                {displayedAccounts.map((acc, index) => (
                  <Tr key={index}>
                    <Td>
                      {acc.trialAccountSecretKey}
                      <Tooltip label="Copy Secret Key">
                        <IconButton
                          aria-label="Copy Secret Key"
                          icon={<CopyIcon />}
                          size="sm"
                          ml={2}
                          onClick={() =>
                            navigator.clipboard.writeText(
                              acc.trialAccountSecretKey
                            )
                          }
                        />
                      </Tooltip>
                    </Td>
                    <Td>{acc.trialAccountPublicKey}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
          <Box
            mt={4}
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Button onClick={handlePrevPage} isDisabled={currentPage === 1}>
              Previous
            </Button>
            <Text>
              Page {currentPage} of {totalPages}
            </Text>
            <Button
              onClick={handleNextPage}
              isDisabled={currentPage === totalPages}
            >
              Next
            </Button>
          </Box>
          <Button mt={4} onClick={handleDownloadCSV}>
            Download CSV
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default TrialAccountForm;

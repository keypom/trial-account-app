import React, { useEffect, useState } from "react";
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
  Text,
  VStack,
  HStack,
  Image,
  Menu,
  MenuButton,
  MenuList,
  MenuItem
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
import {
  ExtEVMConstraints,
  NEARConstraints
} from "@keypom/trial-accounts/lib/lib/types/ChainConstraints";
import { parseNearAmount } from "@near-js/utils";
import { KeyPairString } from "near-api-js/lib/utils";

import { ethers, JsonRpcProvider, parseEther } from "ethers";

export function getSponsorEVMWallet(
  evmPrivateKey: string,
  providerUrl: string,
  chainId: string
) {
  // Convert the hex private key string into a Uint8Array
  const hexPrivateKey = evmPrivateKey.startsWith("0x")
    ? evmPrivateKey.slice(2)
    : evmPrivateKey;

  const privateKeyBytes = Uint8Array.from(Buffer.from(hexPrivateKey, "hex"));

  // Initialize provider
  const provider = new JsonRpcProvider(providerUrl, parseInt(chainId, 10));

  // Create the wallet using the private key bytes
  const SPONSOR_WALLET = new ethers.Wallet(
    new ethers.SigningKey(privateKeyBytes),
    provider
  );

  return SPONSOR_WALLET;
}

interface TrialAccountResult {
  trialAccountSecretKey: string;
  trialAccountPublicKey: string;
}

interface ExtChainConstraints {
  [key: number]: NEARConstraints | ExtEVMConstraints;
}

// Define chain options with names, logos, and chain IDs
const chainOptions = [
  { id: "NEAR", name: "NEAR", logo: "/near_chain.png", chainId: "NEAR" },
  {
    id: "Polygon",
    name: "Polygon",
    logo: "/polygon_chain.png",
    chainId: 137
  },
  {
    id: "Arbitrum",
    name: "Arbitrum",
    logo: "/arbitrum_chain.png",
    chainId: 421614
  },
  { id: "Base", name: "Base", logo: "/base_chain.png", chainId: 8453 },
  {
    id: "Binance",
    name: "Binance Smart Chain",
    logo: "/binance_chain.png",
    chainId: 56
  },
  {
    id: "Ethereum",
    name: "Ethereum",
    logo: "/eth_chain.png",
    chainId: 1
  },
  {
    id: "Optimism",
    name: "Optimism",
    logo: "/optimism_chain.png",
    chainId: 10
  }
];

const TrialAccountForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [numberOfAccounts, setNumberOfAccounts] = useState(1);

  const [activeChains, setActiveChains] = useState<string[]>(["NEAR"]);
  const [nearConstraints, setNearConstraints] = useState<
    NEARConstraints | undefined
  >();
  const [evmConstraints, setEvmConstraints] = useState<
    ExtEVMConstraints | undefined
  >();

  const [usageConstraints, setUsageConstraints] = useState<UsageConstraints>();
  const [interactionLimits, setInteractionLimits] =
    useState<InteractionLimits>();
  const [exitConditions, setExitConditions] = useState<ExitConditions | null>(
    null
  );
  const [trialAccounts, setTrialAccounts] = useState<TrialAccountResult[]>([]);

  const { wallet } = useWallet();

  useEffect(() => {
    console.log("activeChains", activeChains);
    console.log("nearConstraints", nearConstraints);
    console.log("evmConstraints", evmConstraints);
  }, [activeChains, nearConstraints, evmConstraints]);

  const handleAddChain = (chain: string) => {
    setActiveChains([...activeChains, chain]);
  };

  const handleRemoveChain = (chain: string) => {
    setActiveChains((prev) =>
      prev.filter((activeChain) => activeChain !== chain)
    );
    if (chain === "NEAR") setNearConstraints(undefined);
    else setEvmConstraints(undefined);
  };

  const handleChainSelection = (index: number, chain: string) => {
    const updatedChains = [...activeChains];
    updatedChains[index] = chain;
    setActiveChains(updatedChains);

    if (chain === "NEAR") {
      setNearConstraints({
        allowedMethods: [],
        allowedContracts: [],
        maxGas: null,
        maxDeposit: null,
        initialDeposit: "0"
      });
    } else {
      setEvmConstraints({
        chainId: Number(chainOptions.find((c) => c.id === chain)!.chainId),
        allowedMethods: [],
        allowedContracts: [],
        maxGas: null,
        maxValue: null,
        initialDeposit: BigInt(0)
      });
    }
  };

  const handleChainConstraintChange = (
    chain: string,
    field: keyof NEARConstraints | keyof ExtEVMConstraints,
    value: any
  ) => {
    if (chain === "NEAR") {
      setNearConstraints(
        (prev) => ({ ...prev, [field]: value }) as NEARConstraints
      );
    } else {
      setEvmConstraints(
        (prev) => ({ ...prev, [field]: value }) as ExtEVMConstraints
      );
    }
  };

  const handleSubmit = async () => {
    console.log("Submitting...");
    if (!wallet) {
      console.error("Wallet not connected");
      return;
    }

    const constraintsByChainId: {
      NEAR?: NEARConstraints;
      EVM?: ExtEVMConstraints;
    } = {
      NEAR: {
        allowedMethods: nearConstraints?.allowedMethods || [],
        allowedContracts: nearConstraints?.allowedContracts || [],
        maxGas: nearConstraints?.maxGas
          ? (Number(nearConstraints.maxGas) * 1e12).toString()
          : null,
        maxDeposit: nearConstraints?.maxDeposit
          ? parseNearAmount(nearConstraints?.maxDeposit)!
          : null,
        initialDeposit: parseNearAmount(nearConstraints?.initialDeposit || "0")!
      }
    };

    if (evmConstraints) {
      constraintsByChainId.EVM = {
        chainId: evmConstraints.chainId,
        allowedMethods: evmConstraints.allowedMethods,
        allowedContracts: evmConstraints.allowedContracts,
        maxGas: evmConstraints.maxGas,
        maxValue: evmConstraints.maxDeposit
          ? parseEther(evmConstraints.maxDeposit).toString()
          : null,
        initialDeposit: parseEther(evmConstraints.initialDeposit)
      };
    }
    console.log("constraintsByChainId", constraintsByChainId);

    const trialData: TrialData = {
      constraintsByChainId,
      expirationTime: null,
      usageConstraints: usageConstraints || null,
      interactionLimits: interactionLimits || null,
      exitConditions: exitConditions || null
    };
    console.log("trialData", trialData);

    try {
      const trialManager = new TrialAccountManager({
        trialContractId: TRIAL_CONTRACT_ID,
        mpcContractId: MPC_CONTRACT_ID,
        networkId: NETWORK_ID
      });

      const signingAccount = await wallet?.getWallet();
      const trialId = await trialManager.createTrial({
        trialData,
        signingAccount
      });

      const trialKeys = await trialManager.addTrialAccounts({
        trialId,
        numberOfKeys: numberOfAccounts,
        signingAccount
      });

      const results: TrialAccountResult[] = trialKeys.map((trialKey) => ({
        trialAccountSecretKey: trialKey.trialAccountSecretKey,
        trialAccountPublicKey: trialKey.trialAccountPublicKey
      }));

      setTrialAccounts(results);

      // Activating the first trial account
      const firstTrialKey = results[0]?.trialAccountSecretKey;

      if (firstTrialKey) {
        console.log(
          `Activating trial account on NEAR and EVM for key: ${firstTrialKey}`
        );

        // Activate for NEAR
        await trialManager.activateTrialAccounts({
          trialAccountSecretKey: firstTrialKey as KeyPairString,
          newAccountId: `${Date.now().toString()}-trialuser.testnet`,
          chainId: "NEAR"
        });

        const chainId = "421614";
        // get the derived EVM address from the derivation path
        const evmAddress = await trialManager.deriveEthAddress(
          firstTrialKey as KeyPairString
        );

        const providerUrl = `https://arb-sepolia.g.alchemy.com/v2/_sGkBm9-T_63IgelIg-2KcAfIZfT3MLE`;
        const sponsorWallet = getSponsorEVMWallet(
          "74446635ba16e61abd1f18bf49015c512e7decc27621103ef305fc97561d9cf2",
          providerUrl,
          chainId
        );

        await sponsorWallet.sendTransaction({
          to: evmAddress,
          value: trialData.constraintsByChainId.EVM?.initialDeposit
        });

        // Activate for EVM chain (e.g., 42161)
        await trialManager.activateTrialAccounts({
          trialAccountSecretKey: firstTrialKey as KeyPairString,
          newAccountId: evmAddress,
          chainId // Change as appropriate for your specific EVM chain ID
        });
      }
    } catch (error) {
      console.error("Error creating trial accounts:", error);
      alert(
        "Failed to create trial accounts. Check the console for more details."
      );
    }
  };

  const nextStep = () => setCurrentStep((prev) => prev + 1);
  const prevStep = () => setCurrentStep((prev) => prev - 1);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Number of items per page

  // Calculate total pages based on trialAccounts length
  const totalPages = Math.ceil(trialAccounts.length / itemsPerPage);

  // Slice trialAccounts to get the accounts displayed on the current page
  const displayedAccounts = trialAccounts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Pagination handlers
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));

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

  // Define function to generate URLs for Guestbook and Counter with trial key
  const getTrialUrl = (baseUrl) => {
    if (trialAccounts.length === 0) return "#"; // If no trial keys, link to "#" to avoid errors

    const trialKey = trialAccounts[0].trialAccountSecretKey; // Use first trial key in list
    return `${baseUrl}?trialKey=${trialKey}&chainId=421614`;
  };

  return (
    <Box maxW="4xl" mx="auto" mt={8} p={4} borderWidth={1} borderRadius="md">
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
        {currentStep === 1 && (
          <>
            <Heading as="h3" size="md" textAlign="left">
              Chain Constraints
            </Heading>

            <HStack spacing={4}>
              {activeChains.map((chain, index) => (
                <VStack
                  key={index}
                  borderWidth={1}
                  borderRadius="md"
                  p={3}
                  w="full"
                >
                  <HStack spacing={2} w="full">
                    <Menu>
                      <MenuButton as={Button} width="full">
                        <HStack>
                          <Image
                            src={
                              chainOptions.find((option) => option.id === chain)
                                ?.logo
                            }
                            alt={chain}
                            w={4}
                            h={4}
                          />
                          <Text>
                            {
                              chainOptions.find((option) => option.id === chain)
                                ?.name
                            }
                          </Text>
                        </HStack>
                      </MenuButton>
                      <MenuList>
                        {chainOptions.map((option) => (
                          <MenuItem
                            key={option.id}
                            onClick={() =>
                              handleChainSelection(index, option.id)
                            }
                          >
                            <HStack>
                              <Image
                                src={option.logo}
                                alt={option.name}
                                w={4}
                                h={4}
                              />
                              <Text>{option.name}</Text>
                            </HStack>
                          </MenuItem>
                        ))}
                      </MenuList>
                    </Menu>
                  </HStack>
                  <FormControl isRequired>
                    <FormLabel>Allowed Contracts</FormLabel>
                    <Input
                      onChange={(e) =>
                        handleChainConstraintChange(
                          chain,
                          "allowedContracts",
                          e.target.value.split(",").map((s) => s.trim())
                        )
                      }
                    />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>Allowed Methods</FormLabel>
                    <Input
                      onChange={(e) =>
                        handleChainConstraintChange(
                          chain,
                          "allowedMethods",
                          e.target.value.split(",").map((s) => s.trim())
                        )
                      }
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Max Gas</FormLabel>
                    <Input
                      onChange={(e) =>
                        handleChainConstraintChange(
                          chain,
                          "maxGas",
                          e.target.value
                        )
                      }
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Max Deposit</FormLabel>
                    <Input
                      onChange={(e) =>
                        handleChainConstraintChange(
                          chain,
                          "maxDeposit",
                          e.target.value
                        )
                      }
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Initial Balance</FormLabel>
                    <Input
                      onChange={(e) =>
                        handleChainConstraintChange(
                          chain,
                          "initialDeposit",
                          e.target.value
                        )
                      }
                    />
                  </FormControl>
                  <HStack w="full" justifyContent="space-between" mt={4}>
                    <Button
                      colorScheme="red"
                      onClick={() => handleRemoveChain(chain)}
                    >
                      Remove
                    </Button>
                    {activeChains.length < 2 && (
                      <Button onClick={() => handleAddChain("Polygon")}>
                        Add Another Chain
                      </Button>
                    )}
                  </HStack>
                </VStack>
              ))}
            </HStack>
          </>
        )}

        {currentStep === 2 && (
          <Box>
            <Heading as="h3" size="md" textAlign="left" mb={2}>
              Lifetime Usage Restrictions
            </Heading>
            <FormControl id="maxContracts">
              <FormLabel>Max Transactions</FormLabel>
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
              <FormLabel>Max Attached Deposits</FormLabel>
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
              <FormLabel>Max Gas Attached</FormLabel>
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
          <>
            <Heading as="h3" size="md" textAlign="left" mb={2}>
              Rate Limits
            </Heading>
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
            </Box>
          </>
        )}
        {currentStep === 4 && (
          <Box>
            <Heading as="h3" size="md" textAlign="left" mb={2}>
              Expiry Conditions
            </Heading>
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
                {displayedAccounts.map(
                  (acc: TrialAccountResult, index: number) => (
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
                  )
                )}
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

      {trialAccounts.length > 0 && (
        <Box mt={8} display="flex" justifyContent="space-between">
          <Button
            as="a"
            href={getTrialUrl("http://localhost:3000")}
            target="_blank"
            colorScheme="teal"
          >
            Try Guestbook
          </Button>
          <Button
            as="a"
            href={getTrialUrl("http://localhost:5000")}
            target="_blank"
            colorScheme="blue"
          >
            Try Counter
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default TrialAccountForm;

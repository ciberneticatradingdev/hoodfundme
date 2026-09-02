export const fundAbi = [
  {
    type: "function",
    name: "createCampaign",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "metadataURI", type: "string" },
      { name: "beneficiary", type: "address" },
    ],
    outputs: [
      { name: "id", type: "uint256" },
      { name: "vault", type: "address" },
    ],
  },
  {
    type: "function",
    name: "donate",
    stateMutability: "payable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "flush",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "amount", type: "uint256" }],
  },
  {
    type: "function",
    name: "setBeneficiary",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "beneficiary", type: "address" },
    ],
    outputs: [],
  },
] as const;

export const fundEventsAbi = [
  {
    type: "event",
    name: "CampaignCreated",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "beneficiary", type: "address", indexed: true },
      { name: "vault", type: "address", indexed: false },
      { name: "name", type: "string", indexed: false },
      { name: "metadataURI", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Donated",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "beneficiary", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "BeneficiaryUpdated",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "beneficiary", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "ActiveSet",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "active", type: "bool", indexed: false },
    ],
  },
];

export const fundAbi = [
  ...fundEventsAbi,
  {
    type: "function",
    name: "flushMany",
    stateMutability: "nonpayable",
    inputs: [{ name: "ids", type: "uint256[]" }],
    outputs: [],
  },
  {
    type: "function",
    name: "campaignCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
];

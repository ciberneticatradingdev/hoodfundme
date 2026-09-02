// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title HoodFund — trustless donation flywheel on Robinhood Chain
/// @notice Every campaign gets its own on-chain Vault address. Point any fee
///         stream (token creator fees, tips, trading revenue) at the vault and
///         100% of received ETH is forwarded to the campaign's beneficiary.
///         No custody, no admin balance, no commission — verifiable in code.
contract HoodFund {
    struct Campaign {
        address creator;      // wallet that registered the campaign
        address beneficiary;  // where donations are paid out
        address vault;        // deposit address for this campaign
        string  name;
        string  metadataURI;  // off-chain JSON: description, image, cause link
        uint96  totalRaised;  // lifetime ETH forwarded to beneficiary
        bool    active;
    }

    uint256 public campaignCount;
    mapping(uint256 => Campaign) public campaigns;
    mapping(address => uint256) public vaultToCampaign; // vault addr → id + 1

    event CampaignCreated(
        uint256 indexed id,
        address indexed creator,
        address indexed beneficiary,
        address vault,
        string name,
        string metadataURI
    );
    event Donated(uint256 indexed id, uint256 amount, address indexed beneficiary);
    event BeneficiaryUpdated(uint256 indexed id, address indexed beneficiary);
    event ActiveSet(uint256 indexed id, bool active);

    error NotCreator();
    error ZeroAddress();
    error UnknownCampaign();
    error PayoutFailed();
    error NothingToFlush();

    /// @notice Register a campaign. Deploys a dedicated Vault for deposits.
    function createCampaign(
        string calldata name,
        string calldata metadataURI,
        address beneficiary
    ) external returns (uint256 id, address vault) {
        if (beneficiary == address(0)) revert ZeroAddress();
        id = campaignCount++;
        vault = address(new Vault{salt: bytes32(id)}());
        campaigns[id] = Campaign({
            creator: msg.sender,
            beneficiary: beneficiary,
            vault: vault,
            name: name,
            metadataURI: metadataURI,
            totalRaised: 0,
            active: true
        });
        vaultToCampaign[vault] = id + 1;
        emit CampaignCreated(id, msg.sender, beneficiary, vault, name, metadataURI);
    }

    /// @notice Forward everything a campaign's vault holds to its beneficiary.
    ///         Callable by anyone — keepers, donors, the beneficiary itself.
    function flush(uint256 id) public returns (uint256 amount) {
        Campaign storage c = campaigns[id];
        if (c.vault == address(0)) revert UnknownCampaign();
        amount = c.vault.balance;
        if (amount == 0) revert NothingToFlush();
        c.totalRaised += uint96(amount);
        Vault(payable(c.vault)).sweep(c.beneficiary);
        emit Donated(id, amount, c.beneficiary);
    }

    /// @notice Flush many campaigns in one tx (skips empty vaults).
    function flushMany(uint256[] calldata ids) external {
        for (uint256 i = 0; i < ids.length; i++) {
            Campaign storage c = campaigns[ids[i]];
            if (c.vault != address(0) && c.vault.balance > 0) flush(ids[i]);
        }
    }

    /// @notice Donate directly to a campaign in the same tx.
    function donate(uint256 id) external payable {
        Campaign storage c = campaigns[id];
        if (c.vault == address(0)) revert UnknownCampaign();
        (bool ok, ) = c.vault.call{value: msg.value}("");
        if (!ok) revert PayoutFailed();
        flush(id);
    }

    /// @notice Campaign creator can rotate the beneficiary (e.g. cause wallet changed).
    function setBeneficiary(uint256 id, address beneficiary) external {
        Campaign storage c = campaigns[id];
        if (msg.sender != c.creator) revert NotCreator();
        if (beneficiary == address(0)) revert ZeroAddress();
        c.beneficiary = beneficiary;
        emit BeneficiaryUpdated(id, beneficiary);
    }

    /// @notice Creator can pause/unpause the campaign listing (vault keeps working).
    function setActive(uint256 id, bool active) external {
        Campaign storage c = campaigns[id];
        if (msg.sender != c.creator) revert NotCreator();
        c.active = active;
        emit ActiveSet(id, active);
    }

    function getCampaign(uint256 id) external view returns (Campaign memory) {
        return campaigns[id];
    }

    /// @notice Pending (un-flushed) ETH sitting in a campaign's vault.
    function pendingOf(uint256 id) external view returns (uint256) {
        return campaigns[id].vault.balance;
    }
}

/// @notice Minimal deposit vault. Accepts ETH from anyone; only HoodFund can sweep.
contract Vault {
    address public immutable hoodFund;

    error OnlyHoodFund();
    error SweepFailed();

    constructor() {
        hoodFund = msg.sender;
    }

    receive() external payable {}

    function sweep(address to) external {
        if (msg.sender != hoodFund) revert OnlyHoodFund();
        (bool ok, ) = to.call{value: address(this).balance}("");
        if (!ok) revert SweepFailed();
    }
}

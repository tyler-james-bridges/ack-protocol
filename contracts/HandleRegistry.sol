// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title HandleRegistry
 * @notice Maps social handles (X/Twitter) to onchain identities for ACK kudos.
 * @dev Handles are stored lowercase. Anyone can create a handle entry by giving
 *      feedback through the ACK agent. Claiming requires proving ownership
 *      (via the ACK operator submitting a verified claim).
 *
 *      This is NOT an ERC-721. Handles are lightweight mappings, not tokens.
 *      If a handle owner later registers as an ERC-8004 agent, they can link
 *      their handle to their agent ID for unified reputation.
 */
contract HandleRegistry {
    struct Handle {
        string platform;       // "x" for X/Twitter
        string handle;         // lowercase handle without @
        address claimedBy;     // zero if unclaimed
        uint256 linkedAgentId; // 0 if not linked to an 8004 agent
        uint256 createdAt;
        uint256 claimedAt;
    }

    /// @notice Operator address that can register handles and process claims
    address public operator;

    /// @notice handle hash => Handle data
    mapping(bytes32 => Handle) public handles;

    /// @notice All registered handle hashes (for enumeration)
    bytes32[] public handleList;

    /// @notice address => handle hashes they've claimed
    mapping(address => bytes32[]) public claimedHandles;

    event HandleRegistered(bytes32 indexed handleHash, string platform, string handle);
    event HandleClaimed(bytes32 indexed handleHash, address indexed claimedBy);
    event HandleLinked(bytes32 indexed handleHash, uint256 indexed agentId);
    event OperatorTransferred(address indexed oldOperator, address indexed newOperator);

    modifier onlyOperator() {
        require(msg.sender == operator, "HandleRegistry: not operator");
        _;
    }

    constructor(address _operator) {
        operator = _operator;
    }

    /// @notice Compute the hash for a platform:handle pair
    function handleHash(string calldata platform, string calldata handle) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(platform, ":", handle));
    }

    /// @notice Register a new handle (operator only, called when first kudos is given)
    function registerHandle(string calldata platform, string calldata handle) external onlyOperator returns (bytes32) {
        bytes32 hash = handleHash(platform, handle);
        require(handles[hash].createdAt == 0, "HandleRegistry: already registered");

        handles[hash] = Handle({
            platform: platform,
            handle: handle,
            claimedBy: address(0),
            linkedAgentId: 0,
            createdAt: block.timestamp,
            claimedAt: 0
        });

        handleList.push(hash);
        emit HandleRegistered(hash, platform, handle);
        return hash;
    }

    /// @notice Claim a handle after ownership verification (operator submits on behalf)
    function claimHandle(bytes32 hash, address owner) external onlyOperator {
        require(handles[hash].createdAt > 0, "HandleRegistry: not registered");
        require(handles[hash].claimedBy == address(0), "HandleRegistry: already claimed");

        handles[hash].claimedBy = owner;
        handles[hash].claimedAt = block.timestamp;
        claimedHandles[owner].push(hash);

        emit HandleClaimed(hash, owner);
    }

    /// @notice Link a claimed handle to an ERC-8004 agent ID
    function linkAgent(bytes32 hash, uint256 agentId) external {
        Handle storage h = handles[hash];
        require(h.createdAt > 0, "HandleRegistry: not registered");
        require(h.claimedBy == msg.sender || msg.sender == operator, "HandleRegistry: not authorized");

        h.linkedAgentId = agentId;
        emit HandleLinked(hash, agentId);
    }

    /// @notice Check if a handle exists
    function exists(string calldata platform, string calldata handle) external view returns (bool) {
        return handles[handleHash(platform, handle)].createdAt > 0;
    }

    /// @notice Get handle info
    function getHandle(bytes32 hash) external view returns (Handle memory) {
        return handles[hash];
    }

    /// @notice Total registered handles
    function totalHandles() external view returns (uint256) {
        return handleList.length;
    }

    /// @notice Transfer operator role
    function transferOperator(address newOperator) external onlyOperator {
        emit OperatorTransferred(operator, newOperator);
        operator = newOperator;
    }
}

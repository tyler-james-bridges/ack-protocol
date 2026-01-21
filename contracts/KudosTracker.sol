// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title KudosTracker
 * @notice A decentralized kudos tracking system with privacy-conscious user management
 * @dev Implements secure user deletion with cooldown periods and re-registration protection
 */
contract KudosTracker {
    struct User {
        string xHandle;
        uint256 kudosReceived;
        uint256 kudosGiven;
        bool isRegistered;
        uint256 registeredAt;
        uint256 deletionRequestedAt; // For soft delete with grace period
    }
    
    struct KudosTransaction {
        address from;
        address to;
        string fromHandle;
        string toHandle;
        uint256 timestamp;
        string tweetUrl;
    }
    
    // Core storage
    mapping(address => User) public users;
    mapping(string => address) public handleToAddress;
    mapping(string => bool) public processedTweets;
    
    // Security: Track deleted accounts to prevent handle hijacking
    mapping(string => bool) public deletedHandles;
    mapping(address => uint256) public lastDeletionTime;
    
    // Privacy: Allow users to mark their data as private
    mapping(address => bool) public privateProfiles;
    
    KudosTransaction[] public kudosHistory;
    
    // Security constants
    uint256 public constant DELETION_GRACE_PERIOD = 7 days; // GDPR-like right to erasure with grace period
    uint256 public constant REREGISTRATION_COOLDOWN = 30 days; // Prevent rapid re-registration abuse
    uint256 public constant MIN_HANDLE_LENGTH = 3;
    uint256 public constant MAX_HANDLE_LENGTH = 15;
    
    // Events
    event UserRegistered(address indexed user, string xHandle, uint256 timestamp);
    event UserDeletionRequested(address indexed user, string xHandle, uint256 timestamp);
    event UserDeletionCancelled(address indexed user, string xHandle);
    event UserDeleted(address indexed user, string xHandle, uint256 timestamp);
    event KudosGiven(
        address indexed from, 
        address indexed to, 
        string fromHandle, 
        string toHandle,
        string tweetUrl,
        uint256 timestamp
    );
    event ProfilePrivacyUpdated(address indexed user, bool isPrivate);
    
    // Modifiers
    modifier onlyRegistered() {
        require(users[msg.sender].isRegistered, "User not registered");
        require(users[msg.sender].deletionRequestedAt == 0, "Account pending deletion");
        _;
    }
    
    modifier notPendingDeletion() {
        require(users[msg.sender].deletionRequestedAt == 0, "Account pending deletion");
        _;
    }
    
    /**
     * @notice Register a new user with security checks
     * @param _xHandle Twitter/X handle for the user
     */
    function registerUser(string memory _xHandle) external {
        // Input validation
        require(bytes(_xHandle).length >= MIN_HANDLE_LENGTH, "Handle too short");
        require(bytes(_xHandle).length <= MAX_HANDLE_LENGTH, "Handle too long");
        require(_isValidHandle(_xHandle), "Invalid handle format");
        
        // Security checks
        require(!users[msg.sender].isRegistered, "User already registered");
        require(handleToAddress[_xHandle] == address(0), "Handle already taken");
        require(!deletedHandles[_xHandle], "Handle permanently retired");
        
        // Cooldown check for re-registration
        if (lastDeletionTime[msg.sender] > 0) {
            require(
                block.timestamp >= lastDeletionTime[msg.sender] + REREGISTRATION_COOLDOWN,
                "Reregistration cooldown period active"
            );
        }
        
        users[msg.sender] = User({
            xHandle: _xHandle,
            kudosReceived: 0,
            kudosGiven: 0,
            isRegistered: true,
            registeredAt: block.timestamp,
            deletionRequestedAt: 0
        });
        
        handleToAddress[_xHandle] = msg.sender;
        
        emit UserRegistered(msg.sender, _xHandle, block.timestamp);
    }
    
    /**
     * @notice Request account deletion with grace period (GDPR-compliant)
     * @dev Initiates a soft delete with 7-day grace period
     */
    function requestAccountDeletion() external onlyRegistered {
        require(users[msg.sender].deletionRequestedAt == 0, "Deletion already requested");
        
        users[msg.sender].deletionRequestedAt = block.timestamp;
        
        emit UserDeletionRequested(msg.sender, users[msg.sender].xHandle, block.timestamp);
    }
    
    /**
     * @notice Cancel a pending account deletion request
     */
    function cancelAccountDeletion() external {
        require(users[msg.sender].isRegistered, "User not registered");
        require(users[msg.sender].deletionRequestedAt > 0, "No deletion request pending");
        
        users[msg.sender].deletionRequestedAt = 0;
        
        emit UserDeletionCancelled(msg.sender, users[msg.sender].xHandle);
    }
    
    /**
     * @notice Execute account deletion after grace period
     * @dev Anyone can call this for gas efficiency, but only after grace period
     */
    function executeAccountDeletion(address _user) external {
        require(users[_user].isRegistered, "User not registered");
        require(users[_user].deletionRequestedAt > 0, "No deletion request pending");
        require(
            block.timestamp >= users[_user].deletionRequestedAt + DELETION_GRACE_PERIOD,
            "Grace period not expired"
        );
        
        string memory handle = users[_user].xHandle;
        
        // Mark handle as permanently retired (prevents hijacking)
        deletedHandles[handle] = true;
        
        // Track deletion time for cooldown period
        lastDeletionTime[_user] = block.timestamp;
        
        // Clear mappings
        delete handleToAddress[handle];
        delete users[_user];
        delete privateProfiles[_user];
        
        emit UserDeleted(_user, handle, block.timestamp);
    }
    
    /**
     * @notice Toggle profile privacy setting
     * @param _isPrivate Whether to make profile private
     */
    function setProfilePrivacy(bool _isPrivate) external onlyRegistered {
        privateProfiles[msg.sender] = _isPrivate;
        emit ProfilePrivacyUpdated(msg.sender, _isPrivate);
    }
    
    /**
     * @notice Give kudos with enhanced validation
     */
    function giveKudos(
        string memory _toHandle, 
        string memory _tweetUrl
    ) external onlyRegistered notPendingDeletion {
        require(bytes(_tweetUrl).length > 0, "Tweet URL required");
        require(!processedTweets[_tweetUrl], "Tweet already processed");
        
        address toAddress = handleToAddress[_toHandle];
        require(toAddress != address(0), "Recipient not registered");
        require(toAddress != msg.sender, "Cannot give kudos to yourself");
        require(users[toAddress].deletionRequestedAt == 0, "Recipient pending deletion");
        
        users[msg.sender].kudosGiven++;
        users[toAddress].kudosReceived++;
        
        kudosHistory.push(KudosTransaction({
            from: msg.sender,
            to: toAddress,
            fromHandle: users[msg.sender].xHandle,
            toHandle: _toHandle,
            timestamp: block.timestamp,
            tweetUrl: _tweetUrl
        }));
        
        processedTweets[_tweetUrl] = true;
        
        emit KudosGiven(
            msg.sender, 
            toAddress, 
            users[msg.sender].xHandle, 
            _toHandle,
            _tweetUrl,
            block.timestamp
        );
    }
    
    /**
     * @notice Get user data with privacy consideration
     */
    function getUserByHandle(string memory _handle) external view returns (User memory) {
        address userAddress = handleToAddress[_handle];
        require(userAddress != address(0), "User not found");
        
        // Respect privacy settings
        if (privateProfiles[userAddress] && msg.sender != userAddress) {
            revert("Profile is private");
        }
        
        return users[userAddress];
    }
    
    /**
     * @notice Get user data by address with privacy consideration
     */
    function getUserByAddress(address _user) external view returns (User memory) {
        require(users[_user].isRegistered, "User not registered");
        
        // Respect privacy settings
        if (privateProfiles[_user] && msg.sender != _user) {
            revert("Profile is private");
        }
        
        return users[_user];
    }
    
    /**
     * @notice Check if a handle is available for registration
     */
    function isHandleAvailable(string memory _handle) external view returns (bool) {
        return handleToAddress[_handle] == address(0) && 
               !deletedHandles[_handle] && 
               _isValidHandle(_handle);
    }
    
    /**
     * @notice Get account status for a user
     */
    function getAccountStatus(address _user) external view returns (
        bool isRegistered,
        bool isPendingDeletion,
        uint256 deletionTime,
        bool canReregister
    ) {
        User memory user = users[_user];
        isRegistered = user.isRegistered;
        isPendingDeletion = user.deletionRequestedAt > 0;
        deletionTime = isPendingDeletion ? 
            user.deletionRequestedAt + DELETION_GRACE_PERIOD : 0;
        canReregister = lastDeletionTime[_user] == 0 || 
            block.timestamp >= lastDeletionTime[_user] + REREGISTRATION_COOLDOWN;
    }
    
    // Existing view functions remain the same
    function getKudosHistory() external view returns (KudosTransaction[] memory) {
        return kudosHistory;
    }
    
    function getKudosHistoryLength() external view returns (uint256) {
        return kudosHistory.length;
    }
    
    function getKudosHistoryPage(uint256 _offset, uint256 _limit) 
        external 
        view 
        returns (KudosTransaction[] memory) 
    {
        uint256 totalLength = kudosHistory.length;
        
        if (_offset >= totalLength) {
            return new KudosTransaction[](0);
        }
        
        uint256 endIndex = _offset + _limit;
        if (endIndex > totalLength) {
            endIndex = totalLength;
        }
        
        uint256 resultLength = endIndex - _offset;
        KudosTransaction[] memory page = new KudosTransaction[](resultLength);
        
        for (uint256 i = 0; i < resultLength; i++) {
            page[i] = kudosHistory[_offset + i];
        }
        
        return page;
    }
    
    /**
     * @notice Get leaderboard with privacy filters
     */
    function getLeaderboard(uint256 _limit) 
        external 
        view 
        returns (
            string[] memory handles,
            uint256[] memory kudosReceived,
            address[] memory addresses
        ) 
    {
        uint256 historyLength = kudosHistory.length;

        // Return empty arrays if no history
        if (historyLength == 0) {
            return (new string[](0), new uint256[](0), new address[](0));
        }

        // Get unique users from history
        address[] memory uniqueUsers = new address[](historyLength * 2);
        uint256 uniqueCount = 0;
        
        for (uint256 i = 0; i < historyLength; i++) {
            address fromUser = kudosHistory[i].from;
            address toUser = kudosHistory[i].to;
            
            bool fromExists = false;
            bool toExists = false;
            
            for (uint256 j = 0; j < uniqueCount; j++) {
                if (uniqueUsers[j] == fromUser) fromExists = true;
                if (uniqueUsers[j] == toUser) toExists = true;
            }
            
            // Only include non-private, non-deleted users
            if (!fromExists && users[fromUser].isRegistered && 
                users[fromUser].deletionRequestedAt == 0 && !privateProfiles[fromUser]) {
                uniqueUsers[uniqueCount] = fromUser;
                uniqueCount++;
            }
            if (!toExists && users[toUser].isRegistered && 
                users[toUser].deletionRequestedAt == 0 && !privateProfiles[toUser]) {
                uniqueUsers[uniqueCount] = toUser;
                uniqueCount++;
            }
        }
        
        // Sort users by kudos received (skip if 0 or 1 users)
        for (uint256 i = 0; i + 1 < uniqueCount; i++) {
            for (uint256 j = 0; j + i + 1 < uniqueCount; j++) {
                if (users[uniqueUsers[j]].kudosReceived < users[uniqueUsers[j + 1]].kudosReceived) {
                    address temp = uniqueUsers[j];
                    uniqueUsers[j] = uniqueUsers[j + 1];
                    uniqueUsers[j + 1] = temp;
                }
            }
        }
        
        // Prepare return arrays
        uint256 resultCount = _limit < uniqueCount ? _limit : uniqueCount;
        handles = new string[](resultCount);
        kudosReceived = new uint256[](resultCount);
        addresses = new address[](resultCount);
        
        for (uint256 i = 0; i < resultCount; i++) {
            address userAddr = uniqueUsers[i];
            handles[i] = users[userAddr].xHandle;
            kudosReceived[i] = users[userAddr].kudosReceived;
            addresses[i] = userAddr;
        }
        
        return (handles, kudosReceived, addresses);
    }
    
    function getUserKudos(string memory _handle) external view returns (uint256) {
        address userAddress = handleToAddress[_handle];
        require(userAddress != address(0), "User not found");
        return users[userAddress].kudosReceived;
    }
    
    /**
     * @dev Validate handle format (alphanumeric and underscore only)
     */
    function _isValidHandle(string memory _handle) private pure returns (bool) {
        bytes memory b = bytes(_handle);
        for(uint i = 0; i < b.length; i++){
            bytes1 char = b[i];
            if(!(
                (char >= 0x30 && char <= 0x39) || // 0-9
                (char >= 0x41 && char <= 0x5A) || // A-Z  
                (char >= 0x61 && char <= 0x7A) || // a-z
                (char == 0x5F) // _
            )) {
                return false;
            }
        }
        return true;
    }
}
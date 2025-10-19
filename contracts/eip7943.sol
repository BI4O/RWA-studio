// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

/// @notice ERC20 + EIP7943 RWA Token Contract (with UI interaction annotations)
contract XAU_RWA_Token is ERC20, AccessControlEnumerable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ENFORCER_ROLE = keccak256("ENFORCER_ROLE");

    mapping(address => bool) public whitelisted;
    mapping(address => uint256) public frozen;

    bool public whitelistEnabled;
    bool public freezeEnabled;
    bool public forceTransferEnabled;

    /**
     * Constructor parameters (corresponding to UI configuration items):
     * 1️⃣ Token Name
     * 2️⃣ Symbol
     * 3️⃣ Initial Supply
     * 4️⃣ Decimals (not used in constructor, inherited from ERC20)
     * 5️⃣ Owner/Admin Address
     * 6️⃣ Enforcer Role Address
     * 7️⃣ Minter Role Address
     * 8️⃣ Whitelist Mode
     * 9️⃣ Default Whitelisted Addresses
     * 🔟 Freeze Control
     * 11️⃣ Force Transfer Control
     */
    constructor(
        string memory name_,           // 1️⃣
        string memory symbol_,         // 2️⃣
        uint256 initialSupply_,        // 3️⃣
        address admin_,                // 5️⃣
        address enforcer_,             // 6️⃣
        address minter_,               // 7️⃣
        bool whitelistMode_,           // 8️⃣
        address[] memory defaultWL_,   // 9️⃣
        bool freezeCtrl_,              // 🔟
        bool forceCtrl_                // 11️⃣
    ) ERC20(name_, symbol_) {
        _setupRole(DEFAULT_ADMIN_ROLE, admin_);
        _setupRole(MINTER_ROLE, minter_);
        _setupRole(ENFORCER_ROLE, enforcer_);

        _mint(admin_, initialSupply_ * (10 ** 18));

        whitelistEnabled = whitelistMode_;
        freezeEnabled = freezeCtrl_;
        forceTransferEnabled = forceCtrl_;

        // Initialize default whitelist
        for (uint i = 0; i < defaultWL_.length; i++) {
            whitelisted[defaultWL_[i]] = true;
        }
    }

    /// @notice Override transfer restrictions based on whitelist mode
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        super._beforeTokenTransfer(from, to, amount);

        // 8️⃣ If whitelist mode is enabled, restrict transfers to whitelisted addresses only
        if (whitelistEnabled && from != address(0) && to != address(0)) {
            require(whitelisted[from] && whitelisted[to], "Address not whitelisted");
        }

        // 🔟 Check frozen balance if freeze control is enabled
        if (freezeEnabled && from != address(0)) {
            uint256 bal = balanceOf(from);
            uint256 available = bal > frozen[from] ? bal - frozen[from] : 0;
            require(amount <= available, "Insufficient unfrozen balance");
        }
    }

    /// @notice 🔟 Enforcer can freeze user assets
    function setFrozen(address user, uint256 amount) external onlyRole(ENFORCER_ROLE) {
        require(freezeEnabled, "Freeze control disabled");
        frozen[user] = amount;
    }

    /// @notice 11️⃣ Enforcer can force transfer (regulatory requirement)
    function forceTransfer(
        address from,
        address to,
        uint256 amount
    ) external onlyRole(ENFORCER_ROLE) {
        require(forceTransferEnabled, "Force transfer disabled");
        _transfer(from, to, amount);
    }

    /// @notice 9️⃣ Admin can manage whitelist
    function setWhitelist(address user, bool allowed) external onlyRole(DEFAULT_ADMIN_ROLE) {
        whitelisted[user] = allowed;
    }

    /// @notice 7️⃣ Minter can mint new tokens
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    /// @notice Admin can enable/disable whitelist mode
    function setWhitelistEnabled(bool enabled) external onlyRole(DEFAULT_ADMIN_ROLE) {
        whitelistEnabled = enabled;
    }

    /// @notice Admin can enable/disable freeze control
    function setFreezeEnabled(bool enabled) external onlyRole(DEFAULT_ADMIN_ROLE) {
        freezeEnabled = enabled;
    }

    /// @notice Admin can enable/disable force transfer
    function setForceTransferEnabled(bool enabled) external onlyRole(DEFAULT_ADMIN_ROLE) {
        forceTransferEnabled = enabled;
    }
}
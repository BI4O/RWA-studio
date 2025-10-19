pragma solidity ^0.8.29;

/* required imports ... */

contract uRWA20 is Context, ERC20, AccessControlEnumerable, IERC7943 {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant ENFORCER_ROLE = keccak256("ENFORCER_ROLE");
    bytes32 public constant WHITELIST_ROLE = keccak256("WHITELIST_ROLE");

    mapping(address user => bool whitelisted) public isWhitelisted;
    mapping(address user => uint256 amount) internal _frozenTokens;

    event Whitelisted(address indexed account, bool status);
    error NotZeroAddress();

    constructor(string memory name, string memory symbol, address initialAdmin) ERC20(name, symbol) {
        /* give initialAdmin necessary roles ...*/
        // 给予初始管理员必要的角色...
    }

    function isTransferAllowed(address from, address to, uint256, uint256 amount) public virtual view returns (bool allowed) {
        if (amount > balanceOf(from) - _frozenTokens[from]) return;
        if (!isUserAllowed(from) || !isUserAllowed(to)) return;
        allowed = true;
    }

    function isUserAllowed(address user) public virtual view returns (bool allowed) {
        if (isWhitelisted[user]) allowed = true;
    } 

    function getFrozen(address user, uint256) external view returns (uint256 amount) {
        amount = _frozenTokens[user];
    }

    function changeWhitelist(address account, bool status) external onlyRole(WHITELIST_ROLE) {
        require(account != address(0), NotZeroAddress());
        isWhitelisted[account] = status;
        emit Whitelisted(account, status);
    }

    /* standard mint and burn functions with access control ...*/ 
    // 具有访问控制的标准铸造和销毁功能...

    function setFrozen(address user, uint256, uint256 amount) public onlyRole(ENFORCER_ROLE) {
        require(amount <= balanceOf(user), IERC20Errors.ERC20InsufficientBalance(user, balanceOf(user), amount));
        _frozenTokens[user] = amount;
        emit Frozen(user, 0, amount);
    }

    function forceTransfer(address from, address to, uint256, uint256 amount) public onlyRole(ENFORCER_ROLE) {
        require(isUserAllowed(to), ERC7943NotAllowedUser(to));
        _excessFrozenUpdate(from, amount);
        super._update(from, to, amount);
        emit ForcedTransfer(from, to, 0, amount);
    }

    function _excessFrozenUpdate(address user, uint256 amount) internal {
        uint256 unfrozenBalance = balanceOf(user) - _frozenTokens[user];
        if(amount > unfrozenBalance && amount <= balanceOf(user)) { 
            // Protect from underflow: if amount > balanceOf(user) the call will revert in super._update with insufficient balance error
            // 防止下溢：如果 amount > balanceOf(user)，则调用将在 super._update 中回滚，并出现余额不足错误
            _frozenTokens[user] -= amount - unfrozenBalance; // Reduce by excess amount
            // 减少过剩数量
            emit Frozen(user, 0, _frozenTokens[user]);
        }
    }

    function _update(address from, address to, uint256 amount) internal virtual override {
        if (from != address(0) && to != address(0)) { // Transfer
            // 转账
            require(amount <= balanceOf(from), IERC20Errors.ERC20InsufficientBalance(from, balanceOf(from), amount));
            require(amount <= balanceOf(from) - _frozenTokens[from], ERC7943InsufficientUnfrozenBalance(from, 0, amount, balanceOf(from) - _frozenTokens[from]));
            require(isTransferAllowed(from, to, 0, amount), ERC7943NotAllowedTransfer(from, to, 0, amount));
        } else if (from == address(0)) { // Mint
            // 铸造
            require(isUserAllowed(to), ERC7943NotAllowedUser(to));
        } else { // Burn
            // 销毁
            _excessFrozenUpdate(from, amount);
        }

        super._update(from, to, amount);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControlEnumerable, IERC165) returns (bool) {
        return interfaceId == type(IERC7943).interfaceId ||
            interfaceId == type(IERC20).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
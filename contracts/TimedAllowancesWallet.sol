pragma solidity ^0.4.24;


/// @title A wallet which allows controlled release of funds to beneficiary. It
///        creates fund locks in future which allow some part of the funds to be
///        withdrawn by the beneficiary, once the sufficient amount of time has passed
/// @author Janko Krstic keichiri@protonmail.com
contract TimedAllowancesWallet {
    address public benefactor;
    address public beneficiary;
    bool public frozen;
    FundLock public currentLock;

    struct FundLock {
        uint time;
        uint total;
        uint left;
    }

    event NewFundLock(address indexed benefactor, address indexed beneficiary, uint time, uint amount);
    event FundLockExhausted(address indexed benefactor, address indexed beneficiary);
    event Frozen(address indexed benefactor, address indexed beneficiary, bool frozen);
    event Terminated(address indexed benefactor, address indexed beneficiary);


    modifier futureTime(uint _time) {
        require(_time > now);
        _;
    }

    modifier onlyBenefactor() {
        require(msg.sender == benefactor);
        _;
    }

    modifier onlyBeneficiary() {
        require(msg.sender == beneficiary);
        _;
    }

    modifier notFrozen() {
        require(!frozen);
        _;
    }

    modifier allowedToSpend() {
        require(now >= currentLock.time);
        _;
    }

    modifier isFunded(uint amount) {
        require(address(this).balance >= amount);
        _;
    }

    /*
        @notice constructor function which also sets the first fund lock
        @param _beneficiary The beneficiary of the contract. Can be contract or EOA
        @param _amount The amount for initial fund lock
        @param _time The time boundary for initial fund lock
    */
    constructor (address _beneficiary, uint _amount, uint _time) futureTime(_time) public payable {
        require(_beneficiary != address(0));

        benefactor = msg.sender;
        beneficiary = _beneficiary;
        frozen = false;
        createFundLock(_amount, _time, false);
    }


    /*
        @notice Creates the fund lock using provided amount and time, with optionally increasing it with the
                unspent amount of previous fund lock
        @param _amount The amount that will be allowed to be spent
        @param _time The time when the amount is allowed to be spent
        @param _transferUnspent Whether the unspent amount of previous lock should be added
    */
    function createFundLock(uint _amount, uint _time, bool _transferUnspent) onlyBenefactor() public {
        if (_transferUnspent) {
            _amount += currentLock.left;
        }

        currentLock.time = _time;
        currentLock.total = _amount;
        currentLock.left = _amount;

        emit NewFundLock(benefactor, beneficiary, _time, _amount);
    }


    function () onlyBenefactor() public payable {}

    function freeze() onlyBenefactor() notFrozen() public {
        frozen = true;
        emit Frozen(benefactor, beneficiary, true);
    }

    function unfreeze() onlyBenefactor public {
        if (!frozen) {
            revert();
        }
        frozen = false;
        emit Frozen(benefactor, beneficiary, false);
    }

    /*
        @notice Terminates the contract, sending all the remaining funds either to the benefactor or to the beneficiary
        @param _toBeneficiary Whether the balance goes to beneficiary
    */
    function terminate(bool _toBeneficiary) onlyBenefactor() public {
        if (_toBeneficiary) {
            beneficiary.transfer(address(this).balance);
        }

        emit Terminated(benefactor, beneficiary);

        selfdestruct(benefactor);
    }


    function withdraw(uint _amount) onlyBeneficiary() allowedToSpend() isFunded(_amount) notFrozen() public {
        require(_amount <= currentLock.left);

        currentLock.left -= _amount;

        if (currentLock.left == 0) {
            emit FundLockExhausted(benefactor, beneficiary);
        }

        beneficiary.transfer(_amount);
    }
}

const TimedAllowancesWallet = artifacts.require("./TimedAllowancesWallet.sol");
const { isInTransaction } = require("./helpers/checkEvent");


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


contract("TimedAllowancesWallet", function(accounts) {
   let benefactor = accounts[0];
   let beneficiary = accounts[1];
   let other = accounts[2];
   let wallet;
   let time;

   it("Should create a lock with given amount during contact creation", async () => {
       let now = Math.floor((new Date).getTime() / 1000);
       let allowedAmount = web3.toWei(2, 'ether');
       let suppliedAmount = web3.toWei(5, 'ether');
       let withdrawnAmount = web3.toWei(0.5, 'ether');
       let initialBeneficiaryBalance = await web3.eth.getBalance(beneficiary);

       let wallet = await TimedAllowancesWallet.new(beneficiary, allowedAmount, now + 1, {from: benefactor, });

       let walletContract = TimedAllowancesWallet.at(wallet.address);
       let tx = await web3.eth.getTransactionReceipt(wallet.transactionHash);
       console.log(`Transaction hash: ${wallet.transactionHash}, ${walletContract.transactionHash}. Logs: ${tx.logs}`);
       let [time, total, left] = await walletContract.currentLock();

       assert(time == now + 1);
       assert(total == allowedAmount);
       assert(left == allowedAmount);
       assert(web3.eth.getBalance(wallet.address) == 0);
       assert(await walletContract.beneficiary(), beneficiary);

       try {
           await wallet.withdraw(withdrawnAmount, {from: beneficiary, gas: 5000000});
           assert(false, "Expected error")
       } catch(error) {}

       console.log("Sleeping");
        await sleep(1500);

        try {
            await wallet.withdraw(withdrawnAmount, {from: beneficiary, gas: 5000000});
            assert(false, "Expected error");
        } catch(error) {}

        await wallet.send(suppliedAmount, {from: benefactor});

       await wallet.withdraw(withdrawnAmount, {from: beneficiary, gas: 5000000});

       console.log("withdrew");

       let [time2, total2, left2] = await walletContract.currentLock();
       assert(time2 == now + 1);
       assert(total2 == allowedAmount);
       assert(left2, allowedAmount - withdrawnAmount);

       assert(await web3.eth.getBalance(wallet.address), suppliedAmount - withdrawnAmount);
       assert(await web3.eth.getBalance(beneficiary), initialBeneficiaryBalance + withdrawnAmount);

       await wallet.withdraw(allowedAmount - withdrawnAmount, {from: beneficiary, gas: 500000});

       let [_, total3, left3] = await walletContract.currentLock();
       assert(total3 == allowedAmount);
       assert(left3, 0);

       assert(await web3.eth.getBalance(wallet.address), suppliedAmount - withdrawnAmount - web3.toWei(1.5, 'ether'));
       assert(await web3.eth.getBalance(beneficiary), initialBeneficiaryBalance + withdrawnAmount + web3.toWei(1.5, 'ether'));

       try {
           await wallet.withdraw(1, {from: beneficiary, gas: 5000000});
           assert(false, "Expected error");
       } catch(error) {}

   });

});
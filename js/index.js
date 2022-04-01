(function ($) {
    // 'use strict';

    var $window = $(window);

    var set_chainId = 97; // bsc testnet
    var curr_chainId = null;
    var wallet_connect_flag = false;

    var mint_active_settime = null;
    var contract_watch_settime = null;
    var web3obj = null;
    var mint_token_amount = 1;

    var watch_time = 3500;

    var totalSupply = 0;
    var maxSupply = 100;
    var maxMintAmount = 10;
    var price = 0;

    var balance = 0;

    if (typeof ethereum !== 'undefined') {
        web3obj = new Web3(ethereum);
    } else if (typeof web3 !== 'undefined') {
        web3obj = new Web3(web3.currentProvider);
    } else {
        alert('No MetaMask! Please install the MetaMask!');
        $("#othernet").text("Please install the MetaMask!");
        return;
    }

    if(typeof web3obj === 'undefined') {
        web3obj = new Web3(Web3.givenProvider);
    }

    try {
        NFT_contract = new web3obj.eth.Contract(ABI, ADDRESS);// for mint
    } catch (err) {
        console.log("contract read error: ", err);
    }

    $('#mint_token_amount').val(mint_token_amount);


    (async () => {
        try {
            curr_chainId = await web3obj.currentProvider.chainId;

            loading();
    
            if(set_chainId == curr_chainId) {
                mint_active_watch();
            } else {
                other_network();
            }

            unloading();
        
            await web3obj.currentProvider.on('accountsChanged', () => {
                if(wallet_connect_flag) {
                    clearTimeout(contract_watch_settime);
                    disconnect();
                    mint_active_watch();
                    alert("Wallet address has changed. Reconnect new wallet!")
                }
            });
    
            await web3obj.currentProvider.on('chainChanged', (chid) => {
                curr_chainId = chid;
                if(curr_chainId != set_chainId) {
                    clearTimeout(mint_active_settime);
                    clearTimeout(contract_watch_settime);
                    disconnect();
                    other_network();
                    alert("Network has changed. Please change network to Ethereum Mainnet!")
                } else {
                    mint_active_watch();
                }
            });
        } catch (err) {
            console.log("error: ", err);
        }
    })();

    async function mint_active_watch() {      
        mint_active_settime = setTimeout(() => {
            mint_active_watch();
        }, 1000);
    }

    function other_network() {
        
    }

    function loading() {
        $('#preloader').show();
    }
    
    function unloading() {    
        $('#preloader').hide();
    }

    function disconnect() {
    }

    $("#wallet_connect").click(function(e) {
        e.preventDefault();
        if(!wallet_connect_flag) {
            wallet_connect();
        }
    });

    $("#mint_token").click(function(e) {
        e.preventDefault();
        if(wallet_connect_flag) {
            mint_token();
        }
    });

    $("#increase_amount").click(function(e) {
        e.preventDefault();
        if(mint_token_amount < maxMintAmount) {
            mint_token_amount += 1;
            $('#mint_token_amount').val(mint_token_amount);
        }
    });

    $("#decrease_amount").click(function(e) {
        e.preventDefault();
        if(mint_token_amount > 1) {
            mint_token_amount -= 1;
            $('#mint_token_amount').val(mint_token_amount);
        }
    });

    async function wallet_connect() {
        try {
            await web3obj.eth.requestAccounts()
                .then((acc) => {
                    web3obj.eth.net.getId().then(async (id) => {
                        if(set_chainId == id) {
                            alert("Wallet Connect Success!");
                
                            wallet_address = acc[0];
                            wallet_connect_flag = true;

                            getBalance(wallet_address);

                            $("#wallet_connect").text(wallet_address.substr(0, 4) + "…" + wallet_address.substr(wallet_address.length - 3, wallet_address.length));

                            clearTimeout(mint_active_settime);
                            contract_watch();
                        } else {
                            alert("Please change network to Ethereum Mainnet!");
                        }
                    })
                })
            .catch((error) => {
                if (error.code === 4001) {
                    console.log('Please connect to MetaMask.');
                } else {
                    console.error(error);
                }
            });
        } catch (err){
            console.log("wallet_connect: ", err);
        }
    }

    async function contract_watch() {
        try {
            totalSupply = await NFT_contract.methods.totalSupply().call();
            maxSupply = await NFT_contract.methods.maxSupply().call();
            maxMintAmount = await NFT_contract.methods.maxMintAmount().call();
            price = await NFT_contract.methods.price().call();            

            $('#mint_status').text(maxSupply + " / " + totalSupply);
        } catch (err) { 
            console.log("conract_ err", err);
        }
      
        contract_watch_settime = setTimeout(() => {
            contract_watch();
        }, watch_time);
    }

    async function getBalance(addr) {
        balance = await web3obj.eth.getBalance(addr);
    }

    async function mint_token() {
        try {
            var qty = $("#mint_token_amount").val();
            var total_cost = qty * price;

            if(wallet_connect_flag) {
                loading();
                if(qty >= 1 && qty <= maxMintAmount) {
                    if(Number(total_cost) < Number(balance)) {
                        var mintAddressList = [wallet_address.toString()];
                        await NFT_contract.methods.mint(mintAddressList, qty).send({value: total_cost, from: wallet_address}).on("receipt", async function (res) {
                            alert("Transaction successful");
                            try {
                                totalSupply = await NFT_contract.methods.totalSupply().call();
                                maxSupply = await NFT_contract.methods.maxSupply().call();
                                maxMintAmount = await NFT_contract.methods.maxMintAmount().call();
                                price = await NFT_contract.methods.price().call();            

                                $('#mint_status').text(maxSupply + " / " + totalSupply);
                                
                                getBalance(wallet_address);  
                                unloading();                      
                            } catch (err) {
                                unloading();
                                console.log("buy part again watch error: ", err);
                            }
                        }).on("error", function(res) {
                            unloading();
                            alert("Error in transaction");
                    })
                    } else {
                        unloading();
                        alert("The amount of ETH in your wallet is not sufficient!");
                    }
                } else {
                    unloading();
                    alert("please check Qty! Max 10.");
                }
            } else {
                unloading();
                alert("Please connect to Ethereum Mainnet!");
            }
        } catch (err) {
              console.log("Buy", err);
        }
    }

})(jQuery);

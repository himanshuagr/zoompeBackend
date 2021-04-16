const paytmconfig = require('../config/paytmconfig');
const redis = require('../modules/redis');
const uuid = require('uniqid');
const https = require('https');
const paytmchecksum = require('../config/PaytmChecksum');
const sql = require('../modules/sql');
const smsSender = require('./smsSender');


exports.addmoneytowallet = async(req,res)=>{


    var UserId = req.user.UserId;
    var amount = req.body.amount;
    var query = 'SELECT * FROM users WHERE UserId = ?';
    var [row,field] = await sql.query(query,[UserId]);
    if(row[0]==null)
    return res.status(401).send({"status": false, "code": 401, "msg": "user not registered"}); 
    var paytmParams = {};
    var TransactionId = uuid('TN');
    paytmParams.body = {
       "requestType"   : "Payment",
       "mid"           : paytmconfig.MID,
       "websiteName"   : paytmconfig.Website,
       "orderId"       : TransactionId,
       "callbackUrl"   : paytmconfig.CallbackURL,
       "txnAmount"     : {
          "value"     : amount,
          "currency"  : "INR",
        },
       "userInfo"      : {
          "custId"    : UserId,
        },
    };
    try{
       
        var checksum = await paytmchecksum.generateSignature(JSON.stringify(paytmParams.body),paytmconfig.Key);
        paytmParams.head = {
            "signature"    : checksum
        };
        var post_data = JSON.stringify(paytmParams);
        var options = {
            hostname: 'securegw-stage.paytm.in',
            port: 443,
            path: `/theia/api/v1/initiateTransaction?mid=${paytmconfig.MID}&orderId=${TransactionId}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': post_data.length
            }
        };
       var response = await dorequest(options,post_data);
       response = JSON.parse(response);
       if(response.body.resultInfo.resultStatus=='F')
       return res.status(401).send({"status": false, "code": 401, "msg": "Cannot initiate transaction"});
       res.render('payment',{
           MID : paytmconfig.MID,
           orderId : TransactionId,
           txnToken : response.body.txnToken
       });
       redis.hmset(TransactionId,{
             'amount' : amount,
             'UserId' : UserId
       });
    }
    catch(e)
    {
        console.log("payment error"+e.stack);
        return res.status(401).send({"status": false, "code": 401, "msg": "unable to add money"});
    }


}

exports.verifypayment = async (req,res)=>{

    console.log(req.body);
    var TransactionId = req.body.ORDERID;
    
    try{
    
    if(req.body.STATUS=="TXN_FAILURE")
    {

        redis.hgetall(TransactionId,async (err,object)=>{
           
           
            if(err||object==null)
            return res.status(401).send({"status": false, "code": 401, "msg": "Something wrong happens"});

            let query = 'SELECT * FROM wallet WHERE UserId = ?';
            var [row,field] = await sql.query(query,object.UserId);
            var balance = row[0].Balance;
            var date = new Date();
            await updateTransaction(TransactionId,object.UserId,0,0,false,date,balance,'ADD2W',req.body.RESPMSG,null,null);
            redis.del(TransactionId);
            return res.status(401).send({"status": false, "code": 401, "msg": req.body.RESPMSG});
             
        })
    }
    else if(req.body.STATUS=="TXN_SUCCESS")
    {

        var paytmParams = {};
        paytmParams["MID"] = paytmconfig.MID;
        paytmParams["ORDERID"] = TransactionId; 
        var paytmChecksum = paytmchecksum.generateSignature(paytmParams, paytmconfig.Key);
        await paytmChecksum.then(function(result){
	           var verifyChecksum =  paytmchecksum.verifySignature(paytmParams, paytmconfig.Key,result);
	           if(verifyChecksum == false)
               {
                   console.log("verify checksum failed");
                   return res.status(401).send({"status": false, "code": 401, "msg": "unable to add money"});
               }
                 
        }).catch(function(error){
                   console.log("verify checksum failed"+e.stack);
                   return res.status(401).send({"status": false, "code": 401, "msg": "unable to add money"});
	           
        });
        redis.hgetall(TransactionId,async(err,object)=>{
            
            if(err||object==null)
            return res.status(401).send({"status": false, "code": 401, "msg": "Something wrong happens"});
            let query = 'SELECT * FROM wallet WHERE UserId = ?';
            var [row,field] = await sql.query(query,object.UserId);
            var old_balance = row[0].Balance;
            var date = new Date();
            var amount = object.amount;
            var new_balance = Number(old_balance)+Number(amount);
            var TranasctionDetails = `${amount} rs added to wallet with transaction id ${TransactionId}`;
            var ref = `Bank transaction id = ${req.body.BANKTXNID}`;
            await updateTransaction(TransactionId,object.UserId,amount,0,true,date,new_balance,"ADD2W",TranasctionDetails,ref,null);
            await updateWalletBalance(object.UserId,new_balance);
            redis.del(TransactionId);
            res.status(200).send({"code": 200, "msg": `${amount} rs added to wallet`});


        });


    }
    else{
        return res.status(401).send({"status": false, "code": 401, "msg": req.body.RESPMSG});
    }
    }
    catch(e)
    {
        console.log("payment error"+e.stack);
        return res.status(401).send({"status": false, "code": 401, "msg": "unable to add money"});

    }
      
        
     
}



exports.walletTransfer = async (req,res)=>{


         try{
         var UserId = req.user.UserId;
         var amount = req.body.amount;
         var RecieverMobile = req.body.RecieverMobile;
         if(!amount||!RecieverMobile)
         return res.status(401).send({"status": false, "code": 401, "msg": "Something wrong happens"});
         let query = 'SELECT * FROM users WHERE UserId = ?';
         var [row,field] = await sql.query(query,[UserId]);
         if(row[0]==null)
         return res.status(401).send({"status": false, "code": 401, "msg": "user not registered"}); 
         var userMobile = row[0].Mobile;
         let query2 = 'SELECT * FROM users WHERE Mobile = ?';
         var [row2,field2] = await sql.query(query2,[RecieverMobile]);
         if(row2[0]==null)
         return res.status(401).send({"status": false, "code": 401, "msg": "Reciever not registered"}); 
         var RecieverId = row2[0].UserId;
         if(UserId==RecieverId)
         return res.status(401).send({"status": false, "code": 401, "msg": "Cannot transfer money"}); 
         
         var userWalletBalance = await getWalletBalance(UserId);
         var recieverWalletBalance = await getWalletBalance(RecieverId);
         if(userWalletBalance<amount)
         return res.status(401).send({"status": false, "code": 401, "msg": "Wallet Balance is insufficient"});
         userWalletBalance = Number(userWalletBalance)-Number(amount);
         recieverWalletBalance = Number(recieverWalletBalance)+Number(amount);
         var date = new Date();
         var TransactionIdUser = uuid('TN');
         var TransactionIdReciever = uuid('TN');
         var TranasctionDetailsUser = `${amount} rs transferred to ${RecieverMobile} with transaction id ${TransactionIdUser}`;
         var TranasctionDetailsReciever = `${amount} rs Recieverd from ${userMobile} with transaction id ${TransactionIdReciever}`;
         
 
        //Update transaction and wallet Balance
         await updateTransaction(TransactionIdUser,UserId,0,amount,true,date,userWalletBalance,'W2W',TranasctionDetailsUser,RecieverMobile,null);
         await updateTransaction(TransactionIdReciever,RecieverId,amount,0,true,date,recieverWalletBalance,'W2W',TranasctionDetailsReciever,userMobile,null);

         await updateWalletBalance(UserId,userWalletBalance);
         await updateWalletBalance(RecieverId,recieverWalletBalance);
         res.status(200).send({"code": 200, "msg": `${amount} rs Transferred to ${RecieverMobile}`});

         }
         catch(e)
         {
             console.log("wallet tranfer error"+e.stack);
            return res.status(401).send({"status": false, "code": 401, "msg": "Unable to tranfer Money"});
         }

}


function dorequest(options,post_data)
{

     return new Promise((resolve,reject)=>{
        var post_req = https.request(options, function(post_res) {
            var response = "";
            post_res.on('data', function (chunk) {
                response += chunk;
            });
    
            post_res.on('end', function(){
                resolve(response);
            });
        });
        post_req.write(post_data);
        post_req.end();
     })

}

function updateTransaction(TransactionId,UserId,CreditAmount,DebitAmount,IsSuccessful,TransactionDate,Balance,TransactionType,TranasctionDetails,Ref,OtherDetails)
{
    return new Promise((resolve,reject)=>{

  
        let query = 'INSERT INTO transactions(TransactionId,UserId,CreditAmount,DebitAmount,IsSuccessful,TransactionDate,Balance,TransactionType,TranasctionDetails,Ref,OtherDetails) VALUES(?,?,?,?,?,?,?,?,?,?,?)';
        sql.query(query,[TransactionId,UserId,CreditAmount,DebitAmount,IsSuccessful,TransactionDate,Balance,TransactionType,TranasctionDetails,Ref,OtherDetails])
         resolve('transaction updated');
    });

}

function updateWalletBalance(UserId,UpdatedBalance)
{
   
     return new Promise((resolve,reject)=>{
         
        try{
            let query = "UPDATE wallet SET Balance = ? WHERE UserId = ?";
            sql.query(query,[UpdatedBalance,UserId]);
            resolve('Balance updated');
        }
        catch(e)
        {
            reject(e);
        }

     });
}

function getWalletBalance(UserId)
{
    return new Promise(async(resolve,reject)=>{
         
        try{
            let query = "SELECT * FROM wallet WHERE UserId = ?";
            var [row,field] = await sql.query(query,[UserId]);
            resolve(row[0].Balance);
        }
        catch(e)
        {
            reject(e);
        }

     });
}
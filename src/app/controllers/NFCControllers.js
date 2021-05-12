const sql = require('../modules/sql');
const uuid = require('uniqid');

exports.registerNFC = async (req,res)=>{

    
     var userId = req.user.UserId;
     var nfcID = req.body.nfcID;
     var pin = req.body.pin;
     
     try{
     if(!userId||!nfcID||!pin)
     return res.status(401).send({"status": false, "code": 401, "msg": "Insufficent query"});
     let query = 'SELECT * FROM users WHERE UserId = ?';
     var [row,field] = await sql.query(query,[userId]);
    if(row[0]==null)
    return res.status(401).send({"status": false, "code": 401, "msg": "user not registered"}); 
    let query1 = 'SELECT * FROM NFCTAGS WHERE NFCID = ?'
    var [row1,field1] = await sql.query(query1,[nfcID]);
    if(row1[0]==null)
    return res.status(401).send({"status": false, "code": 401, "msg": "Invalid nfc tag"});
    if(row1[0].IsRegistered==true)
    return res.status(401).send({"status": false, "code": 401, "msg": "NFC Tag already registered"});
    
    let query2 = 'UPDATE NFCTAGS SET UserId = ?,PIN = ?,IsRegistered = true,IsActivated = true WHERE NFCID = ?';
    await sql.query(query2,[userId,pin,nfcID]);
    return res.status(200).send({"code":200,"msg":"NFC Registered"});

     }
     catch(e)
     {
         console.log(e);
         return res.status(401).send({"status": false, "code": 401, "msg": "Something wents wrong"});
     }




};


exports.getPaymentByNFC = async(req,res)=>{

    var userId = req.user.UserId;
    var nfcID = req.body.nfcID;
    var pin = req.body.pin;
    var amount = req.body.amount;


    try{

        if(!userId||!nfcID||!pin||!amount)
        return res.status(401).send({"status": false, "code": 401, "msg": "Insufficent query"});
        let query = 'SELECT * FROM users WHERE UserId = ?';
        var [row,field] = await sql.query(query,[userId]);
        if(row[0]==null)
           return res.status(401).send({"status": false, "code": 401, "msg": "user not registered"}); 
        let query1 = 'SELECT * FROM NFCTAGS WHERE NFCID = ?'
        var [row1,field1] = await sql.query(query1,[nfcID]);
        if(row1[0]==null)
        return res.status(401).send({"status": false, "code": 401, "msg": "Invalid nfc tag"});   
        if(row1[0].IsRegistered==false)
        return res.status(401).send({"status": false, "code": 401, "msg": "Invalid nfc tag"});
        if(row1[0].IsActivated==false)
        return res.status(401).send({"status": false, "code": 401, "msg": "NFC tag not activated"});
        var [row2,field2] = await sql.query(query,[row1[0].UserId]);



        var customerId = row1[0].UserId;
        var recieverId = userId;
        var custometBalance = await getWalletBalance(customerId);
        var recieverBalance = await getWalletBalance(recieverId);
        var customerMobile = row2[0].Mobile;
        var RecieverMobile = row[0].Mobile;

        if(row1[0].PIN!=pin)
        return res.status(401).send({"status": false, "code": 401, "msg": "Wrong pin"});
        if(amount>custometBalance)
        return res.status(401).send({"status": false, "code": 401, "msg": "Insufficient Balance"});


        if(amount==0)
        return res.status(401).send({"status": false, "code": 401, "msg": "amount should not be zero"});
        if(customerId==recieverId)
        return res.status(401).send({"status": false, "code": 401, "msg": "cannot initiate transaction"});



        custometBalance = custometBalance-amount;
        recieverBalance = recieverBalance+amount;

        

        var date = new Date();
        var TransactionIdcustomer = uuid('TN');
        var TransactionIdReciever = uuid('TN');
        var TranasctionDetailscustomer = `${amount} rs transferred to ${RecieverMobile} with transaction id ${TransactionIdcustomer}`;
        var TranasctionDetailsReciever = `${amount} rs Recieved from ${customerMobile} with transaction id ${TransactionIdReciever}`;
         
        //update transaction and wallet

        await updateTransaction(TransactionIdcustomer,customerId,0,amount,true,date,custometBalance,'N2W',TranasctionDetailscustomer,RecieverMobile,nfcID);
        await updateTransaction(TransactionIdReciever,recieverId,amount,0,true,date,recieverBalance,'N2W',TranasctionDetailsReciever,customerMobile,nfcID);

        await updateWalletBalance(customerId,custometBalance);
        await updateWalletBalance(recieverId,recieverBalance);

        return res.status(200).send({"code":200,"msg":"Payment Successful"});

            


    }
    catch(e)
    {
        console.log(e);
        return res.status(401).send({"status": false, "code": 401, "msg": "Something wents wrong"});   
    }
      


};



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
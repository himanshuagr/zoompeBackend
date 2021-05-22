const jwt = require('jsonwebtoken');
const otpGenerator = require('otp-generator');
const otpSender = require('../controllers/smsSender');
var redis = require('../modules/redis');
const sql = require('../modules/sql');
const uniqid = require('uniqid');
const config = require('../config/config');


exports.registerUserByMobile = async(req,res)=>{

    
    var mobile = req.body.mobile;
    if(!mobile)
    return res.status(401).send({"status": false, "code": 401, "msg": "mobile number is  missing"});
    try{

    var query ='SELECT UserId FROM users WHERE Mobile = ?';
    var [row,fields] = await sql.query(query,[mobile]);
    if(row[0]!=null)
    return res.status(401).send({"status": false, "code": 401, "msg": "user already registered"}); 
     
    var otp = otpGenerator.generate(6, {digits: true, specialChars: false, upperCase: false, alphabets: false});
    redis.hmset(mobile,{
        'otp' : otp,
        'attempts' : 3,
    });
    redis.expire(mobile,3000);
    otpSender.sendsms(mobile,otp);
    console.log(`your otp is ${otp}`);
    res.status(200).send({"code": 200, "msg": "otp sent please verify otp to register"});

    }
   catch(e){
    console.log("Register error"+e.stack);
    res.status(401).send({"status": false, "code": 401, "msg": "unable to send otp"}); 
   }


};

exports.registerVerifyOtp = async(req,res)=>{

    var mobile = req.body.mobile;
    var otp = req.body.otp;
    if(!mobile)
    return res.status(401).send({"status": false, "code": 401, "msg": "mobile number is  missing"});
    if(!otp)
    return res.status(401).send({"status": false, "code": 401, "msg": "otp is  missing"});
  
    try{

    redis.hgetall(mobile,(err,object)=>{
        if(err)
        return res.status(401).send({"status": false, "code": 401, "msg": "unable to verify otp"});
        if(object==null)
        return res.status(401).send({"status": false, "code": 401, "msg": "unable to verify otp resend otp"});
        if(object.attempts<=0)
        return res.status(401).send({"status": false, "code": 401, "msg": "no attemts left"});
        if(otp!=object.otp)
        {
            try{
                redis.hmset(mobile,{
                    'otp':object.otp,
                    'attempts':object.attempts-1
                });
                return res.status(401).send({"status": false, "code": 401, "msg": "wrong otp"});
            }
            catch(e)
            {
                return res.status(401).send({"status": false, "code": 401, "msg": "please send otp again"});
            }
          
            
        }
        
        if(otp==object.otp)
        {
            redis.del(mobile);
            redis.hmset(mobile,{
                'isVerified':true
            });
           redis.expire(mobile,6000);
            return res.status(200).send({"code": 200, "msg": "otp Verified please go ahead for register"});
        }
        return res.status(401).send({"status": false, "code": 401, "msg": "something wrong happens"});
        
         
    });
    }
    catch(e)
    {

        console.log("otp verification error in registration"+e.stack);
        return res.status(401).send({"status": false, "code": 401, "msg": "unable to verify otp"});

    }
};

exports.register = async (req,res)=>{
  
     var mobile = req.body.mobile;
    if(!mobile)
    return res.status(401).send({"status": false, "code": 401, "msg": "mobile number is  missing"});

    try{
     redis.hgetall(mobile,async(err,object)=>{

        if(err)
        return res.status(401).send({"status": false, "code": 401, "msg": "something wrong happens"});
        if(object==null)
        return res.status(401).send({"status": false, "code": 401, "msg": "unable to register"});
        if(object.isVerified=='true')
         {
             redis.del(mobile);
             var UserId = uniqid('user');
             var FirstName = req.body.FirstName;
             var LastName = req.body.LastName;
             var DOB = req.body.DOB;
             var AccountStarted = new Date();
             var EmailId = req.body.Email;
             let query1 = `INSERT INTO users(UserId,FirstName,LastName,DOB,Mobile,AccountStarted,EmailId) VALUES(?,?,?,?,?,?,?)`;
             await sql.query(query1,[UserId,FirstName,LastName,DOB,mobile,AccountStarted,EmailId]);
             let query2 = 'INSERT INTO wallet(UserId) VALUES(?)';
             await sql.query(query2,[UserId]);
             const token =jwt.sign({UserId:UserId,FirstName:FirstName,Mobile:mobile},config.jwtPrivateKey);
             res.status(200).header('x-auth-token',token).send({"code": 200, "msg": "Registered"});

         }
    })
    }
    catch(e)
    {
        console.log("Register error"+e.stack);
        res.status(401).send({"status": false, "code": 401, "msg": "unable to register"}); 
    }
};


exports.loginByOtp = async(req,res)=>{


    var mobile = req.body.mobile;
    if(!mobile)
    return res.status(401).send({"status": false, "code": 401, "msg": "mobile number is  missing"});
    try{

        let query = 'SELECT UserId FROM users WHERE Mobile = ?';
        var [row,fields] = await sql.query(query,mobile);
        if(!row[0])
        return res.status(401).send({"status": false, "code": 401, "msg": "user not registered"});
        var otp = otpGenerator.generate(6, {digits: true, specialChars: false, upperCase: false, alphabets: false});
        redis.hmset(mobile,{
          'otp' : otp,
          'attempts' : 3,
          });

        redis.expire(mobile,3000);
        otpSender.sendsms(mobile,otp);
        console.log(`your otp is ${otp}`);
        res.status(200).send({"code": 200, "msg": "otp sent please verify otp to login"});
    }
    catch(e)
    {
        console.log("login error"+e.stack);
        res.status(401).send({"status": false, "code": 401, "msg": "unable to send otp"}); 
    }

};

exports.loginVerifyOtp = async(req,res)=>{

    var mobile = req.body.mobile;
    var otp = req.body.otp;
    if(!mobile)
    return res.status(401).send({"status": false, "code": 401, "msg": "mobile number is  missing"});
    if(!otp)
    return res.status(401).send({"status": false, "code": 401, "msg": "otp is  missing"});
    try{
    redis.hgetall(mobile,async(err,object)=>{
        if(err)
        return res.status(401).send({"status": false, "code": 401, "msg": "unable to verify otp"});
        if(object==null)
        return res.status(401).send({"status": false, "code": 401, "msg": "unable to verify otp resend otp"});
        if(object.attempts<=0)
        return res.status(401).send({"status": false, "code": 401, "msg": "no attemts left"});
        if(otp!=object.otp)
        {
            try{
                redis.hmset(mobile,{
                    'otp':object.otp,
                    'attempts':object.attempts-1
                });
                return res.status(401).send({"status": false, "code": 401, "msg": "wrong otp"});
            }
            catch(e)
            {
                return res.status(401).send({"status": false, "code": 401, "msg": "please send otp again"});
            }
          
            
        }
        
        if(otp==object.otp)
        {
            redis.del(mobile);
            let query = 'SELECT * FROM users WHERE Mobile = ?';
            var [row,fields] = await sql.query(query,mobile);
            if(row[0]==null)
            return res.status(401).send({"status": false, "code": 401, "msg": "user not registered"});
            let UserId = row[0].UserId;
            let FirstName = row[0].FirstName;
            const token =jwt.sign({UserId:UserId,FirstName:FirstName,Mobile:mobile},config.jwtPrivateKey);
            return res.status(200).header('x-auth-token',token).send({"code":200,"msg":"user logged in sucessfully"});
        }
        return res.status(401).send({"status": false, "code": 401, "msg": "something wrong happens"});
        
         
    });
    }
    catch(e)
    {
        console.log("otp verification error in registration"+e.stack);
        return res.status(401).send({"status": false, "code": 401, "msg": "unable to verify otp"});
    }


};

exports.getWalletBalance = async(req,res)=>{

     var UserId = req.user.UserId;
     try{
       
        let query = "SELECT * FROM wallet WHERE UserId = ?";
        var [row,field] = await sql.query(query,[UserId]);
        var Balance = row[0].Balance;
        return res.status(200).send({
            "Balance": Balance
        });
     }
     catch(e)
     {
         console.log(e.stack);
        return res.status(401).send({"status": false, "code": 401, "msg": "unable to fetch wallet balance"});
     }

}


exports.getTransactionDetails = async(req,res)=>{

      var UserId = req.user.UserId;
      var index = req.body.index;
      try{
       
        let query = `
        SELECT CreditAmount,DebitAmount,TransactionType,TransactionId,ref,TimeOfTransaction 
        FROM transactions
        WHERE UserId = ? AND IsSuccessful = 1
        ORDER BY TimeOfTransaction ASC;
        `;
        console.log(index);
        var [row,field] = await sql.query(query,[UserId]);
        if(index>=row.length)
         return res.status(300).send();
        var transaction = []; 
        for(var i=index;i<row.length;i++)
        {
               let data={
                   "Credit" : row[i].CreditAmount,
                   "Debit"  : row[i].DebitAmount,
                   "Ref"    : row[i].ref,
                   "Time"   : row[i].TimeOfTransaction,
                   "TransactionId": row[i].TransactionId,
                   "Type"   : row[i].TransactionType
               };
               transaction.push(data);
        } 
        return res.status(200).send(transaction);

      }
      catch(e){
        console.log(e.stack);
        return res.status(401).send({"status": false, "code": 401, "msg": "unable to fetch wallet Transaction Details"});
      }
   


};


exports.getProfile = async(req,res)=>{

    var UserId = req.user.UserId;
    try{

        let query = "SELECT * FROM users WHERE UserId = ?"
        var [row,field] = await sql.query(query,[UserId]);
        if(row[0]==null)
        return res.status(401).send({"status": false, "code": 401, "msg": "unable to load profile"});
         
         res.status(200).send({
             "FirstName" : row[0].FirstName,
             "LastName" : row[0].LastName,
             "Email" : row[0].EmailId,
             "Mobile" : row[0].Mobile
         })

    }
    catch(e)
    {
        console.log(e.stack);
        return res.status(401).send({"status": false, "code": 401, "msg": "unable to load profile"});
    }

}

exports.getMycard = async(req,res)=>{

    var UserId = req.user.UserId;
    try{

        let query = "SELECT * FROM users WHERE UserId = ?"
        var [row,field] = await sql.query(query,[UserId]);
        if(row[0]==null)
        return res.status(401).send({"status": false, "code": 401, "msg": "unable to load profile"});

        let query2 = "SELECT * FROM NFCTAGS WHERE UserId = ?";
        var [row2,field2] = await sql.query(query2,[UserId]);

        if(row2[0]==null)
        return res.status(401).send({"status": false, "code": 401, "msg": "Card not associated with this account"});



         
         res.status(200).send({
             "Name" : row[0].FirstName+" "+row[0].LastName,
             "CardNumber" : row2[0].CardNumber,
             "PIN":row2[0].PIN,
             "NFCID": row2[0].NFCID
             
         })

    }
    catch(e)
    {
        console.log(e.stack);
        return res.status(401).send({"status": false, "code": 401, "msg": "unable to get card"});
    }

        

}
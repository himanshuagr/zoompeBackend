const jwt = require('jsonwebtoken');
const config = require('../config/config');


module.exports = (req,res,next)=>{
  
    const token=req.header('x-auth-token');
    if (!token) return res.status(401).send({"status": false, "code": 401, "msg": "TOKEN_NOT_FOUND"});
    try{
        const decodedTokenData=jwt.verify(token, config.jwtPrivateKey)
        req.user=decodedTokenData  //decodedTokenData= {UserId: "213123421", mobile "6647367657", FirstName: "himanshu"}
        console.log("user",req.user);
        next();
    }
    catch(exception) {
        res.status(401).send({"status": false, "code": 401, "msg": "INVALID_TOKEN"});
    }


}
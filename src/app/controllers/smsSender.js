const request = require('request');

exports.sendsms = (mobile,sms)=>{

    try{
         let url = `https://api.authkey.io/request?authkey=adcf150aff1189b2&mobile=${mobile}&country_code=+91&sms=${sms}`;
         request.get(url);
    }
    catch(e)
    {
        console.log(e);
    }

}
const request = require('request');

exports.sendOtp = (mobile,otp)=>{

    try{
         let url = `https://api.authkey.io/request?authkey=adcf150aff1189b2&mobile=${mobile}&country_code=+91&sms=Hello, your OTP for zoompe app is ${otp}`;
         request.get(url);
    }
    catch(e)
    {
        console.log(e);
    }

}
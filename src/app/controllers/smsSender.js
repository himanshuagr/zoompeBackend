const request = require('request');

exports.sendsms = (mobile,sms)=>{

    try{
         let url = `https://www.fast2sms.com/dev/bulkV2?authorization=LVtaUBbeZolT4szmMESx2DniPCwOGqrI0YWckKAhu59pQFjyg3BUhYprNAZFldfkbRMGwW4JSHCVu98q&route=v3&sender_id=TXTIND&message=your otp for zoompe app is ${sms}&language=english&flash=0&numbers=${mobile}`;
         request.get(url);
    }
    catch(e)
    {
        console.log(e);
    }

}
const express = require('express');
const NFCController = require('../controllers/NFCControllers');
const router = express.Router();
const auth = require('../middleware/auth');


router.post('/registerNFC',auth,NFCController.registerNFC);
router.post('/getPaymentByNFC',auth,NFCController.getPaymentByNFC);





module.exports=router;
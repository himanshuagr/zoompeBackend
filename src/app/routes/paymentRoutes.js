const express = require('express');
const auth = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');
const router = express.Router();


router.post('/addmoneytowallet',auth,paymentController.addmoneytowallet);
router.post('/verifypayment',paymentController.verifypayment);
router.post('/walletTransfer',auth,paymentController.walletTransfer);



module.exports=router;
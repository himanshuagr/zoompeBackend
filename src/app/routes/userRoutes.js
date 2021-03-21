const express = require('express');
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const router = express.Router();


router.post('/registerUserByMobile',userController.registerUserByMobile);
router.post('/registerVerifyOtp',userController.registerVerifyOtp);
router.post('/register',userController.register);
router.post('/loginByOtp',userController.loginByOtp);
router.post('/loginVerifyOtp',userController.loginVerifyOtp);

module.exports=router;
const express = require('express');
const bodyparser = require('body-parser');
const userroutes = require('./app/routes/userRoutes');
const paymentRoutes = require('./app/routes/paymentRoutes');
const nfcRoutes = require('./app/routes/NFCRoutes');
const app = express();
const path = require('path');
require('./doenv');
const PORT = process.env.PORT ||3000;



app.use(bodyparser.json());
app.use(bodyparser.urlencoded({extended:true}));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


app.get('/',(req,res)=>{
   
    res.status(200).send("port started successfully");
    
});

app.use('/user',userroutes);
app.use('/payment',paymentRoutes);
app.use('/nfc',nfcRoutes);




app.listen(PORT,()=>{
    console.log("server started successfully on port 3000");
});
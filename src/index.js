const express = require('express');
const bodyparser = require('body-parser');
const userroutes = require('./app/routes/userRoutes');
const app = express();


app.use(bodyparser.json());
app.use(bodyparser.urlencoded({extended:true}));
app.set('view engine', 'ejs');


app.get('/',(req,res)=>{
    res.status(200).send("port started successfully");
    
});

app.use('/user',userroutes);


app.listen(3000,()=>{
    console.log("server started successfully on port 3000");
});
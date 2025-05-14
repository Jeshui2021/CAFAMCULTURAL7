const express =  require("express");
const path = require("path");

const app = express();





app.get("/", (req, res)=>{

    res.sendFile(path.join(__dirname + "/PROYECTOP1.HTML/"));
});

app.use(express.static("public"))

app.listen(4000, () =>{
    console.log("server runnion on port",4000)
})
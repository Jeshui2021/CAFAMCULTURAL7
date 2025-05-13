const express = require("express")
const path = require("path");

const app = express()

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile("PROYECTOP1.HTML", { root: path.join(__dirname, "public") });
});


app.listen(5000, () => {
console.log("server running on port", 5000)
})
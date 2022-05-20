require("dotenv").config();
var express = require("express");
var app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const dbo = require("./connection/pasdbc");
const PORT = process.env.PORT || 8000;
app.use(cors());
app.use(express.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
// app.use(require("./routes/handler"));
app.use(require("./routes/pas"));

dbo.connectToServer(function (err) {
  if (err) {
    console.error(err);
    process.exit();
  }
  app.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
  });
});

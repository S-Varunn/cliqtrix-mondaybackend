const express = require("express");
const mondayRoutes = express.Router();
const dbo = require("../connection/conn");
mondayRoutes.route("/monday").get(async function (req, res) {
  const dbConnect = dbo.getDb();
  console.log(req);
  dbConnect
    .collection("mondaytoken")
    .findOne(req.query, function (err, result) {
      if (err) {
        res.status(400).json({ message: "Error fetching token" });
      } else {
        res
          .status(200)
          .json({ message: "token successfully retrieved", result: result });
      }
    });
});
mondayRoutes.route("/monday/addtoken").post(function (req, res) {
  const dbConnect = dbo.getDb();
   console.log(req);
  const schema = {
    token_id: req.body.token_id,
    date_added: new Date(),
    token: req.body.token,
  };
  dbConnect.collection("mondaytoken").insertOne(schema, function (err, result) {
    if (err) {
      res.status(400).json({ message: "Error inserting token" });
    } else {
      console.log(`Added a new token`);
      res.status(200).json({ message: "token successfully uploaded" });
    }
  });
});
mondayRoutes.route("/monday/updatetoken").post(function (req, res) {
  const dbConnect = dbo.getDb();
   console.log(req);
  const query = { token_id: req.body.token_id };
  const newToken = req.body.new_token;
  const updates = {
    $set: {
      token: newToken,
    },
  };
  dbConnect
    .collection("mondaytoken")
    .updateOne(query, updates, function (err, _result) {
      if (err) {
        res.status(400).json({ message: "Error updating token!" });
      } else {
        res.status(200).json({ message: "token successfully updated" });
      }
    });
});

mondayRoutes.route("/monday/deletetoken").delete((req, res) => {
  const dbConnect = dbo.getDb();
   console.log(req);
  const query = { token_id: req.query.token_id };

  dbConnect.collection("mondaytoken").deleteOne(query, function (err, _result) {
    if (err) {
      res.status(400).json({ message: "Error deleting token!" });
    } else {
      res.status(200).json({ message: "token successfully deleted" });
    }
  });
});

module.exports = mondayRoutes;

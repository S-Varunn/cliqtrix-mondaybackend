const express = require("express");
const mondayRoutes = express.Router();
const dbo = require("../connection/conn");
const { GraphQLClient } = require("graphql-request");

mondayRoutes.route("/monday").get(async function (req, res) {
  const dbConnect = dbo.getDb();
  console.log(req);
  dbConnect
    .collection("mondaytoken")
    .findOne(req.query, function (err, result) {
      if (err || result == null) {
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

mondayRoutes.route("/monday/getData").get(async function (req, res) {
  const dbConnect = dbo.getDb();
  const referenceId = req.query.reference_id;
  const query = { token_id: referenceId };
  const tokenData = await dbConnect.collection("mondaytoken").findOne(query);
  let token = tokenData.token;
  console.log(token);
  const mondayQuery =
    "{ boards { name groups{title}} boards {  name  items{name  group { title } column_values {title text } } }}";

  const client = new GraphQLClient("https://api.monday.com/v2/", {
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
  });
  client
    .request(mondayQuery)
    .then((data) => {
      cliqDirectExecution(data, referenceId);
      console.log(data, referenceId);
    })
    .catch((err) => {
      cliqMongoExecution(referenceId);
      console.log(err);
    });
  const cliqDirectExecution = async (data, referenceId) => {
    res
      .status(200)
      .json({ message: "Data successfully retrieved", result: data });

    const query = { referenceId: referenceId };
    const checkData = await dbConnect.collection("mondaydata").findOne(query);
    if (!checkData) {
      const schema = {
        referenceId: referenceId,
        date_added: new Date(),
        data: data,
      };
      dbConnect.collection("mondaydata").insertOne(schema);
    } else {
      const updates = {
        $set: {
          data: data,
        },
      };
      dbConnect.collection("mondaydata").updateOne(query, updates);
    }
  };
  const cliqMongoExecution = async (referenceId) => {
    const query = { referenceId: referenceId };
    await dbConnect
      .collection("mondaydata")
      .findOne(query, function (err, result) {
        if (err) {
          res.status(400).json({ message: "Error fetching Data" });
        } else {
          res.status(200).json({ result: result });
        }
      });
  };
});

module.exports = mondayRoutes;

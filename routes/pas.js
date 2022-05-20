const express = require("express");
const pasRoutes = express.Router();
const dbconn = require("../connection/pasdbc");

pasRoutes.route("/pas/addDoubt").post(function (req, res) {
  const dbConnect = dbconn.getDb();
  console.log(req.body);
  const query = { user_id: req.body.userId };
  const doubt_id = Math.floor(Math.random() * 10e20);
  const updates = {
    $push: { doubt_list: doubt_id },
  };
  dbConnect.collection("users-collection").updateOne(query, updates);
  const doubtSchema = {
    id: doubt_id,
    doubt_text: req.body.doubtText,
    priority: req.body.priority,
    remind: req.body.remind,
  };
  dbConnect.collection("doubts").insertOne(doubtSchema, function (err, result) {
    if (err) {
      console.log("Error adding doubt");
      res.status(400).json({ message: "Error adding doubt" });
    }
  });
});
pasRoutes.route("/pas/addResearchNotes").post(function (req, res) {
  const dbConnect = dbconn.getDb();
  const query = { user_id: req.body.userId };
  const research_id = Math.floor(Math.random() * 10e20);
  const updates = {
    $push: { research_notes: research_id },
  };
  dbConnect.collection("users-collection").updateOne(query, updates);
  const researchSchema = {
    id: research_id,
    text: "testing",
  };
  dbConnect.collection("notes").insertOne(researchSchema);
});
pasRoutes.route("/pas/getDoubts").get(function (req, res) {
  const dbConnect = dbconn.getDb();
  const query = { user_id: req.body.userId };
  dbConnect
    .collection("users-collection")
    .findOne(query, function (err, result) {
      const doubtList = result.doubt_list;
      dbConnect
        .collection("doubts")
        .find({ id: { $in: doubtList } })
        .toArray(function (err, result) {
          res.status(200).json({ message: result });
        });
    });
});

pasRoutes.route("/pas/getResearchNotes").get(function (req, res) {
  const dbConnect = dbconn.getDb();
  const query = { user_id: req.body.userId };
  dbConnect
    .collection("users-collection")
    .findOne(query, function (err, result) {
      const researchList = result.research_notes;
      dbConnect
        .collection("notes")
        .find({ id: { $in: researchList } })
        .toArray(function (err, result) {
          res.status(200).json({ message: result });
        });
    });
});
module.exports = pasRoutes;
// {
//   user-id:
//   doubt-list:["doubt_id","dpubt_id"],
//   research-notes:["research-note-id","research-note-id"]
// }
//doubt-list
// {
//   id:"",
//   doubt-texts:"",
//   priority:"",
//   update-time:""
// }
//research-notes
// {
//   id:"",
//   research-texts:""
// }

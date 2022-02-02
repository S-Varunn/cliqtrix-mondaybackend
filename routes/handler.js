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
    "{ boards { name groups{title}} boards {  name  items{name  group { title } column_values {title text} } }}";
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
    console.log(data);
    let result = await formatData(data);
    if (result) {
      res
        .status(200)
        .json({ message: "Data successfully retrieved", result: result });
    }
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
    let unformattedData;
    unformattedData = await dbConnect.collection("mondaydata").findOne(query);
    let formattedResult = await formatData(unformattedData.data);
    if (formattedResult) {
      res.status(200).json({ result: formattedResult });
    }
  };
  const formatData = async (data) => {
    let workingData = data.boards;
    let finalData = {};
    let result = [];
    finalData["unformattedresult"] = workingData;

    workingData.forEach(function (item) {
      let subresult = {};
      subresult.name = item.name;
      boardGroup = item.groups;
      boardItems = item.items;
      boardGroup.forEach(function (group) {
        let arrayResult = [];
        boardItems.forEach(function (value) {
          if (group.title === value.group.title) {
            let column = value.column_values;
            let arrayToObject = {};
            arrayToObject["Task"] = value.name;
            column.forEach(function (col) {
              let title = col.title;
              let text = col.text;
              if (text == null) {
                text = "";
              }
              arrayToObject[title] = text;
            });
            arrayResult.push(arrayToObject);
          }
        });
        subresult[group.title] = JSON.stringify(Object.assign([], arrayResult));
      });
      result.push(subresult);
    });
    finalData["formattedResult"] = result;
    return finalData;
  };
});

mondayRoutes.route("/monday/getStatus/update").post(async function (req, res) {
  const dbConnect = dbo.getDb();
  console.log(req);
  dbConnect.collection("mondaystatus");
  const referenceId = req.body.reference_id;
  const query = { referenceId: referenceId };
  let data = req.body.data;
  const checkStatusData = await dbConnect
    .collection("mondaystatus")
    .findOne(query);
  if (!checkStatusData) {
    const schema = {
      referenceId: referenceId,
      date_added: new Date(),
      data: data,
    };
    dbConnect.collection("mondaystatus").insertOne(schema);
  } else {
    const updates = {
      $set: {
        data: data,
      },
    };
    dbConnect.collection("mondaystatus").updateOne(query, updates);
  }
  res.status(200).json({ message: "Status successfully Updated" });
});

mondayRoutes.route("/monday/getStatus/get").get(async function (req, res) {
  const dbConnect = dbo.getDb();
  console.log(req);
  const referenceId = req.body.reference_id;
  const query = { referenceId: referenceId };
  dbConnect.collection("mondaystatus").findOne(query, function (err, result) {
    if (err || result == null) {
      res.status(400).json({ message: "Error fetching status" });
    } else {
      res
        .status(200)
        .json({ message: "Status successfully retrieved", result: result });
    }
  });
});

mondayRoutes.route("/monday/getPreferredTasks").get(async function (req, res) {
  const dbConnect = dbo.getDb();
  let result = [];
  let tot;
  let referenceId = req.query.reference_id;
  let group = req.query.group;
  let person = req.query.person;
  let boardId = req.query.board_id;
  const query = { token_id: referenceId };
  const tokenData = await dbConnect.collection("mondaytoken").findOne(query);
  let token = tokenData.token;

  let statusQuery = { referenceId: referenceId };
  let statusData = await dbConnect
    .collection("mondaystatus")
    .findOne(statusQuery);

  let mydata = JSON.parse(statusData.data);
  let statusVal = Object.values(mydata);
  tot = statusVal.length;

  statusVal.forEach(function (obj) {
    let keys = Object.keys(obj);
    let values = Object.values(obj);
    let colVal = keys[0];
    let limit = values[0];

    const mondayQuery = `{items_by_column_values( board_id:${boardId}, column_id:status, column_value: "${colVal}" ) { name column_values{  id title text  } group{title}}}`;
    const client = new GraphQLClient("https://api.monday.com/v2/", {
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
    });
    client
      .request(mondayQuery)
      .then((data) => {
        returnDataToCLiq(data, limit, colVal);
      })
      .catch((err) => {
        res.status(200).json({ message: "Data retrieved failed" });
        console.log(err);
      });
  });
  const returnDataToCLiq = async (data, limit, colVal) => {
    let arrayResult = [];
    let count = 0;
    let assignTaskData = data.items_by_column_values;
    assignTaskData.forEach(function (item) {
      if (item) count++;
    });
    let subresult = {};
    subresult.name = colVal;
    for (let i = 0; i < count; i++) {
      if (limit > 0) {
        let tempGroup = assignTaskData[i].group.title;
        if (group === tempGroup) {
          let columnValues = assignTaskData[i].column_values;
          columnValues.forEach(function (check) {
            if (check.id === "person") {
              let tempText = check.text;
              if (
                ((tempText.includes(person + ",") ||
                  tempText.includes(", " + person) ||
                  tempText.includes(", " + person + ",")) &&
                  tempText.includes(person)) ||
                tempText == person
              ) {
                let tempObject = assignTaskData[i];
                let arrayToObject = {};
                arrayToObject["Task"] = tempObject.name;
                columnValues.forEach(function (col) {
                  let title = col.title;
                  let text = col.text;
                  if (text == null) {
                    text = "";
                  }
                  arrayToObject[title] = text;
                });
                arrayResult.push(arrayToObject);
                limit--;
              }
            }
          });
        }
      }
    }
    subresult["value"] = JSON.stringify(Object.assign([], arrayResult));
    sendData(subresult);
  };
  const sendData = async (data) => {
    tot--;
    result.push(data);
    if (tot == 0) {
      if (result.length > 0) {
        res
          .status(200)
          .json({ message: "Data successfully retrieved", result: result });
      } else {
        res.status(200).json({ message: "Data retrieved failed" });
      }
    }
  };
});

module.exports = mondayRoutes;

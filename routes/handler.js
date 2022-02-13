const express = require("express");
const mondayRoutes = express.Router();
const dbo = require("../connection/conn");
const { GraphQLClient } = require("graphql-request");

mondayRoutes.route("/monday").get(async function (req, res) {
  const dbConnect = dbo.getDb();
  dbConnect
    .collection("mondaytoken")
    .findOne(req.query, function (err, result) {
      if (err || result == null) {
        console.log("get failed");
        res.status(400).json({ message: "Error fetching token" });
      } else {
        console.log("get success");
        res
          .status(200)
          .json({ message: "token successfully retrieved", result: result });
      }
    });
});
mondayRoutes.route("/monday/addtoken").post(function (req, res) {
  const dbConnect = dbo.getDb();
  const schema = {
    token_id: req.body.token_id,
    date_added: new Date(),
    token: req.body.token,
  };
  dbConnect.collection("mondaytoken").insertOne(schema, function (err, result) {
    if (err) {
      console.log("Error inserting token");
      res.status(400).json({ message: "Error inserting token" });
    } else {
      console.log(`Added a new token`);
      res.status(200).json({ message: "token successfully uploaded" });
    }
  });
});
mondayRoutes.route("/monday/updatetoken").post(function (req, res) {
  const dbConnect = dbo.getDb();
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
        console.log("Error updating token!");
        res.status(400).json({ message: "Error updating token!" });
      } else {
        console.log("Token successfully updated");
        res.status(200).json({ message: "Token successfully updated" });
      }
    });
});

mondayRoutes.route("/monday/deletetoken").delete((req, res) => {
  const dbConnect = dbo.getDb();
  const query = { token_id: req.query.token_id };

  dbConnect.collection("mondaytoken").deleteOne(query, function (err, _result) {
    if (err) {
      console.log("Error deleting token!");
      res.status(400).json({ message: "Error deleting token!" });
    } else {
      console.log("Token successfully deleted");
      res.status(200).json({ message: "Token successfully deleted" });
    }
  });
});

mondayRoutes.route("/monday/getData").get(async function (req, res) {
  const dbConnect = dbo.getDb();
  const referenceId = req.query.reference_id;
  const query = { token_id: referenceId };
  const tokenData = await dbConnect.collection("mondaytoken").findOne(query);
  let token = tokenData.token;
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
    })
    .catch((err) => {
      if (err.response.errors[0] === "Not Authenticated") {
        res.status(400).json({ message: "Token is invalid" });
      } else {
        console.log("Complexity budget exhausted");
        cliqMongoExecution(referenceId);
      }
    });
  const cliqDirectExecution = async (data, referenceId) => {
    let result = await formatData(data);
    if (result) {
      console.log("Data successfully retrieved");
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
      console.log("Data sent from mongodb");
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
  dbConnect.collection("mondaystatus");
  const referenceId = req.body.reference_id;
  const query = { referenceId: referenceId };
  const backupData = "initially no data";
  const board = "0";
  let data = req.body.data;
  const checkStatusData = await dbConnect
    .collection("mondaystatus")
    .findOne(query);
  if (!checkStatusData) {
    const schema = {
      referenceId: referenceId,
      date_added: new Date(),
      data: data,
      backupData,
      board,
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

  let referenceId = req.body.reference_id;
  if (referenceId == null) {
    referenceId = req.query.reference_id;
  }
  const query = { referenceId: referenceId };
  dbConnect.collection("mondaystatus").findOne(query, function (err, result) {
    if (err || result == null) {
      console.log("Error fetching status");
      res.status(400).json({ message: "Error fetching status" });
    } else {
      console.log("Status successfully retrieved");
      res
        .status(200)
        .json({ message: "Status successfully retrieved", result: result });
    }
  });
});

mondayRoutes.route("/monday/getPreferredTasks").get(async function (req, res) {
  const dbConnect = dbo.getDb();
  let result = [];
  let tot,
    sendDataFromBackend = 0;
  let referenceId = req.query.reference_id;
  let group = req.query.group;
  let person = req.query.person;
  let boardId = req.query.board_id;
  let boardUser = req.query.board;
  const query = { token_id: referenceId };
  const tokenData = await dbConnect.collection("mondaytoken").findOne(query);
  let token = tokenData.token;

  let statusQuery = { referenceId: referenceId };
  let statusData = await dbConnect
    .collection("mondaystatus")
    .findOne(statusQuery);
  let backupData = await statusData.backupData;
  let backupBoard = await statusData.board;
  //Code block to get status title from status id
  let statData;
  let statusTitleComp = "Status";
  let myData = JSON.parse(statusData.data);
  tot = Object.keys(myData).length;
  const statusTextQuery = `{ items (limit:1){ column_values { id title }}}`;
  const statusTitleData = new GraphQLClient("https://api.monday.com/v2/", {
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
  });
  //saving statusTitleComp with the official title in monday.com board
  statusTitleData
    .request(statusTextQuery)
    .then((data) => {
      statData = data.items[0].column_values;
      statData.forEach(function (stat) {
        if (stat.id == "status") {
          statusTitleComp = stat.title;
        }
      });
    })
    .catch((err) => {
      statusTitleComp = "Status";
    });
  for (const obj in myData) {
    let colVal = obj;
    let limit = myData[obj];

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
        if (err.response.errors[0] === "Not Authenticated") {
          res.status(400).json({ message: "Token is invalid" });
        } else {
          sendDataFromBackend = 1;
          tot--;
          if (tot == 0) {
            sendDataFromBackend = 0;
            console.log("Backup Data successfully retrieved");
            res.status(200).json({
              message: "Backup Data successfully retrieved",
              result: backupData,
              board: backupBoard,
            });
          }
        }
      });
  }
  const returnDataToCLiq = async (data, limit, colVal) => {
    let arrayResult = [];
    let botResult = [];
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
                //Object to send data for scheduler bot
                let botObject = {};
                botObject["Task"] = tempObject.name;
                arrayToObject["Task"] = tempObject.name;
                columnValues.forEach(function (col) {
                  let title = col.title;
                  let text = col.text;
                  if (text == null) {
                    text = "";
                  }
                  //Checking if column title same as status
                  if (title == statusTitleComp) {
                    botObject[title] = text;
                  }
                  arrayToObject[title] = text;
                });
                arrayResult.push(arrayToObject);
                //Pushing data to response object
                botResult.push(botObject);
                limit--;
              }
            }
          });
        }
      }
    }
    if (arrayResult.length > 0) {
      subresult["value"] = JSON.stringify(Object.assign([], arrayResult));
      subresult["botData"] = JSON.stringify(Object.assign([], botResult));
    } else {
      subresult["value"] = "No tasks available";
      subresult["botData"] = "No tasks available";
    }
    sendData(subresult);
  };
  const sendData = async (data) => {
    tot--;
    result.push(data);
    if (tot == 0) {
      if (sendDataFromBackend == 0) {
        if (result.length > 0) {
          const updates = {
            $set: {
              backupData: result,
              board: boardUser,
            },
          };
          dbConnect.collection("mondaystatus").updateOne(statusQuery, updates);
          console.log("Preferred task successfully retrieved");
          res.status(200).json({
            message: "Data successfully retrieved",
            result: result,
            board: boardUser,
          });
        } else {
          console.log("Preferred task retrieval failed");
          res.status(200).json({ message: "Data retrieval failed" });
        }
      } else {
        console.log("Preferred task successfully retrieved without updating");
        res.status(200).json({
          message: "Backup Data successfully retrieved",
          result: backupData,
          board: backupBoard,
        });
      }
    }
  };
});

mondayRoutes.route("/monday/getFilterData").get(async function (req, res) {
  const dbConnect = dbo.getDb();
  const referenceId = req.query.reference_id;
  const person = req.query.person;
  const query = { token_id: referenceId };
  const tokenData = await dbConnect.collection("mondaytoken").findOne(query);
  let token = tokenData.token;
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
    })
    .catch((err) => {
      if (err.response.errors[0] === "Not Authenticated") {
        res.status(400).json({ message: "Token is invalid" });
      } else {
        console.log("Complexity budget exhausted");
        cliqMongoExecution(referenceId);
      }
    });
  const cliqMongoExecution = async (referenceId) => {
    const query = { referenceId: referenceId };
    let unformattedData;
    unformattedData = await dbConnect.collection("mondaydata").findOne(query);
    let formattedResult = await formatData(unformattedData.data);
    if (formattedResult) {
      console.log("Data sent from mongodb");
      res.status(200).json({ result: formattedResult });
    }
  };
  const cliqDirectExecution = async (data, referenceId) => {
    let result = await formatData(data);
    if (result) {
      console.log("Data successfully retrieved");
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
  const formatData = async (data) => {
    boards = data.boards;
    let mainArrayObjects = [];
    boards.forEach(function (board) {
      let subObjects = {};
      let myTasks = [];
      let myHeaders = [];
      let groups = board.groups;
      let items = board.items;
      let runOnce = items[0].column_values;
      myHeaders.push("Task");
      runOnce.forEach(function (head) {
        myHeaders.push(head.title);
      });
      groups.forEach(function (myGroup) {
        let grpName = myGroup.title;
        //for MyTasks
        let subMyTasksObj = {};
        let subMyTasks = [];
        items.forEach(function (myItems) {
          if (myItems.group.title == grpName) {
            let flag = 0;
            let colValues = myItems.column_values;
            let val = colValues.map((a) => a.text);
            val.forEach(function (checkPerson) {
              if (checkPerson != "" && checkPerson != null) {
                if (
                  ((checkPerson.includes(person + ",") ||
                    checkPerson.includes(", " + person) ||
                    checkPerson.includes(", " + person + ",")) &&
                    checkPerson.includes(person)) ||
                  checkPerson == person
                ) {
                  flag = 1;
                }
              }
            });
            if (flag == 1) {
              //for MyTasks
              let current = {};
              current["Task"] = myItems.name;
              colValues.forEach(function (col) {
                let title = col.title;
                let text = col.text;
                if (text == null) {
                  text = "";
                }
                current[title] = text;
              });
              subMyTasks.push(current);
              subMyTasksObj.groupName = grpName;
              subMyTasksObj["items"] = JSON.stringify(
                Object.assign([], subMyTasks)
              );
            }
          }
        });
        myTasks.push(subMyTasksObj);
      });
      subObjects.boardName = board.name;
      subObjects.headers = myHeaders;
      subObjects.myTasks = myTasks;
      mainArrayObjects.push(subObjects);
    });
    return mainArrayObjects;
  };
});

module.exports = mondayRoutes;

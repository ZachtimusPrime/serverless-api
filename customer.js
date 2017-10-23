'use strict';
const AWS = require("aws-sdk");
const uuid = require('uuid');

AWS.config.setPromisesDependency(require('bluebird'));
AWS.config.update({
    endpoint: "https://dynamodb.us-east-1.amazonaws.com"
});

const table = "customers";

module.exports.create = (event, context, callback) => {

    // Request validation
    const requestBody = JSON.parse(event.body);
    // const firstName = event['firstName'];
    const firstName = requestBody.firstName;
    // const lastName = event['lastName'];
    const lastName = requestBody.lastName;
    if (typeof firstName !== 'string' || typeof lastName !== 'string') {
        console.error('Validation Failed');
        callback(new Error('Couldn\'t submit new customer because of validation errors.'));
        return;
    }

    // Establish Dynamo connection
    const dynamoDb = new AWS.DynamoDB.DocumentClient();

    // Build DB entry
    const timestamp = new Date().getTime();
    var params = {
        TableName: table,
        Item:{
            "firstName": firstName,
            "lastName": lastName,
            "id": uuid.v1(),
            "submittedAt": timestamp,
            "updatedAt": timestamp
        }
    };

    console.log("Adding a new item...");

    const onPut = (err, data) => {

        if (err) {
            console.error("Unable to add item. Error JSON:" + JSON.stringify(err, null, 2));
            callback(err);
        } else {
            console.log("Added item:" + JSON.stringify(data, null, 2));
            var dataText = JSON.stringify(data, null, 2);
            return callback(null, {
                statusCode: 201,
                body: JSON.stringify({
                    message: ("Added item:" + dataText),
                })
            });
        }

    };

    dynamoDb.put(params, onPut);

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // callback(null, { message: 'Go Serverless v1.0! Your function executed successfully!', event });
};


module.exports.getAll = (event, context, callback) => {

    // Establish Dynamo connection
    const dynamoDb = new AWS.DynamoDB.DocumentClient();


    var params = {
        TableName: table,
        ProjectionExpression: "id, firstName, lastName, updatedAt"
    };

    console.log("Scanning Candidate table.");
    const onScan = (err, data) => {

        if (err) {
            console.log('Scan failed to load data. Error JSON:', JSON.stringify(err, null, 2));
            callback(err);
        } else {
            console.log("Scan succeeded.");
            return callback(null, {
                statusCode: 200,
                body: JSON.stringify({
                    users: data.Items
                })
            });
        }

    };

    dynamoDb.scan(params, onScan);

};


module.exports.delete = (event, context, callback) => {

    // Establish Dynamo connection
    const dynamoDb = new AWS.DynamoDB.DocumentClient();

    // Request validation
    const requestBody = JSON.parse(event.body);
    const user_id = requestBody.id;
    if (typeof user_id !== 'string' || /^[a-zA-Z0-9]{8}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{12}$/.test(user_id) === false) {
        console.error('Validation Failed');
        callback(new Error('Couldn\'t delete customer because of id validation errors.'));
        return;
    }

    var params = {
        TableName: table,
        Key: {
            id: user_id
        }
    };

    console.log("Deleting user from table.");
    dynamoDb.delete(params, callback);
};
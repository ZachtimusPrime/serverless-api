'use strict';
const AWS = require("aws-sdk");
const uuid = require('uuid');

AWS.config.setPromisesDependency(require('bluebird'));
AWS.config.update({
    endpoint: "https://dynamodb.us-east-1.amazonaws.com"
});

const table = "customers";

const collectionHandlers = {
    "GET": listItems,
    "POST": createItem,
}

const itemHandlers = {
    // "GET": getItem,
    "PUT": putItem,
    "DELETE": deleteItem,
}

module.exports.router = (event, context, callback) => {

    let id = (event["pathParameters"] !== null && "id" in event["pathParameters"]) ? event["pathParameters"]["id"] : undefined;
    let handlers = (id === undefined) ? collectionHandlers : itemHandlers;
    let httpMethod = event["httpMethod"];

    if (httpMethod in handlers) {
        return handlers[httpMethod](event, context, callback);
    }

    const response = {
        statusCode: 405,
        body: JSON.stringify({
            message: `Invalid HTTP Method: ${httpMethod}`
        }),
    };

    callback(null, response);
};



function listItems(event, context, callback) {
    // Establish Dynamo connection
    const dynamoDb = new AWS.DynamoDB.DocumentClient();

    var params = {
        TableName: table,
        ProjectionExpression: "id, firstName, lastName, updatedAt"
    };

    console.log("Scanning user table.");
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
}


function createItem(event, context, callback) {
    // Request validation
    const requestBody = JSON.parse(event.body);
    if (!("firstName" in requestBody) === true || !("lastName" in requestBody) || !("username" in requestBody)) {
        console.error('Validation Failed');
        callback(new Error('Couldn\'t submit new customer because of validation errors.'));
        return;
    }

    const firstName = requestBody.firstName;
    const lastName = requestBody.lastName;
    const username = requestBody.username;
    
    if (typeof firstName !== 'string' || typeof lastName !== 'string' || typeof username !== 'string') {
        console.error('Validation Failed');
        callback(new Error('Couldn\'t submit new customer because of validation errors.'));
        return;
    }

    // Establish Dynamo connection
    const dynamoDb = new AWS.DynamoDB.DocumentClient();

    // Build DB entry
    const timestamp = new Date();
    var params = {
        TableName: table,
        Item: {
            "firstName": firstName,
            "lastName": lastName,
            "id": uuid.v1(),
            "username": username,
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
}


function deleteItem(event, context, callback) {
    // Establish Dynamo connection
    const dynamoDb = new AWS.DynamoDB.DocumentClient();

    // Request validation
    const user_id = event["pathParameters"]["id"];
    //const id = event.pathParameters.id;

    if (/^[a-zA-Z0-9]{8}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{12}$/.test(user_id) === false) {
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

    const onDelete = (err, data) => {

        if (err) {
            console.error("Unable to delete item. Error JSON:" + JSON.stringify(err, null, 2));
            callback(err);
        } else {
            console.log("Deleted item:" + JSON.stringify(data, null, 2));
            return callback(null, {
                statusCode: 204
            });
        }
    };

    console.log("Deleting user from table.");
    dynamoDb.delete(params, onDelete);
}


function putItem(event, context, callback) {
    // Establish Dynamo connection
    const dynamoDb = new AWS.DynamoDB.DocumentClient();

    // Request validation
    const user_id = event["pathParameters"]["id"];
    //const id = event.pathParameters.id;

    if (/^[a-zA-Z0-9]{8}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{12}$/.test(user_id) === false) {
        console.error('Validation Failed');
        callback(new Error('Couldn\'t delete customer because of id validation errors.'));
        return;
    }

    var params = {
        TableName: table,
        Key: {
            id: user_id
        }
        ,
        UpdateExpression: "set username = :u",
        ExpressionAttributeValues:{
            ":u":5.5
        },
        ReturnValues:"UPDATED_NEW"
    };

    const onPut = (err, data) => {

        if (err) {
            console.error("Unable to update item. Error JSON:" + JSON.stringify(err, null, 2));
            callback(err);
        } else {
            console.log("Updated item:" + JSON.stringify(data, null, 2));
            return callback(null, {
                statusCode: 200
            });
        }
    };

    console.log("Updating customer's username.");
    dynamoDb.update(params, onPut);
}




// module.exports.create = (event, context, callback) => {

//     // Request validation
//     const requestBody = JSON.parse(event.body);
//     // const firstName = event['firstName'];
//     const firstName = requestBody.firstName;
//     // const lastName = event['lastName'];
//     const lastName = requestBody.lastName;
//     if (typeof firstName !== 'string' || typeof lastName !== 'string') {
//         console.error('Validation Failed');
//         callback(new Error('Couldn\'t submit new customer because of validation errors.'));
//         return;
//     }

//     // Establish Dynamo connection
//     const dynamoDb = new AWS.DynamoDB.DocumentClient();

//     // Build DB entry
//     const timestamp = new Date().getTime();
//     var params = {
//         TableName: table,
//         Item:{
//             "firstName": firstName,
//             "lastName": lastName,
//             "id": uuid.v1(),
//             "submittedAt": timestamp,
//             "updatedAt": timestamp
//         }
//     };

//     console.log("Adding a new item...");

//     const onPut = (err, data) => {

//         if (err) {
//             console.error("Unable to add item. Error JSON:" + JSON.stringify(err, null, 2));
//             callback(err);
//         } else {
//             console.log("Added item:" + JSON.stringify(data, null, 2));
//             var dataText = JSON.stringify(data, null, 2);
//             return callback(null, {
//                 statusCode: 201,
//                 body: JSON.stringify({
//                     message: ("Added item:" + dataText),
//                 })
//             });
//         }

//     };

//     dynamoDb.put(params, onPut);

//   // Use this code if you don't use the http event with the LAMBDA-PROXY integration
//   // callback(null, { message: 'Go Serverless v1.0! Your function executed successfully!', event });
// };


// module.exports.getAll = (event, context, callback) => {

//     // Establish Dynamo connection
//     const dynamoDb = new AWS.DynamoDB.DocumentClient();


//     var params = {
//         TableName: table,
//         ProjectionExpression: "id, firstName, lastName, updatedAt"
//     };

//     console.log("Scanning Candidate table.");
//     const onScan = (err, data) => {

//         if (err) {
//             console.log('Scan failed to load data. Error JSON:', JSON.stringify(err, null, 2));
//             callback(err);
//         } else {
//             console.log("Scan succeeded.");
//             return callback(null, {
//                 statusCode: 200,
//                 body: JSON.stringify({
//                     users: data.Items
//                 })
//             });
//         }

//     };

//     dynamoDb.scan(params, onScan);

// };


// module.exports.delete = (event, context, callback) => {

//     // Establish Dynamo connection
//     const dynamoDb = new AWS.DynamoDB.DocumentClient();

//     // Request validation
//     const requestBody = JSON.parse(event.body);
//     const user_id = requestBody.id;
//     if (typeof user_id !== 'string' || /^[a-zA-Z0-9]{8}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{12}$/.test(user_id) === false) {
//         console.error('Validation Failed');
//         callback(new Error('Couldn\'t delete customer because of id validation errors.'));
//         return;
//     }

//     var params = {
//         TableName: table,
//         Key: {
//             id: user_id
//         }
//     };

//     console.log("Deleting user from table.");
//     dynamoDb.delete(params, callback);
// };
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
        ProjectionExpression: "id, firstName, lastName, username, email, updatedAt"
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


function validateEmail(email) {
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

function validateUsername(username) {
    var re = /^[a-zA-Z0-9]{1,16}$/;
    return re.test(username);
}

function validateId(Id) {
    var re = /^[a-zA-Z0-9]{8}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{12}$/;
    return re.test(Id);
}

function createItem(event, context, callback) {
    // Request validation
    const requestBody = JSON.parse(event.body);
    if (!("firstName" in requestBody) === true || !("lastName" in requestBody) || !("username" in requestBody) || !("email" in requestBody)) {
        console.error('Validation Failed');
        callback(new Error('Couldn\'t submit new customer because of validation errors.'));
        return;
    }

    const firstName = requestBody.firstName;
    const lastName = requestBody.lastName;
    const username = requestBody.username;
    const email = requestBody.email;

    
    if (typeof firstName !== 'string' || typeof lastName !== 'string' || typeof username !== 'string' || validateEmail(email) === false) {
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
        Item: {
            "firstName": firstName,
            "lastName": lastName,
            "id": uuid.v1(),
            "username": username,
            "submittedAt": timestamp,
            "lastUpdated": timestamp,
            "email": email
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

    if (validateId(user_id) === false) {
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

    if (validateId(user_id) === false) {
        console.error('Validation Failed');
        callback(new Error('Couldn\'t update customer because of id validation errors.'));
        return;
    }

    const requestBody = JSON.parse(event.body);
    if (!("username" in requestBody) === true && !("email" in requestBody) === true) {
        console.error('Validation Failed');
        callback(new Error('Couldn\'t submit update to customer record because of validation errors.'));
        return;
    }

    var attributes = {
        ":lastUpdated": new Date().getTime()
    };

    if ('username' in requestBody && validateUsername(requestBody.username) === true) {
        attributes[':username'] = requestBody.username
    }

    if ('email' in requestBody && validateEmail(requestBody.email) === true) {
        attributes[':email'] = requestBody.email
    }

    var expression = ("set");
    Object.keys(attributes).forEach(function(key) {
        expression += (" " + key.slice(1,key.length) + " = " + key + ",")
    });


    var params = {
        TableName: table,
        Key: {
            id: user_id
        },
        UpdateExpression: expression.slice(0,-1),
        ExpressionAttributeValues: attributes,
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
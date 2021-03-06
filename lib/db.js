'use strict';
var AWS = require('aws-sdk');
var jwt = require('jsonwebtoken');
var log = require('./log');
var uuid = require('uuid');
var secrets = require('./secrets');

var docClient = new AWS.DynamoDB.DocumentClient();

const REFRESH_TOKEN_TABLE = process.env.REFRESH_TOKEN_TABLE;
const USER_TABLE = process.env.USERS_TABLE;

//NOTE: the role associated with the client Lambda function needs to have "AmazonDynamoDBFullAccess" priveledges
module.exports = {
    //NOTE: issueDate and expirationDate are encoded within the token - is it necassary to store separately in db?    
    saveTokens: function(refreshToken, accessToken, userId, clientId) {
        let decodedRToken = jwt.decode(refreshToken);

        return new Promise((resolve, reject) => {
            let params = {
                TableName: REFRESH_TOKEN_TABLE,
                Item: {
                    RefreshToken: refreshToken,
                    PrincipalId: userId,
                    AccessToken: accessToken,
                    ClientId: clientId,
                    IssuedAt: decodedRToken.iat,
                    ExpiresAt: decodedRToken.exp,
                    SessionCreatedAt: decodedRToken.iat
                }
            };

            docClient.put(params, (err, data) => {
                if (err) return reject(err);

                resolve(data);
            });
        });
    },
    saveUser: function(profileData, clientId) {

        if(!profileData.account_type) {
            return Promise.reject('account_type was not provided');
        }

        if(!clientId) {
            return Promise.reject('clientId not provided');
        }

        let dateCreated = Math.floor(Date.now() / 1000);
        let dateModified = dateCreated;
        let id = '';

        if(profileData.account_type === 'traditional') {
            id = `${uuid.v4()}|${profileData.account_type}`;
        } else if (!!profileData.id) {
            id = `${profileData.id}|${profileData.account_type}`;
        } else {
            return Promise.reject(`no id provided for ${profileData.account_type} account_type`);
        }

        //TODO: add other interesting profile data to this item
        let item = {
            Id: id,
            ClientId: clientId,
            Type: profileData.account_type,
            Email: profileData.email,
            DateCreated: dateCreated,
            DateModified: dateModified
        };

        if (!!profileData.password) {
            item.Password = secrets.passwordDigest(profileData.password);
        }

        return new Promise((resolve, reject) => {
            let params = {
                    TableName: USER_TABLE,
                    Item: item
                };

                docClient.put(params, (err, data) => {
                    if (err) return reject(err);

                    resolve(data);
                });
            });   
    },
    getUser: function(profileData) {
        let params = { TableName: USER_TABLE };        
        if (!!profileData.id) {
            params.KeyConditionExpression = 'Id = :hk_val';
            params.ExpressionAttributeValues = { ':hk_val': profileData.id };
        } else if (!!profileData.email && !!profileData.password) {            
            params.IndexName = 'Email-index';
            params.KeyConditionExpression = '#hashkey = :hk_val';
            params.ExpressionAttributeNames = { '#hashkey': 'Email' };
            params.ExpressionAttributeValues = { ':hk_val': profileData.email };
        } else {
            return Promise.reject('incomplete profile data: id or email + password required');
        }

        return new Promise((resolve, reject) => {            
            docClient.query(params, (err, data) => {
                if (err) return reject(err);

                if (data.Items.length == 1) {
                    let user = data.Items[0];                    
                    if(profileData.password && user.Password !== secrets.passwordDigest(profileData.password)) {
                        return reject('password is incorrect');
                    }

                    resolve(user);
                } else {
                    resolve(undefined);
                }
            });
        });   
    },
    getTokens: function(refreshToken) {
        return new Promise((resolve, reject) => {
            let params = {
                    TableName: REFRESH_TOKEN_TABLE,
                    Key: { 'RefreshToken': refreshToken }
                };

            docClient.get(params, (err, data) => {
                if (err) return reject(err);
                resolve(data.Item);
            });   
        });   
    },
    deleteTokens: function(refreshToken) {
        return new Promise((resolve, reject) => {
            let params = {
                    TableName: REFRESH_TOKEN_TABLE,
                    Key: {"RefreshToken": refreshToken}
                };

                docClient.delete(params, (err, data) => {
                    if (err) return reject(err);
                    resolve(data);
                });
            });
    }
};

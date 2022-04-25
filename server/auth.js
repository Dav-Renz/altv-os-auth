/// <reference types="@altv/types-server" />
import alt from 'alt-server';
import { MSGS } from './messages';
import * as sm from 'simplymongo';
import { encryptPassword, verifyPassword } from './encryption';
import chalk from 'chalk';

const db = sm.getDatabase();

alt.onClient('auth:Try', handleAuthAttempt);
alt.on('auth:Done', debugDoneAuth);
alt.on('auth:writeModel', writeModel);
alt.on('auth:getModel', getModel);

/**
 * Route the method the player is using to login.
 * Register or Login.
 * @param  {alt.Player} player
 * @param  {String} username
 * @param  {String} password
 * @param  {String | null} email
 */
async function handleAuthAttempt(player, username, password, email) {
    if (!player || !player.valid) {
        return;
    }

    if (!username || !password) {
        alt.emitClient(player, 'auth:Error', MSGS.UNDEFINED);
    }

    if (email) {
        handleRegistration(player, email, username, password);
        return;
    }

    handleLogin(player, username, password);
}

/**
 * Handle the registration of a player.
 * @param {alt.Player} player
 * @param  {String} email
 * @param  {String} username
 * @param  {String} password
 */
async function handleRegistration(player, email, username, password) {
    const emails = await db.fetchAllByField('email', email, 'accounts');
    if (emails.length >= 1) {
        alt.emitClient(player, 'auth:Error', MSGS.EXISTS);
        return;
    }

    const usernames = await db.fetchAllByField('username', username, 'accounts');
    if (usernames.length >= 1) {
        alt.emitClient(player, 'auth:Error', MSGS.EXISTS);
        return;
    }
	
	const allowed = false;

    const document = {
        email,
        username,
	allowed,
        password: encryptPassword(password)
    };

    const dbData = await db.insertData(document, 'accounts', true);
    alt.emitClient(player, 'auth:Error', MSGS.ACIVATION);
    alt.emit('auth:Registered', player, dbData._id.toString(), dbData.username, dbData.email);
}

/**
 * Handle the login of a player.
 * @param  {alt.Player} player
 * @param  {String} username
 * @param  {String} password
 */
async function handleLogin(player, username, password) {
    const accounts = await db.fetchAllByField('username', username, 'accounts');
    const models = await db.fetchAllByField('username', userName, 'models');


    if (accounts.length <= 0) {
        alt.emitClient(player, 'auth:Error', MSGS.INCORRECT);
        return;
    }

    if (!verifyPassword(password, accounts[0].password)) {
        alt.emitClient(player, 'auth:Error', MSGS.INCORRECT);
        return;
    }
	
	if (!accounts[0].allowed) {
        alt.emitClient(player, 'auth:Error', MSGS.NOTALLOWED);
        return;
    }

    let model = null;

    if (models.length >= 1) {
        model =  models[0].model;
    }
    
    alt.emit('auth:Done', player, accounts[0]._id.toString(), accounts[0].username, accounts[0].email, model);
}

/**
 * Simply to log a successful authentication to console.
 * @param  {alt.Player} player
 * @param  {String} id
 * @param  {String} username
 * @param  {String} email
 */
function debugDoneAuth(player, id, username, email) {
    console.log(chalk.cyanBright(`[OS] Authenticated - ${username} - ${id}`));
}

async function writeModel(userName, modelName) {

	const models = await db.fetchAllByField('username', userName, 'models');

    let updated = false;
	
	if (models.length > 0) {
        await db.updatePartialData(models[0]._id, {model: modelName}, 'models'); 
        updated = true;
	}
	else {
		const dbData = await db.insertData({username: userName, model: modelName}, 'models', true);
        updated = false;
	}
	
	if (updated) {
        alt.emit('auth:ModelSaved', models[0].username, modelName);
    }
    else {
        alt.emit('auth:ModelSaved', dbData.username, dbData.model);

    }
	
}

async function getModel(userName, emit) {

    const models = await db.fetchAllByField('username', userName, 'models');

    if (emit) {
        if (models.length >= 1) {
            alt.emit('auth:ModelGetted', models[0].model)
        }
        else {
            alt.emit('auth:noModel')
        }
    }
    else {
        if (models.length >= 1) {
            return models[0].model;
        }
        else {
            return null
        }
    }    

}

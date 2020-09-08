"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("../models");
const bots_1 = require("../bots");
const path = require("path");
const constants = require(path.join(__dirname, '../../config/constants.json'));
/*
default show or not
restrictions (be able to toggle, or dont show chat)
*/
// return bool whether to skip forwarding to tribe
function isBotMsg(msg, sentByMe) {
    return __awaiter(this, void 0, void 0, function* () {
        const txt = msg.message.content;
        const msgType = msg.type;
        if (msgType === constants.message_types.bot_res) {
            return false; // bot res msg type not for processing
        }
        const chat = yield models_1.models.Chat.findOne({ where: {
                uuid: msg.chat.uuid
            } });
        if (!chat)
            return false;
        let didEmit = false;
        if (txt.startsWith('/bot ')) {
            bots_1.builtinBotEmit(msg);
            didEmit = true;
        }
        console.log("DID EMIT", didEmit);
        if (didEmit)
            return didEmit;
        const botsInTribe = yield models_1.models.ChatBot.findAll({ where: {
                chatId: chat.id
            } });
        if (!(botsInTribe && botsInTribe.length))
            return false;
        yield asyncForEach(botsInTribe, (botInTribe) => __awaiter(this, void 0, void 0, function* () {
            console.log('botInTribe.botPrefix', botInTribe.botPrefix);
            if (botInTribe.msgTypes) {
                try {
                    const msgTypes = JSON.parse(botInTribe.msgTypes);
                    if (msgTypes.includes(msgType)) {
                        bots_1.builtinBotEmit(msg);
                        didEmit = true;
                    }
                }
                catch (e) { }
            }
            else if (txt.startsWith(`${botInTribe.botPrefix} `)) {
                bots_1.builtinBotEmit(msg);
                didEmit = true;
            }
        }));
        return didEmit;
    });
}
exports.isBotMsg = isBotMsg;
function asyncForEach(array, callback) {
    return __awaiter(this, void 0, void 0, function* () {
        for (let index = 0; index < array.length; index++) {
            yield callback(array[index], index, array);
        }
    });
}
//# sourceMappingURL=intercept.js.map
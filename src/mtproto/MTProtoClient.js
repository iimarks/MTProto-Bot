"use strict";

const { MTProto } = require("telegram-mtproto");
const { MTProtoConfig } = require("../config");
const { Storage } = require("./Storage");

const md5 = require("md5");

class MTProtoClient {
  constructor(api_id, api_hash) {
    this.__storage = new Storage();

    this.__api_hash = api_hash;
    this.__api_id = api_id;

    this.__phone_code_hash = null;
    this.__phone = null;

    this.__connector = MTProto({
      app: { storage: this.__storage },
      server: MTProtoConfig.server,
      api: MTProtoConfig.api
    });
  }

  request(query, config) {
    const start = new Date();
    return new Promise((resolve, reject) => {
      this.__connector(query, config)
        .then(res => {
          const stop = new Date() - start;
          console.log(`Response time for ${query} is ${stop}ms`);
          // console.log(`Config: ${JSON.stringify(config, undefined, 2)}`);
          return resolve(res);
        })
        .catch(err => {
          return reject(err);
        });

      setTimeout(() => {
        return reject({
          code: 500,
          message: "Timeout"
        });
      }, 10000);
    });
  }

  /* Registration / Authorization ------------------------------ */

  async authSendCode(phone) {
    const config = {
      phone_number: phone,
      current_number: false,
      api_id: this.__api_id,
      api_hash: this.__api_hash
    };

    const response = await this.request("auth.sendCode", config);

    this.__phone_code_hash = response.phone_code_hash;
    this.__phone = phone;

    return response;
  }

  async authSignIn(code) {
    const config = {
      phone_code: code,
      phone_number: this.__phone,
      phone_code_hash: this.__phone_code_hash
    };

    const response = await this.request("auth.signIn", config);

    return response;
  }

  /* Working with Messages ------------------------------ */

  /**
   * Fetches your last dialogs
   * @name messagesGetDialogs
   * @function
   * @param {Number} offset
   * @param {Number} limit
   */
  
  async messagesGetDialogs(offset, limit) {
    const config = {
      offset,
      limit
    };

    const response = await this.request("messages.getDialogs", config);

    return response;
  }

  /**
   * Adds user to general groups
   * 
   * @name messagesAddChatUser
   * @function
   * @param {Number} chat_id
   * @param {Number} user_id
   * @param {String} access_hash
   * @param {Number} fwd_limit
   */

  async messagesAddChatUser(chat_id, user_id, access_hash, fwd_limit = 50) {
    const inputUser = {
      _: "inputUser",
      user_id,
      access_hash
    };

    const config = {
      chat_id,
      user_id: inputUser,
      fwd_limit
    };

    const response = await this.request("messages.addChatUser", config);

    return response;
  }

  /* Working with Channels ------------------------------ */

  /**
   * Adds user to supergroup or channel
   *
   * @name channelsInviteToChannel
   * @function
   * @param  {Number} channel_id
   * @param  {String} channel_access_hash
   * @param  {Array} users
   */

  async channelsInviteToChannel(channel_id, channel_access_hash, users) {
    const inputChannel = {
      _: "inputChannel",
      channel_id,
      access_hash: channel_access_hash
    };

    const config = {
      channel: inputChannel,
      users: users
    };

    const response = await this.request("channels.inviteToChannel", config);

    return response;
  }

  /**
   * Returns a vector of participants
   *
   * @name channelsGetParticipants
   * @function
   * @param {Number} channel_id
   * @param {String} channel_access_hash
   * @param {Number} offset
   * @param {Number} limit
   */

  async channelsGetParticipants(
    channel_id,
    channel_access_hash,
    offset,
    limit
  ) {
    const inputChannel = {
      _: "inputChannel",
      channel_id,
      access_hash: channel_access_hash
    };

    const filter = {
      _: "channelParticipantsRecent"
    };

    const config = {
      channel: inputChannel,
      hash: inputChannel.access_hash,
      offset,
      limit,
      filter
    };

    const response = await this.request("channels.getParticipants", config);

    return response;
  }

  /* Working with Contacts ------------------------------ */

  async contactsGetContacts(contactsList) {
    const config = contactsList ? { hash: md5(contactsList).hash } : {};

    const response = await this.request("contacts.getContacts", config);

    return response;
  }

  async contactsImportContacts(contactInfo, replace, prefix = "") {
    const inputPhoneContact = {
      _: "inputPhoneContact",
      client_id: contactInfo.user_id,
      phone: contactInfo.phone_number,
      first_name: prefix + contactInfo.first_name
    };

    const config = {
      contacts: [inputPhoneContact],
      replace
    };

    const response = await this.request("contacts.importContacts", config);

    return response;
  }
}

module.exports = MTProtoClient;

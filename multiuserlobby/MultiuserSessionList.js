
import crypto from 'crypto';

import { MultiuserUser } from './MultiuserUser.js';
import { MultiuserSession } from './MultiuserSession.js';

// This string contains characters that can be included in an access code.
// It doesn't have easy to confuse characters like 1, I, 0 and O.
const accessCodeChars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

const genAccessCode = function(length) {
  const randomBytes = crypto.randomBytes(length);
  let arr = [];
  const mul = accessCodeChars.length / 256;
  for (let i = 0; i < length; ++i) {
    arr.push(accessCodeChars[Math.floor(randomBytes[i] * mul)]);
  }
  return arr.join('');
}

class MultiuserSessionList {

  constructor(accessCodeLength, maxUserNameLength) {
    this.accessCodeLength = accessCodeLength;
    this.maxUserNameLength = maxUserNameLength;

    this.allRegisteredUsers = [];  // Array of "MultiuserUser". TODO: Maybe support removing users after a timeout?
    this.ongoingSessions = [];  // All ongoing sessions.
    this.ongoingSessionsByAccessCode = {};  // Map from access code to session.
    this.ongoingSessionsByUserId = {};  // Map from user id to session.
  }

  tryRegisterUser(httpSession, userName) {
    if (httpSession.hasOwnProperty("multiuserId")) {
      // Already registered.
      return;
    }
    if (userName.length > this.maxUserNameLength) {
      userName = userName.substring(0, this.maxUserNameLength);
    }
    httpSession.multiuserId = this.allRegisteredUsers.length + 1;
    this.allRegisteredUsers.push(new MultiuserUser(httpSession.multiuserId, userName));
    return httpSession.multiuserId;
  }

  getUser(httpSession) {
    if (!httpSession.hasOwnProperty("multiuserId")) {
      return null;
    }
    if (httpSession.multiuserId < 1 || httpSession.multiuserId > this.allRegisteredUsers.length) {
      return null;
    }
    return this.allRegisteredUsers[httpSession.multiuserId - 1];
  }

  // TODO: Support destroying sessions automatically after a timeout from all users.
  startSession(users, sessionOptions) {
    const session = new MultiuserSession(genAccessCode(this.accessCodeLength), users, sessionOptions);
    this.ongoingSessions.push(session);
    this.ongoingSessionsByAccessCode[session.accessCode] = session;
    for (const user of users) {
      this.tryLeaveSession(user);
      this.ongoingSessionsByUserId[user.id] = session;
    }
    return session;
  }

  tryJoinSession(accessCode, user) {
    if (!this.ongoingSessionsByAccessCode.hasOwnProperty(accessCode)) {
      return false;
    }
    const session = this.ongoingSessionsByAccessCode[accessCode];
    if (!session.tryJoin(user)) {
      return false;
    }
    this.ongoingSessionsByUserId[user.id] = session;
    return true;
  }

  tryLeaveSession(user) {
    if (!this.ongoingSessionsByUserId.hasOwnProperty(user.id)) {
      return false;
    }
    const session = this.ongoingSessionsByUserId[user.id];
    if (!session.tryLeave(user)) {
      return false;
    }
    delete this.ongoingSessionsByUserId[user.id];
    this.cleanPossiblyEmptySession(session);
    return true;
  }

  cleanPossiblyEmptySession(session) {
    if (session === null) {
      return;
    }
    if (session.users.length > 0) {
      return;
    }
    this.ongoingSessions.splice(this.ongoingSessions.indexOf(session), 1);
    delete this.ongoingSessionsByAccessCode[session.accessCode];
  }

  getCurrentSessionForUser(user) {
    if (user === null) {
      return null;
    }
    if (!this.ongoingSessionsByUserId.hasOwnProperty(user.id)) {
      return null;
    }
    return this.ongoingSessionsByUserId[user.id];
  }

}

export { MultiuserSessionList }

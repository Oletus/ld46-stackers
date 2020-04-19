
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

  constructor(accessCodeLength) {
    this.accessCodeLength = accessCodeLength;

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

  // TODO: Support destroying sessions automatically after a timeout or once all users leave.
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
    if (session.tryJoin(user)) {
      this.ongoingSessionsByUserId[user.id] = session;
      return true;
    }
  }

  tryLeaveSession(user) {
    if (!this.ongoingSessionsByUserId.hasOwnProperty(user.id)) {
      return false;
    }
    const session = this.ongoingSessionsByUserId[user.id];
    if (!session.tryLeave(user.id)) {
      return false;
    }
    delete this.ongoingSessionsByUserId[user.id];
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

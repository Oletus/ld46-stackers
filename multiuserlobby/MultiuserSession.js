
import { escapeHTML } from './htmlUtil.js';

class MultiuserSession {

  constructor(accessCode, users, apiOptions) {
    this.accessCode = accessCode;
    this.users = users;

    const defaultOptions = {
      userCountLimit: -1,
      canJoinAfterAppStart: false,
    };
    this.options = {...defaultOptions, ...apiOptions};

    this.appState = null;
    this.lastCreateStateFunc = null;
  }

  tryJoin(user) {
    let userIndex = this.users.indexOf(user);
    if (userIndex >= 0) {
      return false;
    }
    if (this.appState !== null && !this.options.canJoinAfterAppStart) {
      return false;
    }
    if (this.options.userCountLimit >= 0 && this.users.length >= this.options.userCountLimit) {
      return false;
    }
    this.users.push(user);
    if (this.appState !== null) {
      this.appState.onUserJoined(user);
    }
    return true;
  }

  tryLeave(user) {
    let userIndex = this.users.indexOf(user);
    if (userIndex < 0) {
      return false;
    }
    this.users.splice(userIndex, 1);
    if (this.appState !== null) {
      this.appState.onUserLeft(user);
    }
    return true;
  }

  startApp(createStateFunc) {
    this.lastCreateStateFunc = createStateFunc;
    this.appState = this.lastCreateStateFunc(this.users);
  }

  restartApp() {
    if (this.lastCreateStateFunc !== null) {
      this.appState = this.lastCreateStateFunc(this.users);
    }
  }

  userNameList(excludeUser) {
    if (excludeUser) {
      return this.users.filter(user => user != excludeUser).map(x => x.name);
    } else {
      return this.users.map(x => x.name);
    }
  }

  userNameListHTML(excludeUser) {
    return this.userNameList(excludeUser).map(name => escapeHTML(name)).join(', ');
  }

}

export { MultiuserSession }


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
  }

  tryJoin(user) {
    let userIndex = this.users.indexOf(user);
    if (userIndex >= 0) {
      return false;
    }
    if (this.appState !== null && !this.options.canJoinAfterAppStart) {
      return false;
    }
    if (this.users.length >= this.options.userCountLimit) {
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
    this.appState = createStateFunc(this.users);
  }

}

export { MultiuserSession }

let currentSession = null;

function startSession(channel) {
  if (currentSession) return false;
  currentSession = {
      channel,
      encounters: [],      // successful clears
      failedLogs: {},      // { strikeId: [logUrl1, logUrl2] }
      records: [],         // new records this session
      sessionMessage: null // message that gets edited every log
  };

  return true;
}

function endSession() {
  currentSession = null;
}

function getSession() {
  return currentSession;
}

function getEncounters() {
  return currentSession ? currentSession.encounters : [];
}

function getRecords() {
  return currentSession ? currentSession.records : [];
}

function isActive() {
  return currentSession !== null;
}

function setSessionMessage(message) {
  if (currentSession) currentSession.message = message;
}

function addEncounter(encounter) {
  if (currentSession) currentSession.encounters.push(encounter);
}

function addRecord(record) {
  if (currentSession) currentSession.records.push(record);
}

module.exports = {
  startSession,
  endSession,
  getSession,
  isActive,
  setSessionMessage,
  addEncounter,
  addRecord,
  getEncounters,
  getRecords
};

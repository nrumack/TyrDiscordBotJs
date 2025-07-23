let currentSession = null;

function startSession(channel, context = {}) {
  if (currentSession) return false;
  currentSession = {
      channel,
      encounters: [],      // successful clears
      records: [],         // new records this session
      sessionMessage: null, // message that gets edited every log
      context,
      isFinished: false
  };

  return true;
}

function resetSession() {
  currentSession = null;
}

function endSession() {
  if(currentSession) currentSession.isFinished = true;
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
  if (currentSession) currentSession.sessionMessage = message;
}

function addEncounter(encounter) {
  if (!currentSession) throw new Error('No active session');
    currentSession.encounters.push(encounter);
}

function addRecord(record) {
  if (!currentSession) throw new Error('No active session');
  currentSession.records.push(record);
}

export default {
  startSession,
  endSession,
  getSession,
  isActive,
  setSessionMessage,
  addEncounter,
  addRecord,
  getEncounters,
  getRecords,
  resetSession
};

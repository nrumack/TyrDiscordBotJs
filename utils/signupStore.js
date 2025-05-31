const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../data/signups.json');

function load() {
  if (!fs.existsSync(filePath)) return {};
  const data = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(data);
}

function save(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Count total signup events.
 */
function count() {
  const signups = load();
  return Object.keys(signups).length;
}

/**
 * Create a new signup.
 */
function create(messageId, signupData) {
  if (!messageId) throw new Error('messageId is required');
  const signups = load();
  signups[messageId] = signupData;
  save(signups);
}

/**
 * Get signup data by message ID.
 */
function get(messageId) {
  return load()[messageId];
}

/**
 * Update existing signup data.
 */
function update(messageId, signupData) {
  const signups = load();
  signups[messageId] = signupData;
  save(signups);
}

/**
 * Delete a signup entry.
 */
function remove(messageId) {
  const signups = load();
  delete signups[messageId];
  save(signups);
}

/**
 * Add a user to a specific category (yes, no, backup),
 * removing them from others first.
 */
function addUser(messageId, category, userId) {
  const signups = load();
  const signup = signups[messageId];
  if (!signup) throw new Error('Signup not found');

  // Remove from all categories
  ['yes', 'no', 'backup'].forEach(cat => {
    signup[cat] = signup[cat].filter(id => id !== userId);
  });

  // Add to target category
  if (!signup[category]) signup[category] = [];
  signup[category].push(userId);

  save(signups);
}

// Export cleanly
module.exports = {
  load,
  save,
  count,
  create,
  get,
  update,
  remove,
  addUser
};

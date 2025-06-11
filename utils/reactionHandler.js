const { EmbedBuilder } = require('discord.js');

// Export a function to register event handlers on the client
module.exports = function registerReactionHandlers(client) {
  client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;

    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (err) {
        console.error('Failed to fetch reaction:', err);
        return;
      }
    }

    handleSignupReaction(reaction, user, true, client);
  });

  client.on('messageReactionRemove', async (reaction, user) => {
    if (user.bot) return;

    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (err) {
        console.error('Failed to fetch reaction:', err);
        return;
      }
    }

    handleSignupReaction(reaction, user, false, client);
  });
};

async function handleSignupReaction(reaction, user, added, client) {
  const message = reaction.message;

  if (!message.embeds.length || !message.embeds[0].footer?.text?.startsWith('signup-')) return;

  // Create a fresh EmbedBuilder from the message embed
  const embed = EmbedBuilder.from(message.embeds[0]);
  const fields = embed.data.fields;

  const getField = (name) => fields.find(f => f.name.startsWith(name));
  const emojis = {
    '✅': '✅ Yes',
    '❌': '❌ No',
    '🕗': '🕗 Backup',
  };

  const allEmojis = Object.keys(emojis);
  if (!allEmojis.includes(reaction.emoji.name)) return;

  // Remove user from all categories first
  for (let key of allEmojis) {
    const label = emojis[key];
    const field = getField(label);
    if (field && field.value.includes(`<@${user.id}>`)) {
      const names = field.value
        .split('\n')
        .filter(line => line !== `<@${user.id}>`);
      field.value = names.length ? names.join('\n') : 'None';
      field.name = `${label} (${names.length})`;
    }
  }

  if (added) {
    const field = getField(emojis[reaction.emoji.name]);
    let names = field.value === 'None' ? [] : field.value.split('\n');
    names.push(`<@${user.id}>`);
    field.value = names.join('\n');
    field.name = `${emojis[reaction.emoji.name]} (${names.length})`;
  }

  await message.edit({ embeds: [embed] });
}

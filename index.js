// index.js
import { Client, GatewayIntentBits, Partials, Collection } from 'discord.js';
import path from 'path';
import fs from 'fs';
import chokidar from 'chokidar';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import './server/expressServer.js'

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const token = process.env.DISCORD_TOKEN;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');

// 🔄 Dynamically load and reload commands using import()
async function loadCommand(file) {
  try {
    const filePath = path.join(commandsPath, file);
    const fileUrl = `file://${filePath}?update=${Date.now()}`;
    const { default: command } = await import(fileUrl);

    if (!command.data || !command.execute) {
      console.warn(`⚠️ Command ${file} is missing data or execute property`);
      return;
    }

    client.commands.set(command.data.name, command);
    console.log(`✅ Loaded command: ${command.data.name}`);
  } catch (error) {
    console.error(`❌ Error loading command ${file}:`, error);
  }
}

async function loadAllCommands() {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    await loadCommand(file);
  }
}
await loadAllCommands();

// 🕵️ Watch command files for changes using chokidar
const watcher = chokidar.watch(commandsPath, {
  persistent: true,
  ignoreInitial: true,
  depth: 0,
});

watcher
  .on('add', async filePath => {
    const file = path.basename(filePath);
    console.log(`➕ Command added: ${file}`);
    await loadCommand(file);
  })
  .on('change', async filePath => {
    const file = path.basename(filePath);
    console.log(`🔁 Command changed: ${file}`);
    await loadCommand(file);
  })
  .on('unlink', filePath => {
    const file = path.basename(filePath);
    console.log(`🗑️ Command removed: ${file}`);
    const commandName = path.parse(file).name;
    client.commands.delete(commandName);
    console.log(`🧹 Removed command: ${commandName}`);
  });

// 🧠 Handle slash commands
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error('❌ Command execution error:', error);
    await interaction.reply({
      content: 'There was an error executing that command.',
      ephemeral: true
    });
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  console.log('➡️ Button clicked:', interaction.customId);

  const match = interaction.customId.match(/^signup_(yes|no|backup)_(\d+)$/);
  if (!match) return;

  const [, type, signupId] = match;
  const userId = interaction.user.id;

  try {
    await interaction.deferUpdate(); // Keeps interaction alive while we process

    // Check embed presence
    if (!interaction.message.embeds.length) {
      console.warn('❌ No embeds found on message');
      return interaction.followUp({ content: '❌ Could not update embed.', ephemeral: true });
    }

    // DB delete old response
    await db.query(
      `DELETE FROM signup_participants WHERE signup_id = $1 AND user_id = $2`,
      [signupId, userId]
    );

    // DB insert new response
    await db.query(
      `INSERT INTO signup_participants (signup_id, user_id, role_preference)
       VALUES ($1, $2, $3)`,
      [signupId, userId, type]
    );

    // Fetch all participants
    const { rows } = await db.query(
      `SELECT user_id, role_preference FROM signup_participants WHERE signup_id = $1`,
      [signupId]
    );

    const yes = rows.filter(r => r.role_preference === 'yes').map(r => `<@${r.user_id}>`);
    const no = rows.filter(r => r.role_preference === 'no').map(r => `<@${r.user_id}>`);
    const backup = rows.filter(r => r.role_preference === 'backup').map(r => `<@${r.user_id}>`);

    const format = arr => arr.length ? arr.join('\n') : '_None_';

    // Safely update embed
    const embed = EmbedBuilder.from(interaction.message.embeds[0]).spliceFields(
      1, 3,
      { name: `Yes (${yes.length})`, value: format(yes), inline: false },
      { name: `No (${no.length})`, value: format(no), inline: false },
      { name: `Backup (${backup.length})`, value: format(backup), inline: false }
    );

    await interaction.editReply({ embeds: [embed] });

  } catch (err) {
    console.error('❌ Handler error:', err);
    return interaction.followUp({ content: '❌ Something broke during interaction.', ephemeral: true });
  }
});



client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

console.log('🔐 Logging in with token length:', token?.length);
client.login(token);

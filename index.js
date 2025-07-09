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
  if (interaction.isButton()) {
    console.log('➡️ Button clicked:', interaction.customId);
  }
});


client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

console.log('🔐 Logging in with token length:', token?.length);
client.login(token);

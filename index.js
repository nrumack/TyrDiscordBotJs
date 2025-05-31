// index.js
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import express from 'express';
import bodyParser from 'body-parser';
import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import interactionCreateHandler from './listeners/interactionCreate.js';
import { fileURLToPath } from 'url';

dotenv.config();

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Discord Bot Setup ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ]
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');

async function loadCommand(file) {
  try {
    const filePath = path.join(commandsPath, file);
    const command = await import(`file://${filePath}`);
    if (!command.default?.data || !command.default?.execute) {
      console.warn(`Command ${file} is missing data or execute`);
      return;
    }
    client.commands.set(command.default.data.name, command.default);
    console.log(`Loaded command: ${command.default.data.name}`);
  } catch (error) {
    console.error(`Error loading command ${file}:`, error);
  }
}

async function loadAllCommands() {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    await loadCommand(file);
  }
}
loadAllCommands();

const watcher = chokidar.watch(commandsPath, {
  persistent: true,
  ignoreInitial: true,
  depth: 0,
});

watcher
  .on('add', filePath => loadCommand(path.basename(filePath)))
  .on('change', filePath => loadCommand(path.basename(filePath)))
  .on('unlink', filePath => {
    const file = path.basename(filePath);
    for (const [name, cmd] of client.commands.entries()) {
      if (file === `${name}.js`) {
        client.commands.delete(name);
        console.log(`Removed command: ${name}`);
        break;
      }
    }
  });

client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});
client.on('interactionCreate', interaction => interactionCreateHandler(interaction, client));
client.login(process.env.DISCORD_TOKEN);

// --- Log Server Setup ---
const app = express();
app.use(bodyParser.json());

app.post('/api/log', async (req, res) => {
  const authHeader = req.headers['x-api-key'];
  if (process.env.UPLOADER_SECRET && authHeader !== process.env.UPLOADER_SECRET) {
    return res.status(403).json({ error: 'Invalid API key' });
  }

  const { logUrl, fileName } = req.body;
  if (!logUrl || !fileName) {
    return res.status(400).json({ error: 'Missing logUrl or fileName' });
  }

  console.log(`📩 Log received: ${fileName} — ${logUrl}`);

  try {
    const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);
    if (channel?.isTextBased()) {
      await channel.send(`📤 New log uploaded: [${fileName}](${logUrl})`);
    }
    res.status(200).json({ status: 'Log posted' });
  } catch (err) {
    console.error('❌ Failed to post log to Discord:', err);
    res.status(500).json({ error: 'Failed to handle log' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Log server running on port ${PORT}`);
});

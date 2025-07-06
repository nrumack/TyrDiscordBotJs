// deploy-commands.js
import { REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Grab credentials
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
const token = process.env.TOKEN;

async function deployCommands() {
  const commands = [];
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const { default: command } = await import(`file://${filePath}`);

    if (command.data && typeof command.data.toJSON === 'function') {
      commands.push(command.data.toJSON());
    } else {
      console.warn(`⚠️ Skipped command ${file}`);
    }
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log('🔁 Deploying slash commands to guild...');
    console.log('📦 Commands to deploy:', commands.map(c => c.name));
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log('✅ Slash commands refreshed.');
    return true;
  } catch (error) {
    console.error('❌ Failed to refresh commands:', error);
    return false;
  }
}

// Run if executed directly
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  deployCommands();
}

export default deployCommands;

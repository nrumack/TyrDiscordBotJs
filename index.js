const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const token = process.env.TOKEN;
const chokidar = require('chokidar');
const path = require('path');

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

function loadCommand(file) {
  try {
    const filePath = path.join(commandsPath, file);
    delete require.cache[require.resolve(filePath)];
    const command = require(filePath);
    if (!command.data || !command.execute) {
      console.warn(`Command ${file} is missing data or execute property`);
      return;
    }
    client.commands.set(command.data.name, command);
    console.log(`Loaded command: ${command.data.name}`);
  } catch (error) {
    console.error(`Error loading command ${file}:`, error);
  }
}

// Load all commands initially
function loadAllCommands() {
  const commandFiles = require('fs').readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    loadCommand(file);
  }
}
loadAllCommands();

// Setup chokidar watcher
const watcher = chokidar.watch(commandsPath, {
  persistent: true,
  ignoreInitial: true,
  depth: 0,
});

watcher
  .on('add', filePath => {
    const file = path.basename(filePath);
    console.log(`Command file added: ${file}`);
    loadCommand(file);
  })
  .on('change', filePath => {
    const file = path.basename(filePath);
    console.log(`Command file changed: ${file}`);
    loadCommand(file);
  })
  .on('unlink', filePath => {
    const file = path.basename(filePath);
    console.log(`Command file removed: ${file}`);
    // Remove from collection by matching command name
    for (const [name, cmd] of client.commands.entries()) {
      const cmdPath = require.resolve(path.join(commandsPath, `${name}.js`));
      if (cmdPath === filePath) {
        client.commands.delete(name);
        console.log(`Removed command: ${name}`);
        break;
      }
    }
  });

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: 'There was an error executing the command.', flags: 64 });
  }
});

client.login(token);
const clientId = '';
// Enter Application ID above ^^

const { REST, Routes } = require('discord.js');
const token = process.env.BOT_TOKEN;

const vote_create_command = require('./commands/vote-create.js');
const vote_manage_command = require('./commands/vote-manage.js');
const vote_settings_command = require('./commands/vote-settings.js');

const commands = [];
commands.push(vote_create_command.data.toJSON())
commands.push(vote_manage_command.data.toJSON())
commands.push(vote_settings_command.data.toJSON())

const rest = new REST().setToken(token);
rest.put(
    Routes.applicationCommands(clientId),
    { body: commands },
).then(data => console.log(data));

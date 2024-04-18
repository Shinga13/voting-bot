const { REST, Routes } = require('discord.js');
const { clientId, guildId } = require('./config.json');
const token = process.env.BOT_TOKEN;

const vote_create_command = require('./commands/vote-create.js');
const vote_manage_command = require('./commands/vote-manage.js');

const commands = [];
commands.push(vote_create_command.data.toJSON())
commands.push(vote_manage_command.data.toJSON())

const rest = new REST().setToken(token);
rest.put(
    Routes.applicationGuildCommands(clientId, guildId),
    { body: commands },
).then(data => console.log(data));

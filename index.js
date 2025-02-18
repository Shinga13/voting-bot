const { Client, Collection, Events, GatewayIntentBits, MessageFlags, Partials } = require('discord.js');
const vote_create_command = require('./commands/vote-create.js');
const vote_manage_command = require('./commands/vote-manage.js');
const vote_settings_command = require('./commands/vote-settings.js');
const vote_archive_command = require('./commands/vote-archive.js');
const { init_backend } = require('./scripts/setup.js');
const { 
    create_guild_setting,
    remove_guild_config,
    purge_guild_scheduler,
    schedule_guild_votes
} = require('./scripts/backend.js');
const { handle_embed_click } = require('./scripts/voting.js');
const { handle_message } = require('./scripts/registration.js');
const bot_token = process.env.BOT_TOKEN;

const [active_votes, settings, schedule] = init_backend();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions
    ]
});

client.commands = new Collection();
client.commands.set(vote_create_command.data.name, vote_create_command);
client.commands.set(vote_manage_command.data.name, vote_manage_command);
client.commands.set(vote_settings_command.data.name, vote_settings_command);
client.commands.set(vote_archive_command.data.name, vote_archive_command);
client.active_votes = active_votes;
client.vote_settings = settings;
client.schedule = schedule;

client.once(Events.ClientReady, async client => {
    for (let guild_id in client.active_votes) {
        schedule_guild_votes(client, guild_id);
    }
    console.log(`Ready! Logged in as ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
	if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: 'There was an error while executing this command!',
                    flags: MessageFlags.Ephemeral
                });
            } else {
                await interaction.reply({
                    content: 'There was an error while executing this command!',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    }
    else if (interaction.isButton() && interaction.customId.startsWith('embed_')) {
        const equal = interaction.customId.indexOf('=');
        const button_type = interaction.customId.slice(0, equal);
        const vote = interaction.customId.slice(equal + 1);
        handle_embed_click(vote, button_type, interaction);
    }
});

client.on(Events.MessageCreate, async message => {
    handle_message(message, client);
});

client.on(Events.GuildCreate, async guild => {
    create_guild_setting(client.vote_settings, guild.id);
    client.schedule[guild.id] = {};
});

client.on(Events.GuildDelete, async guild => {
    remove_guild_config(client, guild.id);
    purge_guild_scheduler(client, guild.id);
});

client.login(bot_token);

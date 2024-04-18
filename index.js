
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const vote_create_command = require('./commands/vote-create.js');
const vote_manage_command = require('./commands/vote-manage.js');
const { init_backend } = require('./scripts/setup.js');
const { create_guild_setting, remove_guild_setting } = require('./scripts/backend.js')
const bot_token = process.env.BOT_TOKEN;

const [active_votes, settings] = init_backend();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();
client.commands.set(vote_create_command.data.name, vote_create_command);
client.commands.set(vote_manage_command.data.name, vote_manage_command);
client.active_votes = active_votes;
client.vote_settings = settings;

client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
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
                await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
            } else {
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        }
    }
});

client.on(Events.GuildCreate, async guild => {
    create_guild_setting(client.vote_settings, guild.id);
});

client.on(Events.GuildDelete, async guild => {
    remove_guild_setting(client.vote_settings, guild.id);
});

client.login(bot_token);
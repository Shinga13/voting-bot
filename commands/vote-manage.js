const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { get_confirmation, delete_vote, pause_vote } = require('../scripts/backend.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('vote-manage')
    .setDescription('manage existing votes')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
    .setDMPermission(false)
    .addSubcommand(subcommand => 
        subcommand.setName('delete')
        .setDescription('delete vote including all stored data')
        .addStringOption(option => 
            option.setName('title')
            .setDescription('title of the vote to delete')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand => 
        subcommand.setName('pause')
        .setDescription('pause / unpause vote')
        .addStringOption(option => 
            option.setName('title')
            .setDescription('title of the vote to pause')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand => 
        subcommand.setName('end')
        .setDescription('end vote (as if end date was reached)')
        .addStringOption(option => 
            option.setName('title')
            .setDescription('title of the vote to end')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand => 
        subcommand.setName('purge')
        .setDescription('purge all active votes')
    )
    .addSubcommand(subcommand => 
        subcommand.setName('edit')
        .setDescription('edit vote')
        .addStringOption(option => 
            option.setName('title')
            .setDescription('title of the vote to edit')
            .setRequired(true)
        )
        .addStringOption(option => (
            option.setName('subject')
            .setDescription('subject of the vote')
            .setRequired(false)
        ))
        .addIntegerOption(option => (
            option.setName('start')
            .setDescription('unix timestamp of when the vote should start')
            .setRequired(false)
        ))
        .addIntegerOption(option => (
            option.setName('end')
            .setDescription('unix timestamp of when the vote should end')
            .setRequired(false)
        ))
    )
    .addSubcommand(subcommand => 
        subcommand.setName('help')
        .setDescription('show command documentation')
    ),
    async execute(interaction) {
        const command = interaction.options.getSubcommand();
        if (command === 'help') {
            
        }
        else if (command === 'purge') {
            if (await get_confirmation(`**Delete all active votes?** *This cannot be undone!*`, interaction)) {
                for (const title of Object.keys(interaction.client.active_votes[interaction.guildId])) {
                    delete_vote(title, interaction);
                }
            } 
        }
        else {
            const param_title = interaction.options.getString('title', true);
            if (param_title in interaction.client.active_votes[interaction.guildId]) {
                if (command === 'delete') {
                    if (await get_confirmation(`Delete vote \`${param_title}\`?`, interaction)) {
                        delete_vote(param_title, interaction);
                    }
                }
                else if (command === 'pause') {
                    pause_vote(param_title, interaction);
                    interaction.reply( { content: 'Command executed.', ephemeral: true} );
                }
                else if (command === 'end') {

                }
                else if (command === 'edit') {

                }
            }
            else {
                interaction.reply({ content: `Vote \`${param_title}\` does not exist.`, ephemeral: true });
            }
        }
    }
}
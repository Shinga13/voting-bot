const { SlashCommandBuilder, PermissionFlagsBits} = require('discord.js');
const {
    get_confirmation,
    delete_vote,
    pause_vote,
    create_vote_embed,
    close_vote,
    schedule_vote_actions
} = require('../scripts/backend.js');
const { store_current_votes } = require('../scripts/storage.js');

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

        // vote-manage help
        if (command === 'help') {
            interaction.reply({
                content: 'Visit the [GitHub Repository](https://github.com/Shinga13/voting-bot) '
                        + 'for command documentation.',
                ephemeral: true
            });
        }

        // vote-manage purge
        else if (command === 'purge') {
            const msg = '**Delete all active votes?** *This cannot be undone!*';
            if (await get_confirmation(msg, interaction)) {
                for (const title of Object.keys(interaction.client.active_votes[interaction.guildId])) {
                    delete_vote(title, interaction);
                }
            } 
        }
        else {
            const param_title = interaction.options.getString('title', true);
            if (param_title in interaction.client.active_votes[interaction.guildId]) {

                // vote-manage delete
                if (command === 'delete') {
                    if (await get_confirmation(`Delete vote \`${param_title}\`?`, interaction)) {
                        delete_vote(param_title, interaction);
                    }
                }

                // vote-manage pause
                else if (command === 'pause') {
                    pause_vote(param_title, interaction);
                    interaction.reply( { content: 'Command executed.', ephemeral: true} );
                }

                // vote-manage end
                else if (command === 'end') {
                    if (await get_confirmation(`End vote \`${param_title}\` early?`, interaction)) {
                        close_vote(
                            interaction.client.active_votes[interaction.guildId][param_title],
                            interaction.client,
                            interaction.guildId
                        );
                    }
                }

                // vote-manage edit
                else if (command === 'edit') {
                    await interaction.reply({
                        content: 'Vote is being edited...',
                        ephemeral: true
                    });
                    const client = interaction.client;
                    const param_subject = interaction.options.getString('subject');
                    const param_start = interaction.options.getInteger('start');
                    const param_end = interaction.options.getInteger('end');
                    const guild_id = interaction.guildId;
                    const current_vote = client.active_votes[guild_id][param_title];
                    let response = '';
                    if (param_subject !== null) {
                        current_vote.subject = param_subject;
                        response = response + 'Edited subject.\n';
                    }
                    if (param_start !== null && param_end !== null) {
                        if (param_end - param_start <= 0) {
                            response = response + 'Start and end time not edited: End time must'
                                    + 'be after start time.\n';
                        }
                        else {
                            current_vote.start_timestamp = param_start;
                            current_vote.end_timestamp = param_end;
                            response = response + 'Edited start and end time.\n';
                        }
                    }
                    else {
                        if (param_start !== null) {
                            if (current_vote.end_timestamp - param_start <= 0) {
                                response = response + 'Start time not edited: Start time must be '
                                        + 'before end time.\n';
                            }
                            else {
                                current_vote.start_timestamp = param_start;
                                response = response + 'Edited start time.\n';
                            }
                        }
                        if (param_end !== null) {
                            if (param_end - current_vote.start_timestamp <= 0) {
                                response = response + 'End time not edited: End time must be after '
                                        + 'start time.\n';
                            }
                            else {
                                current_vote.end_timestamp = param_end;
                                response = response + 'Edited end time.\n';
                            }
                        }
                    }
                    if (response === '') {
                        response = 'No edits performed. Specify optional parameters to edit the '
                                + 'vote.';
                    }
                    const vote_embed = create_vote_embed(current_vote);
                    interaction.guild.channels.fetch(current_vote.channel_id).then( channel => {
                        channel.messages.fetch(current_vote.message_id).then( message => {
                            message.edit({ embeds: [vote_embed] });
                            interaction.editReply({ content: response });
                            client.schedule[guild_id][param_title].start.cancel();
                            client.schedule[guild_id][param_title].end.cancel();
                            delete client.schedule[guild_id][param_title];
                            client.schedule[guild_id][param_title] = {};
                            schedule_vote_actions(current_vote, client, guild_id);
                            store_current_votes(interaction.client.active_votes);
                        });
                    });
                }
            }
            else {
                interaction.reply({
                    content: `Vote \`${param_title}\` does not exist.`,
                    ephemeral: true
                });
            }
        }
    }
}
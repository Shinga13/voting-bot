const { MessageFlags, SlashCommandBuilder, PermissionFlagsBits} = require('discord.js');
const {
    get_confirmation,
    delete_vote,
    pause_vote,
    create_vote_embed,
    close_vote,
    schedule_vote_actions,
    clear_scheduled_actions
} = require('../scripts/backend.js');
const { store_current_votes } = require('../scripts/storage.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('vote-manage')
    .setDescription('manage existing votes')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
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
        .addStringOption(option => (
            option.setName('start')
            .setDescription('ISO 8601 date and time of the vote start. Format: "YYYY-MM-DDThh:mm:ss"')
            .setRequired(false)
        ))
        .addStringOption(option => (
            option.setName('end')
            .setDescription('ISO 8601 date and time of the vote end. Format: "YYYY-MM-DDThh:mm:ss"')
            .setRequired(false)
        ))
    )
    .addSubcommand(subcommand => 
        subcommand.setName('help')
        .setDescription('show command documentation')
    ),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const command = interaction.options.getSubcommand();

        // vote-manage help
        if (command === 'help') {
            interaction.editReply({
                content: 'Visit the [GitHub Repository](https://github.com/Shinga13/voting-bot) '
                        + 'for command documentation.'
            });
        }

        // vote-manage purge
        else if (command === 'purge') {
            const msg = '**Delete all active votes?** *This cannot be undone!*';
            if (await get_confirmation(msg, interaction, true)) {
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
                    if (await get_confirmation(`Delete vote \`${param_title}\`?`, interaction, true)) {
                        delete_vote(param_title, interaction);
                    }
                }

                // vote-manage pause
                else if (command === 'pause') {
                    pause_vote(param_title, interaction);
                    interaction.editReply( { content: 'Command executed.' });
                }

                // vote-manage end
                else if (command === 'end') {
                    if (await get_confirmation(`End vote \`${param_title}\` early?`, interaction, true)) {
                        close_vote(
                            interaction.client.active_votes[interaction.guildId][param_title],
                            interaction.client,
                            interaction.guildId
                        );
                    }
                }

                // vote-manage edit
                else if (command === 'edit') {
                    await interaction.editReply({
                        content: 'Vote is being edited...'});
                    const client = interaction.client;
                    const param_subject = interaction.options.getString('subject');
                    const param_start = interaction.options.getString('start');
                    const param_end = interaction.options.getString('end');
                    const guild_id = interaction.guildId;
                    const current_vote = client.active_votes[guild_id][param_title];
                    let response = '';
                    let perform_edit = false;
                    if (param_subject !== null) {
                        current_vote.subject = param_subject;
                        response = response + 'Edited subject.\n';
                        perform_edit = true;
                    }
                    if (param_start !== null) {
                        start_time = Date.parse(param_start) / 1000;
                        if (isNaN(start_time)) {
                            response = response + 'Start time not edited: Invalid formatting.';
                        }
                        else if (current_vote.end_timestamp - start_time <= 0) {
                            response = response + 'Start time not edited: Start time must be '
                                    + 'before end time.\n';
                        }
                        else {
                            current_vote.start_timestamp = start_time;
                            response = response + 'Edited start time.\n';
                            perform_edit = true;
                        }
                    }
                    if (param_end !== null) {
                        end_time = Date.parse(param_end) / 1000;
                        if (isNaN(end_time)) {
                            response = response + 'End time not edited: Invalid formatting.';
                        }
                        else if (end_time - current_vote.start_timestamp <= 0) {
                            response = response + 'End time not edited: End time must be after '
                                    + 'start time.\n';
                        }
                        else {
                            current_vote.end_timestamp = end_time;
                            response = response + 'Edited end time.\n';
                            perform_edit = true;
                        }
                    }
                    if (perform_edit) {
                        const vote_embed = create_vote_embed(current_vote);
                        interaction.guild.channels.fetch(current_vote.channel_id).then( channel => {
                            channel.messages.fetch(current_vote.message_id).then( message => {
                                message.edit({ embeds: [vote_embed] });
                                interaction.editReply({ content: response });
                                clear_scheduled_actions(current_vote.title, client, guild_id);
                                schedule_vote_actions(current_vote, client, guild_id);
                                store_current_votes(interaction.client.active_votes);
                            });
                        });
                    }
                    else {
                        if (response === '') {
                            response = 'No edits performed. Specify optional parameters to edit '
                                    + 'the vote.';
                        }
                        interaction.editReply({ content: response });
                    }
                }
            }
            else {
                interaction.editReply({
                    content: `Vote \`${param_title}\` does not exist.` });
            }
        }
    }
}
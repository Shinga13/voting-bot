const {
    ActionRowBuilder,
    MessageFlags,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    PermissionFlagsBits
} = require('discord.js');
const { create_archived_embed, join_rationales } = require('../scripts/backend.js');
const { get_archived_votes, get_archived_vote_data } = require('../scripts/storage.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vote-archive')
        .setDescription('access voting archive')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
        .addSubcommand(subcommand =>
            subcommand.setName('view')
            .setDescription('Display archived vote.')
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const command = interaction.options.getSubcommand();
        const guild_id = interaction.guildId;
        const settings = interaction.client.vote_settings[guild_id];
        // vote-archive view
        if (command === 'view') {
            const archived_votes = get_archived_votes(guild_id)
            if (archived_votes.length == 0) {
                interaction.editReply({
                    content: 'The Vote Archive is empty.'
                });
                return;
            }
            let options = [];
            for (let vote_filename of archived_votes) {
                const parts = vote_filename.split('.')
                if (parts.length != 3 || (parts.length == 3 && parts[2] != 'json')) {
                    continue;
                }
                options.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(`${parts[0]} (${new Date(Number(parts[1])).toISOString()})`)
                        .setValue(vote_filename)
                );
            }
            if (options.length == 0) {
                interaction.editReply({
                    content: 'The Vote Archive is empty.'
                });
                return;
            }
            const selector = new StringSelectMenuBuilder()
                .setCustomId('archive-file-selector')
                .setPlaceholder('<SELECT>')
                .addOptions(...options)

            const selector_row = new ActionRowBuilder().addComponents(selector)
            const interaction_response = await interaction.editReply({
                content: '',
                components: [selector_row],
            });
            let selected_vote;
            try {
                selected_vote = await interaction_response.awaitMessageComponent({ time: 60_000 });
            }
            catch {
                interaction.editReply({
                    content: 'No Vote selected.',
                    components: []
                });
                return;
            }
            interaction.editReply({
                content: 'Displaying archived vote...',
                components: []
            });
            const vote = get_archived_vote_data(guild_id, selected_vote.values[0]);
            const vote_embed = create_archived_embed(vote);
            const vote_message = await interaction.channel.send({
                embeds: [vote_embed]
            });
            if (interaction.client.vote_settings[guild_id].display_rationales) {
                interaction.channel.send({
                    content: `VOTE: **${vote.title}**\n__Vote Rationales:__\n\n`
                            + `**Yes:**\n${join_rationales(vote.yes)}\n`
                            + `**No:**\n${join_rationales(vote.no)}\n`
                            + `**Abstain:**\n${join_rationales(vote.abstain)}`,
                    reply: { messageReference: vote_message.id }
                });
            }
        }
    }
}

const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    SlashCommandBuilder,
    PermissionFlagsBits,
} = require('discord.js');
const { store_current_votes } = require('../scripts/storage.js');
const {
    ensure_guild_config,
    create_vote_embed,
    open_vote,
    schedule_vote_actions
} = require('../scripts/backend.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('vote-create')
		.setDescription('creates a new vote')
        .addStringOption(option => (
            option.setName('title')
            .setDescription('title of the vote (must be unique among active votes)')
            .setRequired(true)
        ))
        .addStringOption(option => (
            option.setName('subject')
            .setDescription('subject of the vote')
            .setRequired(true)
        ))
        .addStringOption(option => (
            option.setName('start')
            .setDescription('ISO 8601 date and time of the vote start. Format: "YYYY-MM-DDThh:mm:ss"')
            .setRequired(true)
        ))
        .addStringOption(option => (
            option.setName('end')
            .setDescription('ISO 8601 date and time of the vote end. Format: "YYYY-MM-DDThh:mm:ss"')
            .setRequired(true)
        ))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),

	async execute(interaction) {
        await interaction.reply({
            content: 'New vote is being created...',
            flags: MessageFlags.Ephemeral
        });
        const client = interaction.client;
        ensure_guild_config(client, interaction.guildId);
        const param_title = interaction.options.getString('title', true);
        const param_subject = interaction.options.getString('subject', true);
        let param_start = Date.parse(interaction.options.getString('start', true));
        if (!isNaN(param_start)) {
            param_start = param_start / 1000
        }
        let param_end = Date.parse(interaction.options.getString('end', true));
        if (!isNaN(param_end)) {
            param_end = param_end / 1000
        }
        const current_guild_votes = client.active_votes[interaction.guildId];
        if (param_title in current_guild_votes) {
            interaction.editReply({
                content: 'Vote creation failed! Please choose a different title.'
            });
            return;
        }
        else if (isNaN(param_start)) {
            interaction.editReply({
                content: 'Vote creation failed! Start time is not a valid date and time.'
            });
            return;
        }
        else if (isNaN(param_end)) {
            interaction.editReply({
                content: 'Vote creation failed! End time is not a valid date and time.'
            });
            return;
        }
        else if (param_end - param_start <= 0) {
            interaction.editReply({
                content: 'Vote creation failed! End time must be after start time.'
            });
            return;
        }
        else if (param_end < Date.now() / 1000) {
            interaction.editReply({
                content: 'Vote creation failed! End time must be in the future.'
            });
            return;
        }
        let creator_name;
        if (interaction.member.nickname !== null) {
            creator_name = interaction.member.nickname;
        }
        else {
            creator_name = interaction.user.displayName;
        }
        const current_vote = {
            title: param_title,
            subject: param_subject,
            start_timestamp: param_start,
            end_timestamp: param_end,
            creator_id: interaction.user.username,
            creator_name: creator_name,
            creator_icon: interaction.member.displayAvatarURL(),
            created_timestamp: interaction.createdTimestamp,
            status_override: null,
            channel_id: null,
            message_id: null,
            ballots: {},
            voters: {}
        };
        current_guild_votes[param_title] = current_vote;
        const vote_embed = create_vote_embed(current_vote);

        const vote_button = new ButtonBuilder()
            .setCustomId(`embed_vote_button=${param_title}`)
            .setLabel('Vote')
            .setStyle(ButtonStyle.Primary);
        const show_button = new ButtonBuilder()
            .setCustomId(`embed_show_button=${param_title}`)
            .setLabel('Show Vote')
            .setStyle(ButtonStyle.Secondary);
        const delete_button = new ButtonBuilder()
            .setCustomId(`embed_delete_button=${param_title}`)
            .setLabel('Delete Vote')
            .setStyle(ButtonStyle.Danger);

        const button_row = new ActionRowBuilder().addComponents(
            vote_button,
            show_button,
            delete_button
        );

        interaction.channel.send(
            {
                embeds: [vote_embed],
                components: [button_row]
            }
        ).then(message => {
            current_vote.channel_id = message.channelId;
            current_vote.message_id = message.id;
            store_current_votes(client.active_votes);
            if (Date.now() / 1000 > current_vote.start_timestamp) {
                open_vote(current_vote, client, interaction.guildId)
            }
        });
        client.schedule[interaction.guildId][param_title] = {};
        schedule_vote_actions(current_vote, client, interaction.guildId);
	},
};

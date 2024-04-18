const { ButtonBuilder, SlashCommandBuilder, PermissionFlagsBits, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { store_current_votes } = require('../scripts/storage.js');
const { ensure_guild_config, create_vote_embed } = require('../scripts/backend.js');

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
        .addIntegerOption(option => (
            option.setName('start')
            .setDescription('unix timestamp of when the vote should start')
            .setRequired(true)
        ))
        .addIntegerOption(option => (
            option.setName('end')
            .setDescription('unix timestamp of when the vote should end')
            .setRequired(true)
        ))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
        .setDMPermission(false),

	async execute(interaction) {
        //interaction.guild.channels.fetch('1229780691202605169').then(channel => channel.messages.fetch('1230532604436938884').then(mes => console.log(mes)))
        await interaction.reply({ content: 'New vote is being created...', ephemeral: true });
        const client = interaction.client;
        ensure_guild_config(client, interaction.guildId);
        const param_title = interaction.options.getString('title', true);
        const param_subject = interaction.options.getString('subject', true);
        const param_start = interaction.options.getInteger('start', true);
        const param_end = interaction.options.getInteger('end', true);
        const current_guild_votes = client.active_votes[interaction.guildId];
        if (param_title in current_guild_votes) {
            interaction.editReply({ content: 'Vote creation failed! Please choose a different title.' });
            return;
        }
        else if (param_end - param_start <= 0) {
            interaction.editReply({ content: 'Vote creation failed! End time must be after start time.' });
            return;
        }
        current_guild_votes[param_title] = {
            title: param_title,
            subject: param_subject,
            start_timestamp: param_start,
            end_timestamp: param_end,
            creator_id: interaction.user.username,
            creator_name: interaction.member.nickname,
            creator_icon: interaction.member.displayAvatarURL(),
            created_timestamp: interaction.createdTimestamp,
            status_override: null,
            channel_id: null,
            message_id: null,
            ballots: [],
            voters: []
        }
        const vote_embed = create_vote_embed(current_guild_votes[param_title]);

        const vote_button = new ButtonBuilder()
            .setCustomId('embed_vote_button')
            .setLabel('Vote')
            .setStyle(ButtonStyle.Primary);

        const button_row = new ActionRowBuilder().addComponents(vote_button);

        interaction.channel.send({ embeds: [vote_embed], components: [button_row]}).then(message => {
            current_guild_votes[param_title].channel_id = message.channelId;
            current_guild_votes[param_title].message_id = message.id;
            store_current_votes(client.active_votes);
        });
	},
};

const { ButtonBuilder, EmbedBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { store_settings, store_current_votes } = require('./storage.js');

function create_guild_config(client, guild_id) {
    create_guild_setting(client.vote_settings, guild_id);
    create_guild_vote_storage(client.active_votes, guild_id);    
}

function create_guild_vote_storage(vote_object, guild_id) {
    vote_object[guild_id] = {};
    store_current_votes(vote_object);
}

function create_guild_setting(settings_object, guild_id) {
    settings_object[guild_id] = {
        absolute_reminders: [],
        relative_reminders: [],
        primary_role: null,
        secondary_roles: [],
        registrations: [],
        display_rationales: true,
    };
    store_settings(settings_object);
}

function remove_guild_config(client, guild_id) {
    delete client.vote_settings[guild_id];
    delete client.active_votes[guild_id];
    store_settings(client.vote_settings);
    store_current_votes(client.active_votes);
}

function ensure_guild_config(client, guild_id) {
    if (!(guild_id in client.vote_settings)) {
        create_guild_setting(client.vote_settings, guild_id);
    }
    if (!(guild_id in client.active_votes)) {
        create_guild_vote_storage(client.active_votes, guild_id);
    }
}

function create_vote_embed(vote_object) {
    let vote_status = 'ACTIVE';
    if (vote_object.status_override === 'paused') {
        vote_status = 'PAUSED';
    }
    else if (vote_object.start_timestamp > Date.now() / 1000) {
        vote_status = 'SCHEDULED';
    }
    const embed = new EmbedBuilder()
        .setColor(0xBB00FF)
        .setTitle(vote_object.title)
        .setDescription(vote_object.subject)
        .addFields(
            { name: 'Vote starts on:', value: `<t:${vote_object.start_timestamp}:f>`, inline: true },
            { name: 'Vote ends on:', value: `<t:${vote_object.end_timestamp}:f>`, inline: true },
            { name: 'Vote status:', value: vote_status, inline: true },
            { name: 'Number of votes cast:', value: `**${vote_object.ballots.length}**`, inline: true }
        )
        .setTimestamp(vote_object.created_timestamp)
        .setFooter({ iconURL: vote_object.creator_icon, text: `${vote_object.creator_name} (@${vote_object.creator_id})`});
    return embed;
}

async function get_confirmation(message, interaction) {
    const cancel_button = new ButtonBuilder()
        .setCustomId('get_confirmation_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Primary);
    const confirm_button = new ButtonBuilder()
        .setCustomId('get_confirmation_confirm')
        .setLabel('Confirm')
        .setStyle(ButtonStyle.Danger);
    const button_row = new ActionRowBuilder().addComponents(cancel_button, confirm_button);
    const interaction_response = await interaction.reply({
            content: message,
            ephemeral: true,
            components: [button_row]
        });
    try {
        const confirmation = await interaction_response.awaitMessageComponent({ time: 60_000 });
        if (confirmation.customId === 'get_confirmation_confirm') {
            confirmation.update( { content: `${message} -- Confirmed`, components: [] } );
            return true;
        }
        else {
            confirmation.update( { content: `${message} -- Cancelled`, components: [] } );
            return false;
        }
    }
    catch {
        interaction.editReply({
            content: `${message} -- Cancelled afer 1 minute of inactivity`,
            components: []
        });
        return false;
    }
}

function delete_vote(title, interaction) {
    const vote_to_delete = interaction.client.active_votes[interaction.guildId][title];
    interaction.guild.channels.fetch(vote_to_delete.channel_id).then( channel => {
        channel.messages.fetch(vote_to_delete.message_id).then( message => {
            message.delete();
            // remove scheduled tasks
            delete interaction.client.active_votes[interaction.guildId][title];
            store_current_votes(interaction.client.active_votes);
        });
    });
}

function pause_vote(title, interaction) {
    const vote_to_pause = interaction.client.active_votes[interaction.guildId][title];
    if (vote_to_pause.status_override === 'paused') {
        vote_to_pause.status_override = null;
    }
    else {
        vote_to_pause.status_override = 'paused';
    }
    const new_embed = create_vote_embed(vote_to_pause);
    interaction.guild.channels.fetch(vote_to_pause.channel_id).then( channel => {
        channel.messages.fetch(vote_to_pause.message_id).then( message => {
            message.edit({ embeds: [new_embed] });
            // remove / restart scheduled tasks
            store_current_votes(interaction.client.active_votes);
        });
    });
}

module.exports = {
    create_guild_config: create_guild_config,
    remove_guild_config: remove_guild_config,
    ensure_guild_config: ensure_guild_config,
    create_vote_embed: create_vote_embed,
    get_confirmation: get_confirmation,
    delete_vote: delete_vote,
    pause_vote: pause_vote
}
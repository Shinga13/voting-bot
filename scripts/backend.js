const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const { store_settings, store_current_votes, store_archived_vote } = require('./storage.js');
const schedule = require('node-schedule');

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
        registrations: {},
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
        .setColor(0x00CCBB)
        .setTitle(vote_object.title)
        .setDescription(vote_object.subject)
        .addFields(
            {
                name: 'Vote starts on:',
                value: `<t:${vote_object.start_timestamp}:f>`,
                inline: true
            },
            {
                name: 'Vote ends on:',
                value: `<t:${vote_object.end_timestamp}:f>`,
                inline: true
            },
            {
                name: 'Vote status:',
                value: vote_status,
                inline: true
            },
            {
                name: 'Number of votes cast:',
                value: `**${Object.keys(vote_object.ballots).length}**`,
                inline: true
            }
        )
        .setTimestamp(vote_object.created_timestamp)
        .setFooter({
            iconURL: vote_object.creator_icon,
            text: `${vote_object.creator_name} (@${vote_object.creator_id})`
        });
    return embed;
}

async function get_confirmation(message, interaction, edit=false) {
    const cancel_button = new ButtonBuilder()
        .setCustomId('get_confirmation_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Primary);
    const confirm_button = new ButtonBuilder()
        .setCustomId('get_confirmation_confirm')
        .setLabel('Confirm')
        .setStyle(ButtonStyle.Danger);
    const button_row = new ActionRowBuilder().addComponents(cancel_button, confirm_button);
    let interaction_response;
    if (edit) {
        interaction_response = await interaction.editReply({
            content: message,
            components: [button_row]
        });
    }
    else {
        interaction_response = await interaction.reply({
            content: message,
            flags: MessageFlags.Ephemeral,
            components: [button_row]
        });
    }
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

async function get_identification(identification_list, interaction) {
    let button_col = 0;
    let rows = [];
    let current_row = new ActionRowBuilder();
    rows.push(current_row);
    let current_button;
    if (identification_list.length > 25) {
        identification_list = identification_list.slice(0, 25);
    }
    identification_list.forEach(id => {
        current_button = new ButtonBuilder()
            .setCustomId(id)
            .setLabel(id)
            .setStyle(ButtonStyle.Primary);
        current_row.addComponents(current_button);
        button_col++;
        if (button_col >= 5) {
            current_row = new ActionRowBuilder();
            rows.push(current_row);
            button_col = 0;
        }
    });
    await interaction.editReply({
        content: 'Choose your identification:'
    });
    const interaction_response = await interaction.editReply({components: rows});
    try {
        const confirmation = await interaction_response.awaitMessageComponent({ time: 60_000 });
        confirmation.deferUpdate();
        await interaction.editReply({
            content: `**Identification:** ${confirmation.customId}`,
            components: []
        });
        return confirmation.customId;
    }
    catch {
        interaction.editReply({
            content: 'Choose your identification: -- Cancelled after 1 minute of inactivity',
            components: []
        });
        return null;
    }
}

async function get_entry(title, message, modal_interaction) {
    const modal = new ModalBuilder()
        .setTitle(title)
        .setCustomId('get_entry_modal')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('get_entry_text')
                    .setLabel(message)
                    .setStyle(TextInputStyle.Paragraph)
            )
        );
    modal_interaction.showModal(modal);
    try {
        const modal_result = await modal_interaction.awaitModalSubmit({
            time: 300_000,
            idle: 60_000,
        });
        await modal_result.deferUpdate();
        return modal_result.fields.getTextInputValue('get_entry_text');
    }
    catch {
        return null;
    }
}

function delete_vote(title, interaction) {
    const client = interaction.client;
    const guild_id = interaction.guildId;
    const vote_to_delete = client.active_votes[guild_id][title];
    interaction.guild.channels.fetch(vote_to_delete.channel_id).then( channel => {
        channel.messages.fetch(vote_to_delete.message_id).then( message => {
            message.delete();
            delete client.active_votes[guild_id][title];
            store_current_votes(client.active_votes);
            clear_scheduled_actions(title, client, guild_id, true);
        });
    });
}

function pause_vote(title, interaction) {
    const client = interaction.client;
    const guild_id = interaction.guildId;
    const vote_to_pause = client.active_votes[guild_id][title];
    if (vote_to_pause.status_override === 'paused') {
        vote_to_pause.status_override = null;
        schedule_vote_actions(vote_to_pause, client, guild_id);
    }
    else {
        vote_to_pause.status_override = 'paused';
        clear_scheduled_actions(title, client, guild_id);
    }
    const new_embed = create_vote_embed(vote_to_pause);
    interaction.guild.channels.fetch(vote_to_pause.channel_id).then( channel => {
        channel.messages.fetch(vote_to_pause.message_id).then( message => {
            message.edit({ embeds: [new_embed] });
            store_current_votes(client.active_votes);
        });
    });
}

function update_vote_embed(vote, client, guild_id) {
    const new_embed = create_vote_embed(vote);
    client.guilds.fetch(guild_id).then(
        guild => guild.channels.fetch(vote.channel_id)
    ).then(
        channel => channel.messages.fetch(vote.message_id)
    ).then(
        message => message.edit({ embeds: [new_embed] })
    );
}

function schedule_vote_actions(vote, client, guild_id) {
    const settings = client.vote_settings[guild_id];
    const now = Date.now() / 1000;
    if (now < vote.start_timestamp) {
        const job = schedule.scheduleJob(
            new Date(vote.start_timestamp * 1000),
            () => open_vote(vote, client, guild_id)
        );
        client.schedule[guild_id][vote.title].start = job;
    }
    if (now < vote.end_timestamp) {
        const job = schedule.scheduleJob(
            new Date(vote.end_timestamp * 1000),
            () => close_vote(vote, client, guild_id)
        );
        client.schedule[guild_id][vote.title].end = job;
    }
    const schedule_array = [];
    const user_list = Object.keys(client.vote_settings[guild_id].registrations);
    const role_list = [client.vote_settings[guild_id].primary_role];
    let reminder_message;
    let reminder_timestamp;
    let reminder_job;
    if (settings.absolute_reminders.length > 0) {
        for (let abs_reminder of settings.absolute_reminders) {
            reminder_timestamp = vote.end_timestamp - abs_reminder;
            if (now < reminder_timestamp) {
                reminder_message = (
                    `VOTE: **${vote.title}**\nReminder to cast your vote. Voting ends `
                    + `<t:${vote.end_timestamp}:R>.`
                );
                reminder_job = schedule.scheduleJob(
                    new Date(reminder_timestamp * 1000),
                    () => ping_users(
                        user_list,
                        role_list,
                        reminder_message,
                        client,
                        guild_id,
                        vote.channel_id,
                        vote.message_id
                    )
                );
                schedule_array.push(reminder_job);
            }
        }
    }
    if (settings.relative_reminders.length > 0) {
        const vote_timedelta = vote.end_timestamp - vote.start_timestamp;
        for (let rel_reminder of settings.relative_reminders) {
            reminder_timestamp = vote.start_timestamp + vote_timedelta * rel_reminder;
            if (now < reminder_timestamp) {
                reminder_message = (
                    `VOTE: **${vote.title}**\nReminder to cast your vote. Voting ends `
                    + `<t:${vote.end_timestamp}:R>.`
                );
                reminder_job = schedule.scheduleJob(
                    new Date(reminder_timestamp * 1000),
                    () => ping_users(
                        user_list,
                        role_list,
                        reminder_message,
                        client,
                        guild_id,
                        vote.channel_id,
                        vote.message_id
                    )
                );
                schedule_array.push(reminder_job);
            }
        }
    }
    client.schedule[guild_id][vote.title].reminders = schedule_array;
}

function schedule_guild_votes(client, guild_id) {
    for (let vote_id in client.active_votes[guild_id]) {
        client.schedule[guild_id][client.active_votes[guild_id][vote_id].title] = {};
        schedule_vote_actions(client.active_votes[guild_id][vote_id], client, guild_id);
    }
}

function clear_scheduled_actions(vote_title, client, guild_id, del=false) {
    try {
        client.schedule[guild_id][vote_title].start.cancel();
    }
    catch {}
    try {
        client.schedule[guild_id][vote_title].end.cancel();
    }
    catch {}
    for (let job of client.schedule[guild_id][vote_title].reminders) {
        try {
            job.cancel();
        }
        catch {}
    }
    delete client.schedule[guild_id][vote_title];
    if (!del) {
        client.schedule[guild_id][vote_title] = {};
    }
}

function purge_guild_scheduler(client, guild_id) {
    for (let vote_title in client.schedule[guild_id]) {
        clear_scheduled_actions(vote_title, client, guild_id, true);
    }
    delete client.schedule[guild_id];
}

async function close_vote(vote, client, guild_id) {
    let yes_rationales = [];
    let no_rationales = [];
    let abstain_rationales = [];
    let invalid_votes = 0;
    let valid_identifications;
    let voter_member;
    let current_ballot;
    const guild = await client.guilds.fetch(guild_id);
    for (let voter_id in vote.voters) {
        if (Object.keys(vote.voters[voter_id]).length < 1) {
            continue;
        }
        try {
            voter_member = await guild.members.fetch(voter_id);
        }
        catch {
            continue;
        }
        valid_identifications = get_valid_identifications(voter_id, guild_id, client, voter_member);
        for (let identification in vote.voters[voter_id]) {
            if (valid_identifications.includes(identification)) {
                current_ballot = vote.ballots[vote.voters[voter_id][identification]];
                if (current_ballot.decision === 'Yes') {
                    yes_rationales.push(current_ballot.rationale);
                }
                else if (current_ballot.decision === 'No') {
                    no_rationales.push(current_ballot.rationale);
                }
                else if (current_ballot.decision === 'Abstain') {
                    abstain_rationales.push(current_ballot.rationale);
                }
            }
            else {
                invalid_votes++;
            }
        }
    }
    const archived_vote = {
        title: vote.title,
        subject: vote.subject,
        start_timestamp: vote.start_timestamp,
        end_timestamp: vote.end_timestamp,
        creator_id: vote.creator_id,
        creator_name: vote.creator_name,
        creator_icon: vote.creator_icon,
        created_timestamp: vote.created_timestamp,
        yes: yes_rationales,
        no: no_rationales,
        abstain: abstain_rationales,
        invalid: invalid_votes,
    }
    const new_embed = create_archived_embed(archived_vote);
    const channel = await guild.channels.fetch(vote.channel_id);
    channel.messages.fetch(vote.message_id).then(
        message => message.edit({ embeds: [new_embed], components: [] })
    );
    if (client.vote_settings[guild_id].display_rationales) {
        channel.send({
            content: `VOTE: **${vote.title}**\n__Vote Rationales:__\n\n`
                    + `**Yes:**\n${join_rationales(yes_rationales)}\n`
                    + `**No:**\n${join_rationales(no_rationales)}\n`
                    + `**Abstain:**\n${join_rationales(abstain_rationales)}`,
            reply: { messageReference: vote.message_id }
        });
    }
    store_archived_vote(archived_vote, guild_id);
    delete client.active_votes[guild_id][vote.title];
    store_current_votes(client.active_votes);
    clear_scheduled_actions(vote.title, client, guild_id, true);
}

function join_rationales(rationale_list) {
    let out = '';
    for (let rationale of rationale_list) {
        out = out + `- \`${rationale}\`\n`;
    }
    return out;
}

function get_valid_identifications(user_id, guild_id, client, member) {
    let identifications = [];
    const current_settings = client.vote_settings[guild_id];
    if (user_id in current_settings.registrations) {
        identifications = current_settings.registrations[user_id];
    }
    else if (member.roles.cache.has(current_settings.primary_role)) {
        member.roles.cache.forEach((role, role_id, cache) => {
            if (current_settings.secondary_roles.includes(role_id)) {
                identifications.push(role.name);
            }
        });
    }
    return identifications;
}

function create_archived_embed(archived_vote) {
    return new EmbedBuilder()
        .setColor(0x00CCBB)
        .setTitle(archived_vote.title)
        .setDescription(archived_vote.subject)
        .addFields(
            {
                name: 'Vote started on:',
                value: `<t:${archived_vote.start_timestamp}:f>`,
                inline: true
            },
            {
                name: 'Vote ended on:',
                value: `<t:${archived_vote.end_timestamp}:f>`,
                inline: true
            },
            {
                name: 'Vote status:',
                value: 'ENDED',
                inline: true },
            {
                name: 'Number of "YES" votes:',
                value: `**${archived_vote.yes.length}**`,
                inline: true
            },
            {
                name: 'Number of "NO" votes:',
                value: `**${archived_vote.no.length}**`,
                inline: true
            },
            {
                name: 'Number of "ABSTAIN" votes:',
                value: `**${archived_vote.abstain.length}**`,
                inline: true
            },
            {
                name: 'Invalid votes:',
                value: `**${archived_vote.invalid}**`,
                inline: true
            }
        )
        .setTimestamp(archived_vote.created_timestamp)
        .setFooter({
            iconURL: archived_vote.creator_icon,
            text: `${archived_vote.creator_name} (@${archived_vote.creator_id})`
        });
}

function open_vote(vote, client, guild_id) {
    update_vote_embed(vote, client, guild_id);
    const user_list = Object.keys(client.vote_settings[guild_id].registrations);
    const role_list = [client.vote_settings[guild_id].primary_role];
    const open_message = (
        `VOTE: **${vote.title}**\nVoting has opened! Please cast your vote within the specified `
        + 'timeframe.'
    );
    ping_users(
        user_list,
        role_list,
        open_message,
        client,
        guild_id,
        vote.channel_id,
        vote.message_id
    );
}

function ping_users(user_list, role_list, text, client, guild_id, channel_id, message_id) {
    let message = '';
    if (role_list.length > 0) {
        for (let role of role_list) {
            message = message + `<@&${role}> `;
        }
        message = message + '\n';
    }
    if (user_list.length > 0) {
        for (let user of user_list) {
            message = message + `<@${user}> `;
        }
        message = message + '\n';
    }
    message = message + '\n' + text;
    client.guilds.fetch(guild_id).then(
        guild => guild.channels.fetch(channel_id)
    ).then(
        channel => channel.send({
            content: message,
            reply: { messageReference: message_id }
        })
    );
}

module.exports = {
    create_guild_config: create_guild_config,
    remove_guild_config: remove_guild_config,
    ensure_guild_config: ensure_guild_config,
    create_guild_setting: create_guild_setting,
    create_vote_embed: create_vote_embed,
    get_confirmation: get_confirmation,
    get_identification: get_identification,
    get_entry: get_entry,
    delete_vote: delete_vote,
    pause_vote: pause_vote,
    close_vote: close_vote,
    open_vote: open_vote,
    update_vote_embed: update_vote_embed,
    ping_users: ping_users,
    get_valid_identifications: get_valid_identifications,
    schedule_vote_actions: schedule_vote_actions,
    purge_guild_scheduler: purge_guild_scheduler,
    schedule_guild_votes: schedule_guild_votes,
    clear_scheduled_actions: clear_scheduled_actions
}
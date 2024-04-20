const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const {
    get_identification,
    get_entry,
    update_vote_embed,
    get_confirmation,
    get_valid_identifications
} = require('./backend.js');
const { store_current_votes } = require('./storage.js');

async function handle_embed_click(vote_title, button_type, interaction) {
    const client = interaction.client;
    const guild_id = interaction.guildId;
    if (!(vote_title in client.active_votes[guild_id])) {
        interaction.reply({ content: 'Invalid action. Try again on valid vote.', ephemeral: true });
        return;
    }
    const current_vote = client.active_votes[guild_id][vote_title];
    const user_id = interaction.user.id;
    
    // show vote
    if (button_type === 'embed_show_button') {
        if (user_id in current_vote.voters) {
            let identifications = Object.keys(current_vote.voters[user_id]);
            let selected_id;
            if (identifications.length === 0) {
                interaction.reply({ content: 'You did not vote yet.', ephemeral: true });
                return;
            }
            else if (identifications.length > 1) {
                selected_id = await get_identification(identifications, interaction);
                if (selected_id === null) {
                    return;
                }
            }
            else {
                selected_id = identifications[0];
                await interaction.reply({
                    content: `**Identification:** ${selected_id}`,
                    ephemeral: true
                });
            }
            const ballot = current_vote.ballots[current_vote.voters[user_id][selected_id]];
            interaction.followUp({
                content: '__**Ballot**__\n**Identification:** '
                        + `${selected_id}\n**Decision:** *${ballot.decision}*\n`
                        + `**Rationale:** ${ballot.rationale}`,
                ephemeral: true
            });
        }
        else {
            interaction.reply({ content: 'You did not vote yet.', ephemeral: true });
            return;
        }
    }

    // vote
    else if (button_type === 'embed_vote_button') {
        const now = Date.now() / 1000;
        if (now < current_vote.start_timestamp) {
            interaction.reply({ content: 'Voting has not started yet.', ephemeral: true});
            return;
        }
        else if (current_vote.status_override === 'paused') {
            interaction.reply({ content: 'Voting is paused.', ephemeral: true});
            return;
        }
        const identifications = get_valid_identifications(
            user_id,
            guild_id,
            client,
            interaction.member
        );
        if (identifications.length < 1) {
            interaction.reply({ content: 'You are not authorized to vote!', ephemeral: true});
            return;
        }
        let selected_id;
        if (identifications.length > 1) {
            selected_id = await get_identification(identifications, interaction);
            if (selected_id === null) {
                return;
            }
        }
        else {
            selected_id = identifications[0];
            await interaction.reply({
                content: `**Identification:** ${selected_id}`,
                ephemeral: true
            });
        }

        if (!(user_id in current_vote.voters)) {
            current_vote.voters[user_id] = {};
        }
        let edit_text = '';
        let ballot_id;
        if (selected_id in current_vote.voters[user_id]) {
            edit_text = '*You are editing your previous vote!*\n';
            ballot_id = current_vote.voters[user_id][selected_id];
        }
        else {
            ballot_id = `${user_id}.${Date.now()}`;
        }
        const ballot = {
            id: ballot_id,
            decision: null,
            rationale: null
        };

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('Yes')
                .setLabel('Yes')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('No')
                .setLabel('No')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('Abstain')
                .setLabel('Abstain')
                .setStyle(ButtonStyle.Primary)
        );
        const interaction_response = await interaction.editReply({
            content: `${edit_text}**Identification:** ${selected_id}\n**Please cast your vote:**`,
            components: [buttons]
        });
        let selection;
        try {
            selection = await interaction_response.awaitMessageComponent({ time: 60_000 });
            ballot.decision = selection.customId;
            await interaction.editReply({
                content: `${edit_text}**Identification:** ${selected_id}\n`
                        + `**Decision:** *${ballot.decision}*`,
                components: []
            });
        }
        catch {
            await interaction.editReply({
                content: 'Vote cancelled after 1 minute of inactivity.',
                components: []
            });
            return;
        }

        ballot.rationale = await get_entry(current_vote.title, 'Rationale:', selection);
        if (ballot.rationale === null) {
            interaction.editReply({
                content: 'Vote cancelled.',
                components: []
            });
            return;
        }

        const confirm_buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('Confirm Vote')
                .setLabel('Confirm Vote')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('Cancel')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
        );
        const confirm_response = await interaction.editReply({
            content: `${edit_text}**Identification:** ${selected_id}\n`
                    + `**Decision:** *${ballot.decision}*\n**Rationale:** ${ballot.rationale}`,
            components: [confirm_buttons]
        });
        try {
            const confirm_decision = await confirm_response.awaitMessageComponent({ time: 60_000 });
            if (confirm_decision.customId === 'Confirm Vote') {
                current_vote.voters[user_id][selected_id] = ballot_id;
                current_vote.ballots[ballot_id] = ballot;
                update_vote_embed(current_vote, client, guild_id);
                interaction.editReply({
                    content: `${edit_text}**Identification:** ${selected_id}\n`
                            + `**Decision:** *${ballot.decision}*\n`
                            + `**Rationale:** ${ballot.rationale}\n\n`
                            + '**Vote saved.**',
                    components: []
                });
                store_current_votes(client.active_votes);
                return;
            }
            else {
                interaction.editReply({
                    content: 'Vote cancelled.',
                    components: []
                });
                return;
            }
        }
        catch {
            interaction.editReply({
                content: 'Vote cancelled after 1 minute of inactivity.',
                components: []
            });
            return;
        }
    }

    // delete vote
    else if (button_type === 'embed_delete_button') {
        if (user_id in current_vote.voters) {
            let identifications = Object.keys(current_vote.voters[user_id]);
            let selected_id;
            if (identifications.length === 0) {
                interaction.reply({ content: 'You did not vote yet.', ephemeral: true });
                return;
            }
            else if (identifications.length > 1) {
                selected_id = await get_identification(identifications, interaction);
                if (selected_id === null) {
                    return;
                }
            }
            else {
                selected_id = identifications[0];
                await interaction.reply({
                    content: `**Identification:** ${selected_id}`,
                    ephemeral: true
                });
            }
            const msg = `Are you sure you want to **delete** your vote for \`${selected_id}\`?`;
            if (await get_confirmation(msg, interaction, true)) {
                delete current_vote.ballots[current_vote.voters[user_id][selected_id]];
                delete current_vote.voters[user_id][selected_id];
                update_vote_embed(current_vote, client, guild_id);
                store_current_votes(client.active_votes);
            }
            return;
        }
        else {
            interaction.reply({ content: 'You did not vote yet.', ephemeral: true });
            return;
        }
    }
}

module.exports = {
    handle_embed_click: handle_embed_click
}

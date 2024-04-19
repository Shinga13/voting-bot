const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ButtonInteraction, InteractionType } = require('discord.js');
const { get_identification, get_entry, update_vote_embed, get_confirmation } = require('./backend.js');
const { store_current_votes } = require('./storage.js');

async function handle_embed_click(vote_title, button_type, interaction) {
    if (!(vote_title in interaction.client.active_votes[interaction.guildId])) {
        interaction.reply({ content: 'Invalid action. Try again on valid vote.', ephemeral: true });
        return;
    }
    const client = interaction.client;
    const current_vote = client.active_votes[interaction.guildId][vote_title];
    const current_settings = client.vote_settings[interaction.guildId];
    const user_id = interaction.user.id;
    
    // show vote
    if (button_type === 'embed_show_button') {
        if (user_id in current_vote.voters) {

        }
        else {
            interaction.reply({ content: 'You did not vote yet.', ephemeral: true });
        }
    }

    // vote
    else if (button_type === 'embed_vote_button') {
        let identifications = [];
        if (user_id in current_settings.registrations) {
            identifications = current_settings.registrations[user_id];
        }
        else if (interaction.member.roles.cache.has(current_settings.primary_role)) {
            interaction.member.roles.cache.forEach((role, role_id, cache) => {
                if (current_settings.secondary_roles.includes(role_id)) {
                    identifications.push(role.name);
                }
            });
        }
        else {
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
            await interaction.reply({ content: `**Identification:** ${selected_id}`, ephemeral: true });
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
            new ButtonBuilder().setCustomId('Yes').setLabel('Yes').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('No').setLabel('No').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('Abstain').setLabel('Abstain').setStyle(ButtonStyle.Primary)
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
                content: `${edit_text}**Identification:** ${selected_id}\n**Decision:** *${ballot.decision}*`,
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
            new ButtonBuilder().setCustomId('Confirm Vote').setLabel('Confirm Vote').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('Cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
        );
        const confirm_response = await interaction.editReply({
            content: `${edit_text}**Identification:** ${selected_id}\n**Decision:** *${ballot.decision}*\n**Rationale:** ${ballot.rationale}`,
            components: [confirm_buttons]
        });
        try {
            const confirm_decision = await confirm_response.awaitMessageComponent({ time: 60_000 });
            if (confirm_decision.customId === 'Confirm Vote') {
                current_vote.voters[user_id][selected_id] = ballot_id;
                current_vote.ballots[ballot_id] = ballot;
                update_vote_embed(current_vote, interaction);
                interaction.editReply({
                    content: `${edit_text}**Identification:** ${selected_id}\n**Decision:** *${ballot.decision}*\n**Rationale:** ${ballot.rationale}\n\n**Vote saved.**`,
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
}

module.exports = {
    handle_embed_click: handle_embed_click
}
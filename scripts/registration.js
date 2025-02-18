const {
    ActionRowBuilder,
    AllowedMentionsTypes,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const { store_settings } = require('./storage.js');

async function handle_message(message, client) {
    const settings = client.vote_settings[message.guild.id];
    if (
        settings.registration_channel !== null
        && message.channel.id === settings.registration_channel
        && message.mentions.repliedUser !== null
        && Object.hasOwn(settings.registrars, message.author.id)
    ) {
        const user_to_register = message.mentions.repliedUser.id;
        const identification = settings.registrars[message.author.id]
        if (Object.hasOwn(settings.registrations, user_to_register)) {
            if (
                settings.registrations[user_to_register].includes(identification)
            ) {
                message.delete();
                return;
            }
        }
        const cancel_button = new ButtonBuilder()
            .setCustomId(`register_${user_to_register}_cancel`)
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Primary);
        const confirm_button = new ButtonBuilder()
            .setCustomId(`register_${user_to_register}_confirm`)
            .setLabel('Confirm')
            .setStyle(ButtonStyle.Success);
        const button_row = new ActionRowBuilder().addComponents(cancel_button, confirm_button);
        const user_name_id = `\`@${message.mentions.repliedUser.displayName}\` (ID: \`${user_to_register}\`)`;
        const confirmation_message = await message.channel.send({
            content: `Register ${user_name_id} as voter for \`${identification}\`.`,
            components: [button_row]
        });
        filter = (interaction) => (
                interaction.customId === `register_${user_to_register}_cancel`
                || interaction.customId === `register_${user_to_register}_confirm`
            ) && interaction.user.id === message.author.id;
        try {
            const button_interaction = await message.channel.awaitMessageComponent(
                { filter, time: 60_000 }
            );
            if (button_interaction.customId === `register_${user_to_register}_confirm`) {
                if (Object.hasOwn(settings.registrations, user_to_register)) {
                    settings.registrations[user_to_register].push(identification);
                }
                else {
                    settings.registrations[user_to_register] = [identification];
                }
                store_settings(client.vote_settings);
                confirmation_message.delete();
                (await message.channel.messages.fetch(message.reference.messageId)).delete();
                await message.channel.send({
                    content: `${user_name_id} was registered as voter for \`${identification}\`.`,
                    "allowed_mentions" : { "parse": []}
                });
                message.delete();
                return;
            }
        }
        catch {}
        message.delete();
        confirmation_message.delete();
    }
}

module.exports = {
    handle_message: handle_message
}

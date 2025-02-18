const { MessageFlags, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { get_confirmation } = require('../scripts/backend.js');
const { store_settings } = require('../scripts/storage.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vote-settings')
        .setDescription('manage server-wide settings for votes')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
        .addSubcommand(subcommand =>
            subcommand.setName('set-primary-role')
            .setDescription('all members with the specified role are able to vote')
            .addRoleOption(option =>
                option.setName('role')
                .setDescription('new role')
                .setRequired(true)
            )
            .addBooleanOption(option =>
                option.setName('clear')
                .setDescription('clears the primary role if it matches the specified role')
                .setRequired(false)
            )
        )
        .addSubcommand(subcommand =>
            subcommand.setName('add-secondary-role')
            .setDescription('members are able to vote once per secondary role')
            .addRoleOption(option =>
                option.setName('role')
                .setDescription('role to add')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
            subcommand.setName('remove-secondary-role')
            .setDescription('members are able to vote once per secondary role')
            .addRoleOption(option =>
                option.setName('role')
                .setDescription('role to remove')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
            subcommand.setName('register-voter')
            .setDescription('manually register voter, enabling them to vote')
            .addUserOption(option =>
                option.setName('voter')
                .setDescription('voter to register')
                .setRequired(true)
            )
            .addStringOption(option =>
                option.setName('ids')
                .setDescription('identifications of the voter, seperated by carets (^)')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
            subcommand.setName('un-register-voter')
            .setDescription('remove registered voter')
            .addUserOption(option =>
                option.setName('voter')
                .setDescription('voter to remove')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
            subcommand.setName('show-rationales')
            .setDescription(
                'whether the rationales behind the votes should be posted after the vote ended'
            )
            .addBooleanOption(option =>
                option.setName('enabled')
                .setDescription('enable rationale display')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
            subcommand.setName('individual-reminders')
            .setDescription(
                "remind voters that haven't voted yet via DM"
            )
            .addBooleanOption(option =>
                option.setName('enabled')
                .setDescription('enable individual reminders')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
            subcommand.setName('channel-reminders')
            .setDescription(
                "remind all voters via mention in voing channel"
            )
            .addBooleanOption(option =>
                option.setName('enabled')
                .setDescription('enable channel reminders')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
            subcommand.setName('set-relative-reminders')
            .setDescription('sets reminders relative to the voting period')
            .addStringOption(option =>
                option.setName('reminders')
                .setDescription(
                    'relative reminders, accepts numbers between 0 and 1 seperated by carets (^)'
                )
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
            subcommand.setName('set-absolute-reminders')
            .setDescription('sets reminders absolute to the end of the voting period')
            .addStringOption(option =>
                option.setName('reminders')
                .setDescription(
                    'absolute reminders, seconds before end of voting period seperated by '
                    + 'carets (^)'
                )
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
            subcommand.setName('remove-reminders')
            .setDescription('removes all reminders')
        )
        .addSubcommand(subcommand =>
            subcommand.setName('help')
            .setDescription('show command documentation')
        ),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const command = interaction.options.getSubcommand();
        const settings = interaction.client.vote_settings[interaction.guildId];

        // vote-settings help
        if (command === 'help') {
            interaction.editReply({
                content: 'Visit the [GitHub Repository](https://github.com/Shinga13/voting-bot) '
                        + 'for command documentation.'
            });
        }

        // vote-settings set-primary-role
        else if (command === 'set-primary-role') {
            const param_role = interaction.options.getRole('role', true);
            const param_clear = interaction.options.getBoolean('clear');
            if (param_clear === true) {
                if (settings.primary_role === param_role.id) {
                    if (await get_confirmation(
                        `Remove the primary role \`@${param_role.name}\`? *This will invalidate`
                            + 'all current and future votes of users holding the current primary '
                            + 'role!*',
                        interaction, true)
                    ) {
                        settings.primary_role = null;
                        store_settings(interaction.client.vote_settings);
                    }
                }
                else {
                    interaction.editReply({
                        content: `Role \`@${param_role.name}\` not matching current primary role `
                                + `<@&${settings.primary_role}>.`
                    });
                }
            }
            else if (await get_confirmation(
                    `Set \`@${param_role.name}\` as the primary role? *This will invalidate all`
                        + ' current and future votes of users holding the current primary role!*',
                    interaction, true)
            ) {
                settings.primary_role = param_role.id;
                store_settings(interaction.client.vote_settings);
            }
        }

        // vote-settings add-secondary-role
        else if (command === 'add-secondary-role') {
            const param_role = interaction.options.getRole('role', true);
            if (settings.secondary_roles.includes(param_role.id)) {
                interaction.editReply({
                    content: `Role \`@${param_role.name}\` is already a secondary role.`
                });
            }
            else {
                settings.secondary_roles.push(param_role.id);
                interaction.editReply({
                    content: `Role \`@${param_role.name}\` added to secondary roles.`
                });
                store_settings(interaction.client.vote_settings);
            }
        }

        // vote.settings remove-secondary-roles
        else if (command === 'remove-secondary-role') {
            const param_role = interaction.options.getRole('role', true);
            if (settings.secondary_roles.includes(param_role.id)) {
                if (await get_confirmation(
                    `Remove \`@${param_role.name}\` from secondary roles? *This will invalidate `
                        + 'all current and future votes of users indentifying with this role!*',
                    interaction, true)
                ) {
                    settings.secondary_roles.splice(
                        settings.secondary_roles.indexOf(param_role.id), 1
                    );
                    store_settings(interaction.client.vote_settings);
                }
            }
            else {
                interaction.editReply({
                    content: `Role \`@${param_role.name}\` is not a secondary role.`
                });
            }
        }

        // vote-settings register-voter
        else if (command === 'register-voter') {
            const param_voter = interaction.options.getUser('voter', true);
            let param_ids = interaction.options.getString('ids', true).split('^');
            param_ids = param_ids.map(el => el.trim());
            param_ids = param_ids.filter(el => el.length > 0);
            if (param_ids.length === 0) {
                interaction.editReply({ content: 'Invalid ids specified.' });
            }
            else {
                if (await get_confirmation(
                    `Registering <@${param_voter.id}> as voter with identification(s):\n`
                        + `- ${param_ids.join('\n- ')}\n*If user already registered, overwrite `
                        + 'identification(s)*',
                        interaction,
                        true)
                ) {
                    settings.registrations[param_voter.id] = param_ids;
                    store_settings(interaction.client.vote_settings);
                }
            }
        }

        // vote-settings un-register-voter
        else if (command === 'un-register-voter') {
            const param_voter = interaction.options.getUser('voter', true);
            if (param_voter.id in settings.registrations) {
                if (await get_confirmation(
                    `Un-register <@${param_voter.id}>? *This will invalidate all current and `
                        + 'future votes of this user*',
                        interaction, true)
                ) {
                    delete settings.registrations[param_voter.id];
                    store_settings(interaction.client.vote_settings);
                }
            }
            else {
                interaction.editReply({ content: 'User is not registered.'});
            }
        }

        // vote-settings show-rationales
        else if (command === 'show-rationales') {
            const param_rationales = interaction.options.getBoolean('enabled', true);
            let message;
            if (param_rationales) {
                message = 'Anonymized rationales will be shown in chat when the vote ends.';
            }
            else {
                message = 'Anonymized rationales will not be shown in chat when the vote ends.';
            }
            if (await get_confirmation(message, interaction, true)) {
                settings.display_rationales = param_rationales;
                store_settings(interaction.client.vote_settings);
            }
        }

        // vote-settings individual-reminders
        else if (command === 'individual-reminders') {
            const param_dm_reminders = interaction.options.getBoolean('enabled', true);
            let message;
            if (param_dm_reminders) {
                message = 'Voters that did not vote yet will be reminded via DM.';
            }
            else {
                message = 'Voters that did not vote yet will not be reminded via DM.';
            }
            if (await get_confirmation(message, interaction, true)) {
                settings.dm_reminders = param_dm_reminders;
                store_settings(interaction.client.vote_settings);
            }
        }

        // vote-settings channel-reminders
        else if (command === 'channel-reminders') {
            const param_ping_reminders = interaction.options.getBoolean('enabled', true);
            let message;
            if (param_ping_reminders) {
                message = 'All voters will be reminded via mention in voting channel.';
            }
            else {
                message = 'Voters will not be reminded via mention in voting channel.';
            }
            if (await get_confirmation(message, interaction, true)) {
                settings.ping_reminders = param_ping_reminders;
                store_settings(interaction.client.vote_settings);
            }
        }

        // vote-settings set-relative-reminders
        else if (command == 'set-relative-reminders') {
            let param_reminders = interaction.options.getString('reminders', true).split('^');
            param_reminders = param_reminders.map(el => el.trim());
            param_reminders = param_reminders.filter(el => el.length > 0);
            param_reminders = param_reminders.map(el => {
                try {
                    return parseFloat(el);
                }
                catch {
                    return 0;
                }
            });
            param_reminders = param_reminders.filter(el => (el > 0 && el < 1));
            if (param_reminders.length === 0) {
                interaction.editReply({ content: 'Invalid reminders specified.' });
            }
            else {
                if (await get_confirmation(
                    `Adding the following relative reminders:\n- ${param_reminders.join('\n- ')}\n`
                        + '*Overwrites existing relative reminders.*',
                    interaction, true)
                ) {
                    settings.relative_reminders = param_reminders;
                    store_settings(interaction.client.vote_settings);
                }
            }
        }

        // vote-settings set-absolute-reminders
        else if (command === 'set-absolute-reminders') {
            let param_reminders = interaction.options.getString('reminders', true).split('^');
            param_reminders = param_reminders.map(el => el.trim());
            param_reminders = param_reminders.filter(el => el.length > 0);
            param_reminders = param_reminders.map(el => {
                try {
                    return parseInt(el);
                }
                catch {
                    return 0;
                }
            });
            param_reminders = param_reminders.filter(el => el > 0);
            if (param_reminders.length === 0) {
                interaction.editReply({ content: 'Invalid reminders specified.' });
            }
            else {
                if (await get_confirmation(
                    `Adding the following absolute reminders (in seconds):\n`
                        + `- ${param_reminders.join('\n- ')}\n*Overwrites existing relative `
                        + 'reminders.*',
                    interaction, true)
                ) {
                    settings.absolute_reminders = param_reminders;
                    store_settings(interaction.client.vote_settings);
                }
            }
        }

        // vote-settings remove-reminders
        else if (command === 'remove-reminders') {
            if (await get_confirmation('Clear all reminders?', interaction, true)) {
                settings.absolute_reminders = [];
                settings.relative_reminders = [];
                store_settings(interaction.client.vote_settings);
            }
        }
    }
}
